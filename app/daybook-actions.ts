'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// --- Types ---
export interface DaybookEntry {
    id: string; // Unique ID for keying
    date: Date;
    particulars: string;
    receiptAmount: number;
    paymentAmount: number;
    type: 'Income' | 'Expense' | 'Contra' | 'Opening' | 'Closing';
    isAuto: boolean; // Auto-generated from sales or manual?
    category?: string; // For sorting
    share?: number;    // For sorting
    name?: string;     // For specific sorting
}

export interface DaybookData {
    entries: DaybookEntry[];
    openingBalance: number;
    closingBalance: number;
    totalReceipts: number;
    totalPayments: number;
    isClosed: boolean;
    remarks: string | null;
}

// --- Schemas ---
const expenseSchema = z.object({
    eventId: z.coerce.number(),
    particulars: z.string().min(2),
    amount: z.coerce.number().min(1),
    date: z.string(), // ISO Date
    category: z.string().optional(),
    paymentMethod: z.string().optional()
});

const manualReceiptSchema = z.object({
    eventId: z.coerce.number(),
    particulars: z.string().min(2),
    amount: z.coerce.number().min(1),
    date: z.string(), // ISO Date
    fromAccount: z.string().optional(),
    paymentMethod: z.string().optional()
});

const closeDaySchema = z.object({
    eventId: z.coerce.number(),
    date: z.string(),
    closingBalance: z.coerce.number(),
    totalIncome: z.coerce.number(),
    totalExpense: z.coerce.number(),
    remarks: z.string().optional()
});

// Custom Sort Order
const SORT_ORDER = [
    // Gate Entry handled dynamically
    'Dashing Car',
    'Giant Wheel',
    'Merry Columbus',
    'Frisbee',
    'Air Shoot',
    'Space Jet',
    'Octopus',
    'Torra Torra',
    'Dragon Train',
    'Break Dance',
    'Horse MGR',
    'Jumping Jack',
    'Children Ride',
    'Scary 3D Show',
    'Dhoom Car',
    'Bouncy'
];

// --- Actions ---

export async function getRecentParticulars(eventId: number) {
    const session = await getSession();
    if (!session) return [];

    const transactions = await prisma.transaction.findMany({
        where: {
            eventId,
            NOT: [
                { description: { startsWith: 'Settlement' } },
                { category: 'Ticket Sales' },
                { category: 'Revenue Share' }
            ]
        },
        orderBy: { transactionDate: 'desc' },
        take: 100,
        select: { description: true }
    });

    // Unique descriptions (filter nulls)
    const unique = Array.from(new Set(
        transactions
            .map(t => t.description)
            .filter((d): d is string => d !== null && d.trim() !== '')
    ));
    return unique.slice(0, 50); // Return top 50 recent unique items
}

