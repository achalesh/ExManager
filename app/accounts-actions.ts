'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// --- Schema ---
const transactionSchema = z.object({
    type: z.enum(['Income', 'Expense']),
    category: z.string().min(1, 'Category is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    description: z.string().optional(),
    transactionDate: z.string().optional(), // ISO string from date input
});

// --- Actions ---

export async function addTransaction(formData: FormData) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const rawData = {
            type: formData.get('type'),
            category: formData.get('category'),
            amount: formData.get('amount'),
            paymentMethod: formData.get('paymentMethod'),
            description: formData.get('description'),
            transactionDate: formData.get('transactionDate'),
        };

        const parsed = transactionSchema.parse(rawData);
        const { type, category, amount, paymentMethod, description, transactionDate } = parsed;

        // Ensure we have an active event
        const eventId = session.activeEventId;
        if (!eventId) return { success: false, error: 'No active event found' };

        // @ts-ignore
        await prisma.transaction.create({
            data: {
                eventId,
                type,
                category,
                amount,
                paymentMethod,
                description: description || null,
                transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                recordedBy: session.name,
            }
        });

        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (e: any) {
        console.error("Error adding transaction:", e);
        return { success: false, error: e.message || 'Failed to add transaction' };
    }
}

export async function getDailyTransactions(dateString?: string) {
    const session = await getSession();
    if (!session || !session.activeEventId) return { transactions: [], summary: { income: 0, expense: 0, balance: 0 } };

    const targetDate = dateString ? new Date(dateString) : new Date();
    // Start and End of the day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const eventId = session.activeEventId;

    try {
        // 1. Fetch Manual Transactions
        // ... (existing helper definitions)

        // @ts-ignore
        const manualTransactionsPromise = prisma.transaction.findMany({
            where: {
                eventId,
                transactionDate: { gte: startOfDay, lte: endOfDay }
            }
        });

        // 2. Fetch System Payments
        const paymentsPromise = prisma.payment.findMany({
            where: {
                OR: [
                    { invoice: { eventId } },
                    {
                        invoiceId: null,
                        exhibitor: { bookings: { some: { eventId } } }
                    }
                ],
                paymentDate: { gte: startOfDay, lte: endOfDay }
            },
            include: { exhibitor: true }
        });

        // 3. Fetch Ticket Reconciliation (Staff Returns)
        // User wants amount recorded immediately upon reconciliation (Return), not just settlement.
        const settlementsPromise = prisma.staffTicketAssignment.findMany({
            where: {
                staff: { eventId },
                status: 'Returned', // Changed from isSettled: true
                returnDate: { gte: startOfDay, lte: endOfDay } // Changed from settlementDate
            },
            include: { staff: true, ticketType: true }
        });

        // 4. Fetch Counter Ticket Sales
        const counterSalesPromise = prisma.ticketSale.findMany({
            where: {
                eventId,
                // @ts-ignore - source field added
                source: 'Counter',
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        });

        const [manualTransactions, payments, settlements, counterSales] = await Promise.all([
            // @ts-ignore
            manualTransactionsPromise,
            paymentsPromise,
            settlementsPromise,
            counterSalesPromise
        ]);

        // --- Merge & Map ---
        const merged = [];

        // Map Manual
        merged.push(...manualTransactions.map((t: any) => ({
            id: t.id,
            type: t.type,
            category: t.category,
            amount: t.amount,
            paymentMethod: t.paymentMethod,
            description: t.description,
            transactionDate: t.transactionDate,
            recordedBy: t.recordedBy,
            source: 'Manual' // Flag to identify source
        })));

        // Map Payments
        merged.push(...payments.map((p: any) => ({
            id: -1 * p.id,
            type: 'Income',
            category: p.category || 'Exhibitor Payment',
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            description: `Received from ${p.exhibitor.name} (RCP: ${p.receiptNumber})`,
            transactionDate: p.paymentDate,
            recordedBy: p.collectedBy || 'System',
            source: 'System'
        })));

        // Map Counter Ticket Sales
        merged.push(...counterSales.map((s: any) => ({
            id: -200000 - s.id,
            type: 'Income',
            category: 'Ticket Counter',
            amount: s.totalAmount,
            paymentMethod: 'Cash',
            description: `Counter Sale #${s.id}`,
            transactionDate: s.createdAt,
            recordedBy: 'Box Office',
            source: 'System'
        })));

        // Map Settlements (Reconciliations)
        merged.push(...settlements.map((s: any) => ({
            id: -100000 - s.id,
            type: 'Income',
            category: 'Ticket Sales',
            amount: (s.cashReceived || 0) + (s.upiReceived || 0),
            paymentMethod: 'Cash/UPI',
            description: `Reconciliation: ${s.staff.name} (${s.seriesLabel}) ${s.isSettled ? '(Settled)' : ''}`,
            transactionDate: s.returnDate!, // Use returnDate
            recordedBy: 'System',
            source: 'System'
        })));

        // Sort by Date Descending
        merged.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

        // Compute Summary
        const summary = merged.reduce((acc: { income: number; expense: number; cash: number; upi: number }, curr) => {
            if (curr.type === 'Income') {
                acc.income += curr.amount;

                // Heuristic for Payment Method
                const method = (curr.paymentMethod || '').toLowerCase();
                if (method.includes('cash')) {
                    acc.cash += curr.amount;
                } else if (method.includes('upi') || method.includes('online') || method.includes('gpay') || method.includes('phonepe')) {
                    acc.upi += curr.amount;
                } else {
                    // Default fallback or separate bucket? For now assuming if not UPI/Online it's likely Cash or Bank Transfer
                    // Actually, let's look at the specific logic for settlements which has explicit fields
                    if (curr.category === 'Ticket Sales' && curr.description.includes('Reconciliation')) {
                        // For settlements, we merged cash+upi into amount. 
                        // We need to re-parse or better yet, aggregate separate values if possible.
                        // BUT, the merged array has sum.
                        // Let's rely on the heuristic matching the description or just re-summing from source arrays might be cleaner but loop overhead.
                        // Wait, for Settlements we returned "Cash/UPI" as string. logic above fails.

                        // FIX: We can't rely on the flattened 'merged' array for accurate Cash/UPI split if we combined them into one entry with "Cash/UPI" string.
                        // We need to pre-calculate from source arrays or split the merged entry.
                    }
                }
            } else {
                acc.expense += curr.amount;
            }
            return acc;
        }, { income: 0, expense: 0, cash: 0, upi: 0 });

        // Accurate Recalculation from Source Arrays for precision
        let totalCash = 0;
        let totalUpi = 0;

        // 1. Manual
        manualTransactions.forEach((t: any) => {
            if (t.type === 'Income') {
                if (t.paymentMethod === 'Cash') totalCash += t.amount;
                else totalUpi += t.amount; // Simplification, assumption
            }
        });

        // 2. Payments
        payments.forEach((p: any) => {
            if (p.paymentMethod === 'Cash') totalCash += p.amount;
            else totalUpi += p.amount;
        });

        // 3. Counter Sales (Always Cash)
        counterSales.forEach((s: any) => {
            totalCash += s.totalAmount;
        });

        // 4. Settlements (Explicit Fields)
        settlements.forEach((s: any) => {
            totalCash += (s.cashReceived || 0);
            totalUpi += (s.upiReceived || 0);
        });

        return {
            transactions: merged.slice(0, 20),
            summary: {
                income: summary.income,
                expense: summary.expense,
                balance: summary.income - summary.expense,
                cash: totalCash,
                upi: totalUpi
            }
        };

    } catch (error) {
        console.error("Error fetching daily transactions:", error);
        return { transactions: [], summary: { income: 0, expense: 0, balance: 0 } };
    }
}

export async function deleteTransaction(id: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        if (id > 0) {
            // Manual Transaction
            // @ts-ignore
            await prisma.transaction.delete({
                where: { id }
            });
        } else if (id > -100000) {
            // System Payment (id is negative of payment id)
            // original payment id = -1 * id
            const paymentId = -1 * id;
            await prisma.payment.delete({
                where: { id: paymentId }
            });
        } else {
            return { success: false, error: 'Cannot delete this type of system transaction.' };
        }

        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: 'Failed to delete transaction' };
    }
}
