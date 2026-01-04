'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// PhonePe CSV Header Handling (Flexible)
// We assume headers might be: "Transaction Date", "Transaction ID", "Amount", "Status", "Payer Name", "Instrument", "Terminal ID"

export async function uploadPhonePeCSV(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, error: 'No file uploaded' };
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
        return { success: false, error: 'Empty or invalid CSV' };
    }

    // Parse Headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    // Map headers to indices
    // Support PhonePe Headers: "Transaction Reference Id", "Transaction Date", "Total Transaction Amount", "Transaction State", "Terminal Id"
    const idxTxnId = headers.findIndex(h =>
        h.includes('transaction reference id') ||
        h.includes('phonepe reference id') ||
        h.includes('transaction id') ||
        h.includes('txn id')
    );
    const idxDate = headers.findIndex(h =>
        h.includes('transaction date') ||
        h.includes('payment date') ||
        h.includes('date') ||
        h.includes('completed at')
    );
    const idxAmount = headers.findIndex(h =>
        h.includes('total transaction amount') ||
        h.includes('amount') ||
        h.includes('credit')
    );
    const idxStatus = headers.findIndex(h =>
        h.includes('transaction state') ||
        h.includes('payment state') ||
        h.includes('status')
    );
    const idxTerminal = headers.findIndex(h =>
        h.includes('terminal id') ||
        h.includes('store id') ||
        h.includes('terminal') ||
        h.includes('store')
    );
    const idxPayer = headers.findIndex(h =>
        h.includes('payer') ||
        h.includes('customer') ||
        h.includes('sender name')
    );

    if (idxTxnId === -1 || idxAmount === -1 || idxDate === -1) {
        return { success: false, error: `Missing required columns (Txn Id, Amount, Date). Found: ${headers.join(', ')}` };
    }

    let processedCount = 0;
    let errorCount = 0;

    // Cache Machines
    // @ts-ignore
    const machines = await prisma.uPIMachine.findMany();
    const machineMap = new Map<string, number>(); // TerminalID -> ID
    machines.forEach((m: any) => {
        if (m.terminalId) machineMap.set(m.terminalId.trim(), m.id);
    });

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV split (doesn't handle commas in quotes extremely well but sufficient for PhonePe usually)
        const cols = line.split(',').map(c => c.replace(/"/g, '').trim());

        // Check Status
        // PhonePe uses "COMPLETED" or "SUCCESS"
        const status = idxStatus !== -1 ? cols[idxStatus] : 'SUCCESS';
        const s = status.toUpperCase();
        if (s !== 'SUCCESS' && s !== 'PAYMENT_SUCCESS' && s !== 'COMPLETED') {
            continue; // Skip failed/pending
        }

        const txnId = cols[idxTxnId];
        const amountStr = cols[idxAmount];
        const dateStr = cols[idxDate];
        const terminalId = idxTerminal !== -1 ? cols[idxTerminal] : '';
        const payerName = idxPayer !== -1 ? cols[idxPayer] : '';

        // Find Machine
        let machineId = machineMap.get(terminalId);

        if (!machineId) {
            // Try to map default machine if only 1 exists?
            if (machines.length === 1) machineId = machines[0].id;
            else {
                // Could not map machine, maybe log this?
                errorCount++;
                continue;
            }
        }

        try {
            // Remove commas from amount
            const amount = parseFloat(amountStr.replace(/,/g, ''));

            // Handle various date formats if necessary
            const date = new Date(dateStr);

            if (isNaN(amount)) continue;

            // @ts-ignore
            await prisma.uPITransaction.upsert({
                where: { transactionId: txnId },
                create: {
                    transactionId: txnId,
                    amount,
                    date,
                    status: 'SUCCESS',
                    payerName,
                    upiMachineId: machineId,
                    metadata: JSON.stringify({ rawLine: line })
                },
                update: {
                    status: 'SUCCESS'
                }
            });
            processedCount++;
        } catch (e) {
            console.error(`Row ${i} Error:`, e);
            errorCount++;
        }
    }

    revalidatePath('/dashboard/accounts/reconciliation');
    return { success: true, processedCount, errorCount };
}

export async function getReconciliationReport(dateStart?: string, dateEnd?: string) {
    const session = await getSession();
    if (!session || !['Admin', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    // Defaults
    const start = dateStart ? new Date(dateStart) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = dateEnd ? new Date(dateEnd) : new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Get System Collections (Staff Assignments)
    const systemCollections = await prisma.staffTicketAssignment.findMany({
        where: {
            // Filter by return date (settlement date)
            returnDate: {
                gte: start,
                lte: end
            },
            status: 'Returned'
        },
        include: {
            ticketType: {
                include: {
                    // @ts-ignore
                    upiMachine: true
                }
            }
        }
    });

    // 2. Get Bank Transactions
    // @ts-ignore
    const bankTransactions = await prisma.uPITransaction.findMany({
        where: {
            date: {
                gte: start,
                lte: end
            }
        },
        include: {
            // @ts-ignore
            upiMachine: true
        }
    });

    // 3. Aggregate
    const reportMap = new Map<number, {
        machineId: number;
        machineName: string;
        systemAmount: number;
        bankAmount: number;
    }>();

    // Init with all machines
    // @ts-ignore
    const machines = await prisma.uPIMachine.findMany();
    machines.forEach((m: any) => {
        reportMap.set(m.id, {
            machineId: m.id,
            machineName: m.name,
            systemAmount: 0,
            bankAmount: 0
        });
    });

    // Sum System
    systemCollections.forEach((assign: any) => {
        const machineId = assign.assignedUpiMachineId || assign.ticketType.upiMachineId;
        if (machineId && reportMap.has(machineId)) {
            const entry = reportMap.get(machineId)!;
            entry.systemAmount += (assign.upiReceived || 0);
        }
    });

    // Sum Bank
    bankTransactions.forEach((txn: any) => {
        if (reportMap.has(txn.upiMachineId)) {
            const entry = reportMap.get(txn.upiMachineId)!;
            entry.bankAmount += txn.amount;
        }
    });

    const report = Array.from(reportMap.values());

    return { success: true, data: report };
}