export async function getDaybook(eventId: number, dateStr: string): Promise<DaybookData> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const date = new Date(dateStr);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // 1. Get Opening Balance
    // Logic: Look for previous "closed" daybook entry.
    // Simplifying: For now, if no previous daybook, assume 0 or maybe verify if 'Carry Forward' logic is needed.
    // A robust system sums all previous transactions, but 'DaybookClosing' model helps snapshoting.

    // Find previous closing
    // We search for the *latest* closing before this date
    const prevClosing = await prisma.daybookClosing.findFirst({
        where: {
            eventId,
            date: { lt: startOfDay }
        },
        orderBy: { date: 'desc' }
    });

    const openingBalance = prevClosing ? prevClosing.closingBalance : 0;

    // 2. Fetch Aggregated Sales (INCOME)
    // Same logic as Ticketing Report
    // 2. Fetch Aggregated Sales (INCOME)
    // Same logic as Ticketing Report
    const ticketSales = await prisma.ticketSaleItem.findMany({
        where: {
            sale: {
                eventId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                source: { not: 'Staff' } // FIX: Exclude Staff sales as they are fetched separately via separate query
            }
        },
        include: {
            ticketType: {
                include: { ownerShares: true }
            }
        }
    });

    const staffSales = await prisma.staffTicketAssignment.findMany({
        where: {
            ticketType: { eventId },
            // Logic: Staff sales are "realized" when they Return/Settle? 
            // Or when assigned? Usually Daybook tracks 'cash in hand'.
            // So logic matches 'Return Date' or 'Settlement Date' if money is handed over.
            // Using 'returnDate' for simplicity as per existing reports.
            returnDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ['Returned', 'Settled'] }
        },
        include: {
            ticketType: {
                include: { ownerShares: true }
            },
            staff: true
        }
    });

    // Process Sales into Entries
    const entries: DaybookEntry[] = [];
    let totalReceipts = 0;
    let totalPayments = 0;

    let totalUpiCollection = 0; // To track Contra

    // 2a. Aggregation Maps
    const salesMap = new Map<string, { name: string, count: number, price: number, share: number, category: string, amount: number }>();
    const upiMap = new Map<string, number>();
    const ownerUpiMap = new Map<string, number>();

    const aggregate = (name: string, price: number, amount: number, share: number, category: string) => {
        // Robust check: category is Entrance OR name implies it
        const isEntrance = category === 'Entrance' || name.toLowerCase().includes('entrance') || name.toLowerCase().includes('gate entry');

        let normalizedName = name;
        if (isEntrance) {
            if (price === 200) normalizedName = `Pass 200`;
            else if (price === 300) normalizedName = `Pass 300`;
            else normalizedName = `Gate Entry ${price}`;
        }

        const key = `${normalizedName}-${price}-${share}`;
        const existing = salesMap.get(key);
        if (existing) {
            existing.amount += amount;
            existing.count += (price > 0 ? amount / price : 0);
        } else {
            const count = price > 0 ? amount / price : 0;
            salesMap.set(key, { name: normalizedName, count, price, share, category, amount: amount });
        }
    };

    const accumulateUPI = (category: string, amount: number) => {
        const key = category || 'General';
        const current = upiMap.get(key) || 0;
        upiMap.set(key, current + amount);
    };

    const accumulateOwnerUPI = (category: string, amount: number) => {
        const key = category || 'General';
        const current = ownerUpiMap.get(key) || 0;
        ownerUpiMap.set(key, current + amount);
    };

    // Helper to calc share
    const getCompanyShare = (item: any) => {
        if (item.ticketType.category !== 'Amusement') return 100;
        const shares = item.ticketType.ownerShares || [];
        if (shares.length > 0) {
            const totalOwnerPct = shares.reduce((sum: number, s: any) => sum + s.sharePercentage, 0);
            return 100 - totalOwnerPct;
        }
        return 100 - (item.ticketType.ownerSharePercentage || 0);
    };

    // Gate Entry & Rides (Counter - Assumed Cash)
    // Counter sales in ticketSales are ASSUMED Cash unless we link to UPI Machine transactions which we don't effortlessly yet.
    // So for now, Counter = Cash.
    ticketSales.forEach(item => {
        const share = getCompanyShare(item);
        aggregate(item.ticketType.name, item.price, item.price, share, item.ticketType.category);
    });

    // Staff Sales (Mixed Cash/UPI)
    staffSales.forEach(assign => {
        const share = getCompanyShare(assign);

        const totalAmt = assign.totalAmount || 0;
        if (totalAmt > 0) {
            // Add TOTAL to Sales Map (Collection)
            aggregate(assign.ticketType.name, assign.ticketType.price, totalAmt, share, assign.ticketType.category);

            // Track UPI portion for Contra
            const upiRaw = assign.upiReceived || 0;

            if (upiRaw > 0) {
                // Use GROSS UPI for Bank Transfer record (matches Bank Statement)
                accumulateUPI(assign.ticketType.category, upiRaw);

                // Calculate Owner Share of this UPI
                const companyShareAmt = upiRaw * (share / 100);
                const ownerShareAmt = upiRaw - companyShareAmt;

                if (ownerShareAmt > 0.01) {
                    accumulateOwnerUPI(assign.ticketType.category, ownerShareAmt);
                }
            }
        }
    });

    // Push Aggregated Sales Entries (Total Collection)
    salesMap.forEach((val, key) => {
        const effectiveAmount = val.amount * (val.share / 100);

        // Format: [Name] - [Price] x [Count] tkt - [Share]%
        const particulars = `${val.name} - ${val.price} x ${val.count.toFixed(1)} tkt - ${val.share}%`;

        entries.push({
            id: `auto-inc-${key}`,
            date: startOfDay,
            particulars: particulars,
            receiptAmount: effectiveAmount,
            paymentAmount: 0,
            type: 'Income',
            isAuto: true,
            category: val.category,
            share: val.share,
            name: val.name
        });
    });

    // Push Owner Share Adjustment for UPI (Income)
    // REMOVED per User Request: Don't show "Owner Share Collected (UPI)" separately.
    // Note: This might technically imbalance the Cash Book if Gross UPI is transferred but only Net Share is recorded as Income,
    // but the user explicitly requested this display preference.
    /*
    ownerUpiMap.forEach((amt, cat) => {
        if (amt > 0) {
            let displayCat = cat;
            if (cat === 'Entrance') displayCat = 'Gate Entry';
            
            entries.push({
                id: `auto-inc-owner-upi-${cat}`,
                date: startOfDay,
                particulars: `Owner Share Collected (UPI - ${displayCat})`,
                receiptAmount: amt,
                paymentAmount: 0,
                type: 'Income',
                isAuto: true,
                category: cat,
                share: 0, 
                name: `Owner Share ${displayCat}`
            });
        }
    });
    */

    // 3. Fetch Expenses & Manual Transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            eventId,
            transactionDate: { gte: startOfDay, lte: endOfDay }
        }
    });

    transactions.forEach(tx => {
        const desc = (tx.description || '').toLowerCase();
        if (
            tx.category === 'Revenue Share' ||
            tx.category === 'Ticket Sales' ||
            desc.includes('settlement')
        ) {
            return;
        }

        // Track UPI for Contra, but SHOW the entry as Income/Expense
        const isUPI = (tx.paymentMethod || '').toLowerCase().includes('upi');
        if (isUPI && tx.type === 'Income') {
            accumulateUPI(tx.category, tx.amount);
        }

        entries.push({
            id: `tx-${tx.id}`,
            date: tx.transactionDate,
            particulars: tx.description || tx.category || 'Expense',
            receiptAmount: tx.type === 'Income' ? tx.amount : 0,
            paymentAmount: tx.type === 'Expense' ? tx.amount : 0,
            type: tx.type as any, // Income or Expense
            isAuto: false,
            category: 'Expense', // Treat all manual tx as Expense for sorting
            share: 0,
            name: tx.category
        });
    });

    // 4. Fetch System PAYMENTS (Rent, Electric, Material, etc.)
    const payments = await prisma.payment.findMany({
        where: {
            OR: [
                { invoice: { eventId } },
                { invoiceId: null, exhibitor: { bookings: { some: { eventId } } } }
                // Fallback: If no invoice/booking link, we rely on date + exhibitor logic or add eventId to Payment model (future improvement)
                // For now, this OR logic covers most linked payments.
            ],
            paymentDate: { gte: startOfDay, lte: endOfDay }
        },
        include: { exhibitor: true }
    });

    const rentPayments: any[] = [];
    const otherPayments: any[] = [];

    payments.forEach(p => {
        const isRent = (p.category === 'Rent' || p.category === 'Shop Rent');
        if (isRent) rentPayments.push(p);
        else otherPayments.push(p);

        // Track UPI for ALL payments (Rent or Other)
        const isUPI = (p.paymentMethod || '').toLowerCase().includes('upi');
        if (isUPI) {
            accumulateUPI(p.category || 'General', p.amount);
        }
    });

    // 4a. Process RENT Payments (Consolidated)
    if (rentPayments.length > 1) {
        // Sort by receipt number to find min/max
        // specific logic for receipt number? It might be string.
        // Try to extract number if possible, or just lex sort.
        const sortedRent = [...rentPayments].sort((a, b) => {
            const numA = parseInt(a.receiptNumber) || 0;
            const numB = parseInt(b.receiptNumber) || 0;
            return numA - numB;
        });

        const minRcp = sortedRent[0].receiptNumber;
        const maxRcp = sortedRent[sortedRent.length - 1].receiptNumber;
        const totalRent = sortedRent.reduce((sum, p) => sum + p.amount, 0);

        entries.push({
            id: `auto-rent-consol-${startOfDay.getTime()}`,
            date: startOfDay,
            particulars: `Rcp from ${minRcp} - Rcp to ${maxRcp} - Various weekly Payments`,
            receiptAmount: totalRent,
            paymentAmount: 0,
            type: 'Income',
            isAuto: true,
            category: 'Rent',
            share: 0,
            name: 'Rent Consolidated'
        });
    } else if (rentPayments.length === 1) {
        // Just add single rent normally
        otherPayments.push(rentPayments[0]);
    }

    // 4b. Process OTHER Payments (Individual)
    otherPayments.forEach(p => {
        const exhibitorName = p.exhibitor?.name || 'Unknown';
        const facia = p.exhibitor?.faciaName ? ` (${p.exhibitor.faciaName})` : '';

        entries.push({
            id: `pay-${p.id}`,
            date: p.paymentDate,
            particulars: `${p.category || 'Payment'} - ${exhibitorName}${facia} (RCP: ${p.receiptNumber})`,
            receiptAmount: p.amount, // Payments are Income for the Event
            paymentAmount: 0,
            type: 'Income',
            isAuto: true,
            category: p.category || 'General',
            share: 0,
            name: exhibitorName + facia
        });
    });

    // 5. Push CONTRA Expenses Only (No duplicate UPI Income)
    upiMap.forEach((amt, cat) => {
        if (amt > 0) {
            // Apply sorting helpers
            // Category might be "Amusement", "Entrance", "Rent", etc.
            // Name for sorting = "UPI - " + Category? Or just Category?
            // Existing Sort Order: Gate Entry, List, Others.
            // Maybe map Category to meaningful Name

            // Normalized Category Name for Entrance
            let displayCat = cat;
            if (cat === 'Entrance') displayCat = 'Gate Entry';
            if (cat === 'Amusement') displayCat = 'Amusement';
            // etc.

            // CONTRA ENTRY: Transfer UPI Collection to Company Bank Account
            // Since Daybook is primarily a Cash Book, money going to Bank is an "Expense" (Outflow) from Cash hand 
            // OR simply a record that it didn't stay in Cash.
            // User requested: "post UPI Collections in expence"
            entries.push({
                id: `auto-upi-contra-${cat}`,
                date: startOfDay,
                particulars: `To Company Bank A/C (UPI - ${displayCat})`,
                receiptAmount: 0,
                paymentAmount: amt,
                type: 'Expense',
                isAuto: true,
                category: 'Expense',
                share: 0,
                name: 'Expense' // Sort with expenses
            });
        }
    });

    // 5. Contra Entry (Simulated for now if we can't detect UPI accurately)
    // If we had accurate UPI tracking, we'd add "By UPI Collection" here.
    // Since ticketSale doesn't log Payment Method (yet), we assume ALL sales are effectively Cash 
    // UNLESS we use the "UPI Machine" logic from previous tasks.
    // For this pass, we will omit auto-contra unless user explicitly asks or we find the table.
    // User image shows "Phonepe amount of Gate Entry...".
    // We can add a Manual Transaction for this, or automate later.

    // Calculate Totals
    entries.forEach(e => {
        totalReceipts += e.receiptAmount;
        totalPayments += e.paymentAmount;
    });

    const closingBalance = openingBalance + totalReceipts - totalPayments;

    // Check status
    const currentClosing = await prisma.daybookClosing.findUnique({
        where: { eventId_date: { eventId, date: startOfDay } }
    });

    // SORTING LOGIC
    // SORTING LOGIC
    entries.sort((a, b) => {
        // Expenses always bottom
        const isExpenseA = a.type === 'Expense';
        const isExpenseB = b.type === 'Expense';
        if (isExpenseA !== isExpenseB) return isExpenseA ? 1 : -1;

        // Named Sort Order
        const nameA = a.name || '';
        const nameB = b.name || '';

        // Check for Gate Entry / Pass specially (Top Priority)
        const isTopA = nameA.startsWith('Gate Entry') || nameA.startsWith('Pass');
        const isTopB = nameB.startsWith('Gate Entry') || nameB.startsWith('Pass');

        if (isTopA !== isTopB) return isTopA ? -1 : 1;

        if (isTopA && isTopB) {
            // Sort by Price (Extract digits)
            const getPrice = (s: string) => parseInt(s.replace(/[^0-9]/g, '')) || 0;
            return getPrice(nameA) - getPrice(nameB);
        }

        // 1. Share Descending (Requested: 100% -> 70% -> 50% -> 0%)
        const shareA = a.share || 0;
        const shareB = b.share || 0;
        if (shareA !== shareB) return shareB - shareA;

        // 2. Check for exact matches in the list (Tie Breaker 1)
        const indexA = SORT_ORDER.findIndex(s => nameA === s);
        const indexB = SORT_ORDER.findIndex(s => nameB === s);

        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        if (indexA !== -1) return -1; // A is in list, B is not -> A first
        if (indexB !== -1) return 1;  // B is in list, A is not -> B first

        // 3. Alphabetical (Tie Breaker 2)
        return nameA.localeCompare(nameB);
    });

    return {
        entries,
        openingBalance,
        closingBalance,
        totalReceipts,
        totalPayments,
        isClosed: currentClosing?.status === 'Closed',
        remarks: currentClosing?.remarks || null
    };
}

