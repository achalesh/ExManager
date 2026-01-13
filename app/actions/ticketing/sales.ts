'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession, requireRole, verifyRole } from '@/lib/auth';

import { ticketSaleSchema } from './schemas';

// --- Schema Definitions ---
// Moved to schemas.ts

// --- Ticket Sales ---

export async function createTicketSale(data: z.infer<typeof ticketSaleSchema>) {
    const session = await getSession();
    if (!session) { // Staff can also sell
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = ticketSaleSchema.parse(data);

        // Use a transaction to ensure stock integrity
        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const saleItemsData = [];

            for (const item of parsed.items) {
                // Get ticket type details
                const ticketType = await tx.ticketType.findUnique({
                    where: { id: item.ticketTypeId },
                    include: { ownerShares: true, amusementOwner: true }
                });
                if (!ticketType) throw new Error(`Invalid ticket type: ${item.ticketTypeId}`);

                // Get active batch
                const batch = await tx.ticketBatch.findFirst({
                    where: { ticketTypeId: item.ticketTypeId, isActive: true }
                });

                if (!batch) throw new Error(`No active batch for ticket: ${ticketType.name}`);

                // Check stock
                if (batch.currentNumber + item.quantity - 1 > batch.endNumber) {
                    throw new Error(`Insufficient stock for ${ticketType.name}. Available: ${batch.endNumber - batch.currentNumber + 1}`);
                }

                // Calculate item total
                const itemTotal = ticketType.price * item.quantity;
                totalAmount += itemTotal;

                // Create Ledger Entries (Revenue Share)
                const ownerShares = ticketType.ownerShares || [];
                if (ownerShares.length > 0) {
                    for (const share of ownerShares) {
                        const shareAmount = (itemTotal * share.sharePercentage) / 100;
                        await tx.amusementLedger.create({
                            data: {
                                date: new Date(),
                                amusementOwnerId: share.amusementOwnerId,
                                ticketTypeId: ticketType.id,
                                details: `Counter Sale: ${ticketType.name} - ${item.quantity} tkts`,
                                soldCount: item.quantity,
                                totalSales: itemTotal,
                                ownerSharePercentage: share.sharePercentage,
                                ownerShareAmount: shareAmount,
                                companyShareAmount: itemTotal - shareAmount,
                                collectedByOwner: 0,
                                status: 'Pending'
                            }
                        });
                    }
                } else if (ticketType.amusementOwnerId) {
                    const shareAmount = (itemTotal * ticketType.ownerSharePercentage) / 100;
                    await tx.amusementLedger.create({
                        data: {
                            date: new Date(),
                            amusementOwnerId: ticketType.amusementOwnerId,
                            ticketTypeId: ticketType.id,
                            details: `Counter Sale: ${ticketType.name} - ${item.quantity} tkts`,
                            soldCount: item.quantity,
                            totalSales: itemTotal,
                            ownerSharePercentage: ticketType.ownerSharePercentage,
                            ownerShareAmount: shareAmount,
                            companyShareAmount: itemTotal - shareAmount,
                            collectedByOwner: 0,
                            status: 'Pending'
                        }
                    });
                }

                // Create individual tickets (serial numbers)
                for (let i = 0; i < item.quantity; i++) {
                    saleItemsData.push({
                        ticketTypeId: ticketType.id,
                        ticketNumber: batch.currentNumber + i,
                        price: ticketType.price
                    });
                }

                // Update batch current number
                await tx.ticketBatch.update({
                    where: { id: batch.id },
                    data: { currentNumber: batch.currentNumber + item.quantity }
                });
            }

            // Create Sale Record
            const sale = await tx.ticketSale.create({
                data: {
                    eventId: parsed.eventId,
                    totalAmount,
                    // @ts-ignore
                    source: 'Counter',
                    items: {
                        create: saleItemsData
                    }
                },
                include: { items: true }
            });

            return sale;
        });

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/reports/ticketing');
        return { success: true, saleId: result.id };
    } catch (error: any) {
        console.error('Error creating ticket sale:', error);
        return { success: false, error: error.message || 'Failed to create ticket sale' };
    }
}

