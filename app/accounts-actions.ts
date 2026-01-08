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
    if (!session || !session.activeEventId) return { transactions: [], summary: { income: 0, expense: 0, balance: 0, cashIncome: 0, cashExpense: 0, upiIncome: 0, upiExpense: 0, cashBalance: 0, companyBalance: 0, upiAmusement: 0, upiEntrance: 0, upiOffice: 0 } };

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

        // Accurate Recalculation from Source Arrays
        let cashIncome = 0;
        let upiIncome = 0;
        let cashExpense = 0;
        let upiExpense = 0;

        // 1. Manual
        manualTransactions.forEach((t: any) => {
            if (t.type === 'Income') {
                if (t.paymentMethod === 'Cash') cashIncome += t.amount;
                else upiIncome += t.amount;
            } else {
                // Expense
                if (t.paymentMethod === 'Cash') cashExpense += t.amount;
                else upiExpense += t.amount;
            }
        });

        // 2. Payments (Always Income)
        payments.forEach((p: any) => {
            if (p.paymentMethod === 'Cash') cashIncome += p.amount;
            else upiIncome += p.amount;
        });

        // 3. Counter Sales (Always Cash Income)
        counterSales.forEach((s: any) => {
            cashIncome += s.totalAmount;
        });

        // 4. Settlements (Explicit Fields - Income)
        settlements.forEach((s: any) => {
            cashIncome += (s.cashReceived || 0);
            upiIncome += (s.upiReceived || 0);
        });

        // 5. UPI Breakdown Calculation
        let upiAmusement = 0;
        let upiEntrance = 0;
        let upiOffice = 0;

        // From Settlements (Staff Ticket Sales)
        settlements.forEach((s: any) => {
            const upiVal = s.upiReceived || 0;
            if (upiVal > 0) {
                const cat = (s.ticketType.category || '').toLowerCase();
                if (cat === 'amusement') upiAmusement += upiVal;
                else if (cat === 'entrance') upiEntrance += upiVal;
                else if (cat === 'office') upiOffice += upiVal;
            }
        });

        // From Manual Transactions (Income + UPI/Online + Category Match)
        manualTransactions.forEach((t: any) => {
            if (t.type === 'Income') {
                const method = (t.paymentMethod || '').toLowerCase();
                const isUpi = method.includes('upi') || method.includes('online') || method.includes('gpay') || method.includes('phonepe');

                if (isUpi) {
                    const cat = (t.category || '').toLowerCase();
                    if (cat.includes('amusement')) upiAmusement += t.amount;
                    else if (cat.includes('entrance') || cat.includes('ticket')) upiEntrance += t.amount; // Assuming 'Ticket' often implies Gate/Entrance if not specified
                    else if (cat.includes('office') || cat.includes('general')) upiOffice += t.amount;
                }
            }
        });

        // --- Event Total Aggregation (All Time) ---
        // 1. Manual Transactions
        // @ts-ignore
        const eventManual = await prisma.transaction.findMany({
            where: { eventId },
            select: { type: true, amount: true, paymentMethod: true }
        });

        let evManualCashInc = 0, evManualUpiInc = 0, evManualCashExp = 0, evManualUpiExp = 0;
        eventManual.forEach((t: any) => {
            if (t.type === 'Income') {
                if (t.paymentMethod === 'Cash') evManualCashInc += t.amount;
                else evManualUpiInc += t.amount;
            } else {
                if (t.paymentMethod === 'Cash') evManualCashExp += t.amount;
                else evManualUpiExp += t.amount;
            }
        });

        // 2. Payments (Income)
        const eventPayments = await prisma.payment.findMany({
            where: {
                OR: [
                    { invoice: { eventId } },
                    { invoiceId: null, exhibitor: { bookings: { some: { eventId } } } }
                ]
            },
            select: { amount: true, paymentMethod: true }
        });
        let evPayCash = 0, evPayUpi = 0;
        eventPayments.forEach((p: any) => {
            if (p.paymentMethod === 'Cash') evPayCash += p.amount;
            else evPayUpi += p.amount;
        });

        // 3. Counter Sales (Cash Income)
        const eventCounter = await prisma.ticketSale.aggregate({
            _sum: { totalAmount: true },
            where: {
                eventId,
                // @ts-ignore
                source: 'Counter'
            }
        });
        const evCounterCash = eventCounter._sum.totalAmount || 0;

        // 4. Staff Returns (Cash & UPI Income)
        const eventSettlements = await prisma.staffTicketAssignment.aggregate({
            _sum: { cashReceived: true, upiReceived: true },
            where: {
                staff: { eventId },
                status: 'Returned'
            }
        });
        const evSettleCash = eventSettlements._sum.cashReceived || 0;
        const evSettleUpi = eventSettlements._sum.upiReceived || 0;

        // Summation
        const evTotalIncome = (evManualCashInc + evManualUpiInc) + (evPayCash + evPayUpi) + evCounterCash + (evSettleCash + evSettleUpi);
        const evTotalExpense = (evManualCashExp + evManualUpiExp);
        const evCashInHand = (evManualCashInc + evPayCash + evCounterCash + evSettleCash) - evManualCashExp; // Cash Income - Cash Expense
        const evCompanyBal = (evManualUpiInc + evPayUpi + evSettleUpi) - evManualUpiExp; // UPI Income - UPI Expense

        const eventSummary = {
            income: evTotalIncome,
            expense: evTotalExpense,
            balance: evTotalIncome - evTotalExpense,
            cashBalance: evCashInHand,
            companyBalance: evCompanyBal
        };

        return {
            transactions: merged.slice(0, 20),
            dailySummary: { // Renamed from summary
                income: summary.income,
                expense: summary.expense,
                balance: summary.income - summary.expense,
                cashIncome,
                cashExpense,
                upiIncome,
                upiExpense,
                cashBalance: cashIncome - cashExpense,
                companyBalance: upiIncome - upiExpense,
                upiAmusement,
                upiEntrance,
                upiOffice
            },
            eventSummary
        };

    } catch (error) {
        console.error("Error fetching daily transactions:", error);
        return { transactions: [], summary: { income: 0, expense: 0, balance: 0, cashIncome: 0, cashExpense: 0, upiIncome: 0, upiExpense: 0, cashBalance: 0, companyBalance: 0, upiAmusement: 0, upiEntrance: 0, upiOffice: 0 } };
    }
}