export async function addTransaction(data: z.infer<typeof expenseSchema> | z.infer<typeof manualReceiptSchema>, type: 'Income' | 'Expense') {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // @ts-ignore
    const { eventId, particulars, amount, date, category, fromAccount, paymentMethod } = data;

    await prisma.transaction.create({
        data: {
            eventId,
            type,
            amount,
            category: category || (fromAccount ? `From ${fromAccount}` : 'General'),
            description: particulars,
            transactionDate: new Date(date),
            paymentMethod: paymentMethod || 'Cash', // Default to Cash
            recordedBy: session.name
        }
    });

    revalidatePath('/dashboard/accounts/daybook');
    return { success: true };
}

export async function deleteTransaction(id: number) {
    await prisma.transaction.delete({ where: { id } });
    revalidatePath('/dashboard/accounts/daybook');
    return { success: true };
}

export async function updateTransaction(id: number, data: z.infer<typeof expenseSchema> | z.infer<typeof manualReceiptSchema>) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // @ts-ignore
    const { eventId, particulars, amount, date, category, fromAccount, paymentMethod } = data;

    await prisma.transaction.update({
        where: { id },
        data: {
            amount,
            category: category || (fromAccount ? `From ${fromAccount}` : 'General'),
            description: particulars,
            transactionDate: new Date(date),
            paymentMethod: paymentMethod || 'Cash',
            recordedBy: session.name
        }
    });

    revalidatePath('/dashboard/accounts/daybook');
    return { success: true };
}

export async function closeDaybook(data: z.infer<typeof closeDaySchema>) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const date = new Date(data.date);

    await prisma.daybookClosing.upsert({
        where: { eventId_date: { eventId: data.eventId, date } },
        update: {
            closingBalance: data.closingBalance,
            totalIncome: data.totalIncome,
            totalExpense: data.totalExpense,
            status: 'Closed',
            remarks: data.remarks
        },
        create: {
            eventId: data.eventId,
            date,
            openingBalance: 0, // Should be passed or calculated, but upsert limits us. Ideally accurate.
            closingBalance: data.closingBalance,
            totalIncome: data.totalIncome,
            totalExpense: data.totalExpense,
            status: 'Closed',
            remarks: data.remarks
        }
    });

    revalidatePath('/dashboard/accounts/daybook');
    return { success: true };
}