export async function deleteTicketSale(saleId: number) {
    const session = await getSession();
    try {
        requireRole(session, ['Admin', 'Manager']);
        const result = await prisma.$transaction(async (tx) => {
            const sale = await tx.ticketSale.findUnique({
                where: { id: saleId },
                include: { items: true }
            });

            if (!sale) throw new Error('Sale not found');

            let restoreCount = 0;

            // Group items by Ticket Type to verify ranges
            const itemsByType = new Map<number, typeof sale.items>();
            for (const item of sale.items) {
                const list = itemsByType.get(item.ticketTypeId) || [];
                list.push(item);
                itemsByType.set(item.ticketTypeId, list);
            }

            for (const [typeId, items] of itemsByType.entries()) {
                // Find active batch for this type
                const batch = await tx.ticketBatch.findFirst({
                    where: { ticketTypeId: typeId, isActive: true }
                });

                if (batch) {
                    // Check if these items are the LATEST sold (contiguous with currentNumber)
                    const maxTicketNum = Math.max(...items.map(i => i.ticketNumber));
                    const minTicketNum = Math.min(...items.map(i => i.ticketNumber));
                    const count = items.length;

                    // Condition: range matches (currentNumber - count) to (currentNumber - 1)
                    // Basically, if maxTicketNum == batch.currentNumber - 1, we can restore.
                    // Assumes no gaps were created by other parallel deletions (rare in this single-batch logic)

                    if (maxTicketNum === batch.currentNumber - 1) {
                        // We can restore stock!
                        await tx.ticketBatch.update({
                            where: { id: batch.id },
                            data: { currentNumber: minTicketNum }
                        });
                        restoreCount += count;
                    }
                }
            }

            // Create Audit Log
            await tx.auditLog.create({
                data: {
                    eventId: sale.eventId,
                    userId: session.userId,
                    action: 'DELETE_SALE',
                    details: `Deleted Sale #${saleId}. Amount: ${sale.totalAmount}. Restored Tickets: ${restoreCount}.`
                }
            });

            // Delete Records
            await tx.ticketSaleItem.deleteMany({ where: { saleId: saleId } });
            await tx.ticketSale.delete({ where: { id: saleId } });

            return { restored: restoreCount > 0 };
        });

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/reports/ticketing');
        return { success: true, message: result.restored ? 'Sale deleted and stock restored.' : 'Sale deleted. Stock NOT restored (not latest transaction).' };
    } catch (error: any) {
        console.error('DELETE SALE ERROR:', error);
        return { success: false, error: 'Delete failed: ' + (error.message || 'Unknown error') };
    }
}