export async function getRecentTransactions(limit: number = 10) {
    const session = await getSession();
    if (!session || !session.activeEventId) return [];

    const eventId = session.activeEventId;

    try {
        // Fetch last 'limit' items from each source to ensure we get the true global latest
        // 1. Manual
        // @ts-ignore
        const manualPromise = prisma.transaction.findMany({
            where: { eventId },
            orderBy: { transactionDate: 'desc' },
            take: limit
        });

        // 2. Payments
        const paymentsPromise = prisma.payment.findMany({
            where: {
                OR: [
                    { invoice: { eventId } },
                    {
                        invoiceId: null,
                        exhibitor: { bookings: { some: { eventId } } }
                    }
                ]
            },
            orderBy: { paymentDate: 'desc' },
            take: limit,
            include: { exhibitor: true }
        });

        // 3. Settlements
        const settlementsPromise = prisma.staffTicketAssignment.findMany({
            where: {
                staff: { eventId },
                status: 'Returned'
            },
            orderBy: { returnDate: 'desc' },
            take: limit,
            include: { staff: true }
        });

        // 4. Counter Sales
        const salesPromise = prisma.ticketSale.findMany({
            where: {
                eventId,
                // @ts-ignore
                source: 'Counter'
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        const [manual, payments, settlements, sales] = await Promise.all([
            // @ts-ignore
            manualPromise,
            paymentsPromise,
            settlementsPromise,
            salesPromise
        ]);

        const merged = [];

        // Map Manual
        merged.push(...manual.map((t: any) => ({
            id: t.id,
            type: t.type,
            category: t.category,
            amount: t.amount,
            paymentMethod: t.paymentMethod,
            description: t.description,
            transactionDate: t.transactionDate,
            recordedBy: t.recordedBy,
            source: 'Manual'
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

        // Map Settlements
        merged.push(...settlements.map((s: any) => ({
            id: -100000 - s.id,
            type: 'Income',
            category: 'Ticket Sales',
            amount: (s.cashReceived || 0) + (s.upiReceived || 0),
            paymentMethod: 'Cash/UPI',
            description: `Reconciliation: ${s.staff.name} (${s.seriesLabel})`,
            transactionDate: s.returnDate!,
            recordedBy: 'System',
            source: 'System'
        })));

        // Map Sales
        merged.push(...sales.map((s: any) => ({
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

        // Sort and Limit
        return merged
            .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
            .slice(0, limit);

    } catch (error) {
        console.error("Error fetching recent transactions:", error);
        return [];
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

export async function getAmusementLedger(ownerId: string) {
    const session = await getSession();
    if (!session) return { ledger: [], summary: { totalCredit: 0, totalDebit: 0, balance: 0 } };

    try {
        // Query the dedicated Ledger table
        // @ts-ignore
        const entries = await prisma.amusementLedger.findMany({
            where: { amusementOwnerId: Number(ownerId) },
            orderBy: { date: 'desc' },
            include: { ticketType: true }
        });

        const ledger = entries.map((entry: any) => ({
            id: entry.id,
            date: entry.date,
            description: entry.details || `Ticket Share: ${entry.ticketType?.name}`,
            credit: entry.ownerShareAmount, // Amount owed TO owner
            debit: entry.collectedByOwner,  // Amount collected/paid
            type: entry.ownerShareAmount > 0 ? 'Credit' : 'Debit'
        }));

        const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.ownerShareAmount || 0), 0);
        const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.collectedByOwner || 0), 0);

        return {
            ledger,
            summary: {
                totalCredit,
                totalDebit,
                balance: totalCredit - totalDebit
            }
        };

    } catch (error) {
        console.error("Error fetching amusement ledger:", error);
        return { ledger: [], summary: { totalCredit: 0, totalDebit: 0, balance: 0 } };
    }
}

export async function getEventLedger(activeEventId?: string | number | null) {
    const session = await getSession();
    if (!session) return { transactions: [], summary: { income: 0, expense: 0, balance: 0, cashBalance: 0, companyBalance: 0 } };

    const eventId = Number(activeEventId || session.activeEventId);
    if (!eventId || isNaN(eventId)) return { transactions: [], summary: { income: 0, expense: 0, balance: 0, cashBalance: 0, companyBalance: 0 } };

    try {
        // Reuse getRecentTransactions login but with higher limit or all
        // For efficiency, let's limit to recent 100 for now, or implement pagination in UI later.
        const recent = await getRecentTransactions(100);

        // Fetch Event Totals (reuse logic from getDailyTransactions or extract it)
        // Since getDailyTransactions calculates it, we can call it with today's date but ignore daily part?
        // No, better to extract the logic to a helper or just re-run the aggregate queries here.

        // --- Event Total Aggregation (All Time) ---
        // 1. Manual Transactions
        // @ts-ignore
        const eventManual = await prisma.transaction.findMany({
            where: { eventId },
            select: { type: true, amount: true, paymentMethod: true }
        });

        let evManualCashInc = 0, evManualUpiInc = 0, evManualCashExp = 0, evManualUpiExp = 0;
        eventManual.forEach((t: any) => {
            if (t.type === 'Income') {
                if (t.paymentMethod === 'Cash') evManualCashInc += t.amount;
                else evManualUpiInc += t.amount;
            } else {
                if (t.paymentMethod === 'Cash') evManualCashExp += t.amount;
                else evManualUpiExp += t.amount;
            }
        });

        // 2. Payments (Income)
        const eventPayments = await prisma.payment.findMany({
            where: {
                OR: [
                    { invoice: { eventId } },
                    { invoiceId: null, exhibitor: { bookings: { some: { eventId } } } }
                ]
            },
            select: { amount: true, paymentMethod: true }
        });
        let evPayCash = 0, evPayUpi = 0;
        eventPayments.forEach((p: any) => {
            if (p.paymentMethod === 'Cash') evPayCash += p.amount;
            else evPayUpi += p.amount;
        });

        // 3. Counter Sales (Cash Income)
        const eventCounter = await prisma.ticketSale.aggregate({
            _sum: { totalAmount: true },
            where: { eventId, source: 'Counter' } as any
        });
        const evCounterCash = eventCounter._sum.totalAmount || 0;

        // 4. Staff Returns (Cash & UPI Income)
        const eventSettlements = await prisma.staffTicketAssignment.aggregate({
            _sum: { cashReceived: true, upiReceived: true },
            where: { staff: { eventId }, status: 'Returned' }
        });
        const evSettleCash = (eventSettlements._sum && eventSettlements._sum.cashReceived) || 0;
        const evSettleUpi = (eventSettlements._sum && eventSettlements._sum.upiReceived) || 0;

        // Summation
        const evTotalIncome = (evManualCashInc + evManualUpiInc) + (evPayCash + evPayUpi) + evCounterCash + (evSettleCash + evSettleUpi);
        const evTotalExpense = (evManualCashExp + evManualUpiExp);
        const evCashInHand = (evManualCashInc + evPayCash + evCounterCash + evSettleCash) - evManualCashExp;
        const evCompanyBal = (evManualUpiInc + evPayUpi + evSettleUpi) - evManualUpiExp;

        return {
            transactions: recent, // Using recent for the list view
            summary: {
                income: evTotalIncome,
                expense: evTotalExpense,
                balance: evTotalIncome - evTotalExpense,
                cashBalance: evCashInHand,
                companyBalance: evCompanyBal
            }
        };

    } catch (e) {
        console.error("Error fetching event ledger", e);
        return { transactions: [], summary: { income: 0, expense: 0, balance: 0, cashBalance: 0, companyBalance: 0 } };
    }
}