export async function getTicketingReport(eventId: number) {
    const session = await getSession();
    if (!verifyRole(session, ['Admin', 'Manager', 'Office'])) {
        return null;
    }

    // 1. Fetch Manual Sales
    const manualSales = await prisma.ticketSale.findMany({
        where: { eventId },
        include: { items: { include: { ticketType: true } } },
        orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch Staff Sales
    const staffSales = await prisma.staffTicketAssignment.findMany({
        where: {
            status: { in: ['Returned', 'Settled'] },
            ticketType: { eventId: eventId }
        },
        include: { ticketType: true, staff: true },
        orderBy: { returnDate: 'desc' }
    });

    // 3. Aggregate Data
    let totalRevenue = 0;
    let totalTickets = 0;
    const byCategory: Record<string, { count: number, revenue: number }> = {};
    const byType: Record<string, { count: number, revenue: number, category: string }> = {};
    const recentTransactions: any[] = [];

    // NEW: Detailed Stats
    const staffPerformance: Record<string, { name: string, sold: number, revenue: number, cash: number, upi: number }> = {};
    const hourlyStats: Record<number, { count: number, revenue: number }> = {};
    const paymentStats = { cash: 0, upi: 0 };

    // Initialize Hourly Stats (0-23)
    for (let i = 0; i < 24; i++) hourlyStats[i] = { count: 0, revenue: 0 };

    // Process Manual Sales
    for (const sale of manualSales) {
        totalRevenue += sale.totalAmount;

        // Payment Splits (Manual is implicit Cash unless we add UPI tracking to Sales later, but currently Sales are mostly cash or untracked method in simple view)
        // Actually, Sale table doesn't have payment method column properly populated in all create paths? 
        // Let's check `Transaction` table for truth, but for this Report we aggregate Sales.
        // Assuming Manual Sales are Cash for now unless correlated with UPI transaction? 
        // For simplicity in this report version, we'll treat them as generic revenue, but add to Cash for approximation if method missing.
        // *Correction*: We should probably respect the source. 
        paymentStats.cash += sale.totalAmount; // Defaulting manual to cash

        const hour = sale.createdAt.getHours();
        hourlyStats[hour].count += sale.items.length; // Approximate items count
        hourlyStats[hour].revenue += sale.totalAmount;

        let saleCount = 0;

        for (const item of sale.items) {
            const typeName = item.ticketType.name;
            const catName = item.ticketType.category;
            saleCount++;
            totalTickets++;

            // By Category
            if (!byCategory[catName]) byCategory[catName] = { count: 0, revenue: 0 };
            byCategory[catName].count += 1;
            byCategory[catName].revenue += item.price;

            // By Type
            if (!byType[typeName]) byType[typeName] = { count: 0, revenue: 0, category: catName };
            byType[typeName].count += 1;
            byType[typeName].revenue += item.price;
        }

        recentTransactions.push({
            id: sale.id,
            date: sale.createdAt,
            count: saleCount,
            amount: sale.totalAmount,
            type: 'Counter'
        });
    }

    // Process Staff Sales
    for (const assign of staffSales) {
        if (!assign.soldCount || !assign.totalAmount) continue;

        totalRevenue += assign.totalAmount;
        totalTickets += assign.soldCount;

        // Payment Stats
        paymentStats.cash += (assign.cashReceived || 0);
        paymentStats.upi += (assign.upiReceived || 0);

        // Staff Performance
        if (!staffPerformance[assign.staffId]) {
            staffPerformance[assign.staffId] = {
                name: assign.staff.name,
                sold: 0,
                revenue: 0,
                cash: 0,
                upi: 0
            };
        }
        staffPerformance[assign.staffId].sold += assign.soldCount;
        staffPerformance[assign.staffId].revenue += assign.totalAmount;
        staffPerformance[assign.staffId].cash += (assign.cashReceived || 0);
        staffPerformance[assign.staffId].upi += (assign.upiReceived || 0);

        // Hourly Stats (Using Return Date as proxy for "When it was accounted")
        // Note: Staff sales happen over time, but are recorded on Return. 
        // We will attribute it to the return hour for "Operations Pulse", or maybe ignore for hourly?
        // Let's attribute to Return Hour for now to show "Processing Load".
        if (assign.returnDate) {
            const hour = assign.returnDate.getHours();
            hourlyStats[hour].count += assign.soldCount;
            hourlyStats[hour].revenue += assign.totalAmount;
        }

        const typeName = assign.ticketType.name;
        const catName = assign.ticketType.category;

        // By Category
        if (!byCategory[catName]) byCategory[catName] = { count: 0, revenue: 0 };
        byCategory[catName].count += assign.soldCount;
        byCategory[catName].revenue += assign.totalAmount;

        // By Type
        if (!byType[typeName]) byType[typeName] = { count: 0, revenue: 0, category: catName };
        byType[typeName].count += assign.soldCount;
        byType[typeName].revenue += assign.totalAmount;

        recentTransactions.push({
            id: `staff-${assign.id}`,
            date: assign.returnDate || assign.settlementDate || assign.updatedAt,
            count: assign.soldCount,
            amount: assign.totalAmount,
            type: 'Staff'
        });
    }

    // Sort recent transactions combined
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        totalRevenue,
        totalTickets,
        byCategory,
        byType,
        staffPerformance: Object.values(staffPerformance).sort((a, b) => b.revenue - a.revenue),
        hourlyStats,
        paymentStats,
        recentTransactions: recentTransactions.slice(0, 50)
    };
}

export async function getDetailedSalesReport(eventId: number, dateFilter?: string, page: number = 1) {
    const session = await getSession();
    if (!verifyRole(session, ['Admin', 'Manager', 'Office', 'Accountant'])) {
        return null;
    }

    const pageSize = 15;

    // Date Filtering Logic
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;

    if (dateFilter) {
        const d = new Date(dateFilter);
        dateStart = new Date(d.setHours(0, 0, 0, 0));
        dateEnd = new Date(d.setHours(23, 59, 59, 999));
    }

    // Prisma Filters
    const saleWhere: any = {
        eventId,
        source: { not: 'Staff' }
    };
    const staffWhere: any = {
        status: { in: ['Returned', 'Settled'] },
        ticketType: { eventId: eventId }
    };

    if (dateStart && dateEnd) {
        saleWhere.createdAt = { gte: dateStart, lte: dateEnd };
        staffWhere.returnDate = { gte: dateStart, lte: dateEnd };
    }

    // 1. Fetch Counter Sales
    const manualSales = await prisma.ticketSale.findMany({
        where: saleWhere,
        include: { items: { include: { ticketType: true } } },
        orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch Staff Returns
    const staffSales = await prisma.staffTicketAssignment.findMany({
        where: staffWhere,
        include: { ticketType: true, staff: true },
        orderBy: { returnDate: 'desc' }
    });

    // 3. Normalize Data & Calculate Aggregates
    const rows: any[] = [];
    const summary = {
        totalRevenue: 0,
        totalTickets: 0,
        totalCash: 0,
        totalUpi: 0, // Add explicit totals
        entrance: { count: 0, revenue: 0 },
        amusement: { count: 0, revenue: 0 },
        byItem: {} as Record<string, { count: number; revenue: number; cash: number; upi: number }>
    };

    // Map Counter Sales
    for (const sale of manualSales) {
        summary.totalRevenue += sale.totalAmount;
        summary.totalTickets += sale.items.length;
        summary.totalCash += sale.totalAmount; // Counter is Cash

        const types: string[] = [];
        const ranges: string[] = [];
        const byType = new Map<string, number[]>();

        sale.items.forEach(item => {
            if (item.ticketType.category === 'Entrance') {
                summary.entrance.count++;
                summary.entrance.revenue += item.price;
            } else if (item.ticketType.category === 'Amusement') {
                summary.amusement.count++;
                summary.amusement.revenue += item.price;
            }

            if (!summary.byItem[item.ticketType.name]) {
                summary.byItem[item.ticketType.name] = { count: 0, revenue: 0, cash: 0, upi: 0 };
            }
            summary.byItem[item.ticketType.name].count++;
            summary.byItem[item.ticketType.name].revenue += item.price;
            summary.byItem[item.ticketType.name].cash += item.price; // Counter is Cash

            const arr = byType.get(item.ticketType.name) || [];
            arr.push(item.ticketNumber);
            byType.set(item.ticketType.name, arr);
        });

        byType.forEach((nums, typeName) => {
            types.push(typeName);
            nums.sort((a, b) => a - b);
            const min = nums[0];
            const max = nums[nums.length - 1];
            if (min === max) ranges.push(`(#${min})`);
            else ranges.push(`(#${min}-${max})`);
        });

        rows.push({
            id: `CNT-${sale.id}`,
            date: sale.createdAt,
            source: 'Counter',
            ticketType: types.join(', '),
            details: ranges.join(', '),
            count: sale.items.length,
            amount: sale.totalAmount, // Keep for sorting/ref
            cash: sale.totalAmount,
            upi: 0
        });
    }

    // Map Staff Sales
    for (const assign of staffSales) {
        if (!assign.soldCount || !assign.totalAmount) continue;

        summary.totalRevenue += assign.totalAmount;
        summary.totalTickets += assign.soldCount;
        summary.totalCash += (assign.cashReceived || 0);
        summary.totalUpi += (assign.upiReceived || 0);

        if (assign.ticketType.category === 'Entrance') {
            summary.entrance.count += assign.soldCount;
            summary.entrance.revenue += assign.totalAmount;
        } else if (assign.ticketType.category === 'Amusement') {
            summary.amusement.count += assign.soldCount;
            summary.amusement.revenue += assign.totalAmount;
        }

        if (!summary.byItem[assign.ticketType.name]) {
            summary.byItem[assign.ticketType.name] = { count: 0, revenue: 0, cash: 0, upi: 0 };
        }
        summary.byItem[assign.ticketType.name].count += assign.soldCount;
        summary.byItem[assign.ticketType.name].revenue += assign.totalAmount;
        summary.byItem[assign.ticketType.name].cash += (assign.cashReceived || 0);
        summary.byItem[assign.ticketType.name].upi += (assign.upiReceived || 0);

        const soldEnd = assign.endNumber - (assign.returnedCount || 0);

        rows.push({
            id: `STF-${assign.id}`,
            date: assign.returnDate!,
            source: `Staff: ${assign.staff.name}`,
            ticketType: assign.ticketType.name,
            details: `(#${assign.startNumber}-${soldEnd})`,
            count: assign.soldCount,
            amount: assign.totalAmount,
            cash: assign.cashReceived || 0,
            upi: assign.upiReceived || 0
        });
    }

    // Sort combined
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    // Pagination
    let paginatedRows = rows;
    let totalPages = 1;

    if (!dateFilter) {
        const validPage = Math.max(1, page);
        const startIndex = (validPage - 1) * pageSize;
        paginatedRows = rows.slice(startIndex, startIndex + pageSize);
        totalPages = Math.ceil(rows.length / pageSize);

        return {
            summary,
            rows: paginatedRows,
            pagination: {
                currentPage: validPage,
                totalPages,
                totalItems: rows.length
            }
        };
    }

    // Return all rows if filtered by date
    return {
        summary,
        rows: rows,
        pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: rows.length
        }
    };
}
