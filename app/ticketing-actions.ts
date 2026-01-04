'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// --- Schema Definitions ---

const ticketTypeSchema = z.object({
    eventId: z.coerce.number(),
    category: z.enum(['Entrance', 'Amusement', 'Office']),
    name: z.string().min(2),
    price: z.coerce.number().min(0),
    // Deprecated single owner fields, keeping for backward compatibility in Zod but logic will change
    amusementOwnerId: z.coerce.number().optional().nullable(),
    ownerSharePercentage: z.coerce.number().optional(),

    // New Multi-Owner Support
    ownerShares: z.array(z.object({
        amusementOwnerId: z.coerce.number(),
        sharePercentage: z.coerce.number()
    })).optional(),

    // UPI Machine Assignment
    upiMachineId: z.coerce.number().optional().nullable(),
});

const ticketBatchSchema = z.object({
    ticketTypeId: z.coerce.number(),
    mode: z.enum(['manual', 'inventory']).default('manual'),
    startNumber: z.coerce.number().optional(),
    endNumber: z.coerce.number().optional(),
    inventoryId: z.coerce.number().optional(),
    quantity: z.coerce.number().optional(),
});

const ticketSaleSchema = z.object({
    eventId: z.coerce.number(),
    items: z.array(z.object({
        ticketTypeId: z.coerce.number(),
        quantity: z.coerce.number().min(1),
    })),
});

// --- Ticket Types ---

export async function createTicketType(data: z.infer<typeof ticketTypeSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = ticketTypeSchema.parse(data);

        // Handle Legacy + New Mixed Logic
        // If ownerShares is provided, use it.
        // If not, but amusementOwnerId is provided (legacy UI), construct one share.

        let sharesToCreate = parsed.ownerShares || [];
        if (sharesToCreate.length === 0 && parsed.amusementOwnerId) {
            sharesToCreate.push({
                amusementOwnerId: parsed.amusementOwnerId,
                sharePercentage: parsed.ownerSharePercentage || 0
            });
        }

        const ticketType = await prisma.ticketType.create({
            data: {
                eventId: parsed.eventId,
                category: parsed.category,
                name: parsed.name,
                price: parsed.price,
                // Keep keeping the main field populated with the FIRST owner for easy legacy query fallback
                amusementOwnerId: sharesToCreate.length > 0 ? sharesToCreate[0].amusementOwnerId : null,
                ownerSharePercentage: sharesToCreate.length > 0 ? sharesToCreate[0].sharePercentage : 0,

                upiMachineId: parsed.upiMachineId || null,

                ownerShares: {
                    create: sharesToCreate.map(s => ({
                        amusementOwnerId: s.amusementOwnerId,
                        sharePercentage: s.sharePercentage
                    }))
                }
            },
        });
        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/settings/tickets');
        return { success: true, ticketType };
    } catch (error) {
        console.error('Error creating ticket type:', error);
        return { success: false, error: 'Failed to create ticket type' };
    }
}

export async function updateTicketType(id: number, data: Partial<z.infer<typeof ticketTypeSchema>>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Construct shares similar to create
        let sharesToUpdate = data.ownerShares || [];

        // If pure legacy update (sending only amusementOwnerId and no ownerShares array)
        if ((!data.ownerShares || data.ownerShares.length === 0) && data.amusementOwnerId) {
            sharesToUpdate.push({
                amusementOwnerId: data.amusementOwnerId,
                sharePercentage: data.ownerSharePercentage || 0
            });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Update basic fields
            await tx.ticketType.update({
                where: { id },
                data: {
                    name: data.name,
                    price: data.price,
                    category: data.category,
                    // Update legacy fields with the first share if exists, else null
                    amusementOwnerId: sharesToUpdate.length > 0 ? sharesToUpdate[0].amusementOwnerId : null,
                    ownerSharePercentage: sharesToUpdate.length > 0 ? sharesToUpdate[0].sharePercentage : 0,
                    upiMachineId: data.upiMachineId || null
                }
            });

            // 2. Sync Shares (Delete all and recreate is simplest)
            await tx.ticketOwnerShare.deleteMany({
                where: { ticketTypeId: id }
            });

            if (sharesToUpdate.length > 0) {
                await tx.ticketOwnerShare.createMany({
                    data: sharesToUpdate.map(s => ({
                        ticketTypeId: id,
                        amusementOwnerId: s.amusementOwnerId,
                        sharePercentage: s.sharePercentage
                    }))
                });
            }
        });

        revalidatePath('/dashboard/settings/tickets');
        return { success: true };
    } catch (error) {
        console.error('Update Ticket Error', error);
        return { success: false, error: 'Failed to update ticket type' };
    }
}

export async function deleteTicketType(id: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Check dependencies
        const hasSales = await prisma.ticketSaleItem.findFirst({ where: { ticketTypeId: id } });
        if (hasSales) return { success: false, error: 'Cannot delete: Sales exist for this ticket type.' };

        const hasAssignments = await prisma.staffTicketAssignment.findFirst({ where: { ticketTypeId: id } });
        if (hasAssignments) return { success: false, error: 'Cannot delete: Staff assignments exist.' };

        // Delete active batches and the type itself. Cascade handles TicketOwnerShare.
        await prisma.$transaction([
            prisma.ticketBatch.deleteMany({ where: { ticketTypeId: id } }),
            prisma.ticketType.delete({ where: { id } })
        ]);

        revalidatePath('/dashboard/settings/tickets');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete ticket type' };
    }
}

export async function getTicketTypes(eventId: number) {
    return await prisma.ticketType.findMany({
        where: { eventId },
        include: {
            amusementOwner: true, // Keep for legacy UIs for now
            ownerShares: {
                include: { amusementOwner: true }
            },
            upiMachine: true,
            batches: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: { category: 'asc' }
    });
}

// --- Ticket Batches ---

const assignStockSchema = z.object({
    ticketTypeId: z.coerce.number(),
    inventoryId: z.coerce.number(),
    quantity: z.coerce.number().min(1)
});

export async function assignTicketStock(data: z.infer<typeof assignStockSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = assignStockSchema.parse(data);

        return await prisma.$transaction(async (tx) => {
            // 1. Fetch Inventory Source
            const inventory = await tx.ticketInventory.findUnique({
                where: { id: parsed.inventoryId }
            });
            if (!inventory) throw new Error('Inventory source not found');

            // 2. Fetch Ticket Type Target
            const ticketType = await tx.ticketType.findUnique({
                where: { id: parsed.ticketTypeId }
            });
            if (!ticketType) throw new Error('Ticket Item not found');

            // 3. Validation
            if (inventory.status !== 'Available') throw new Error('Stock is not available');
            const available = inventory.endNumber - inventory.currentNumber + 1;
            if (parsed.quantity > available) throw new Error(`Insufficient stock. Available: ${available}`);

            // Optional: Strict Price/Category Match?
            // User might want to assign 50rs stock to 50rs item. Warning if mismatch?
            // For now, allow mix if Admin decides, but usually it should match.

            // 4. Calculate Range
            const startNumber = inventory.currentNumber;
            const endNumber = startNumber + parsed.quantity - 1;

            // 5. Deactivate previous batches for this Item?
            // Usually we only have 1 active batch per item for counter sales.
            await tx.ticketBatch.updateMany({
                where: { ticketTypeId: parsed.ticketTypeId, isActive: true },
                data: { isActive: false }
            });

            // 6. Create Batch
            const batch = await tx.ticketBatch.create({
                data: {
                    ticketTypeId: parsed.ticketTypeId,
                    inventoryId: parsed.inventoryId,
                    startNumber,
                    endNumber,
                    currentNumber: startNumber,
                    isActive: true
                }
            });

            // 7. Update Inventory
            await tx.ticketInventory.update({
                where: { id: inventory.id },
                data: {
                    currentNumber: endNumber + 1,
                    status: (endNumber === inventory.endNumber) ? 'Exhausted' : 'Available'
                }
            });

            return { success: true, batch };
        });

    } catch (error: any) {
        console.error('Error assigning stock:', error);
        return { success: false, error: error.message || 'Failed to assign stock' };
    }
}

export async function getTicketBatches(ticketTypeId: number) {
    return await prisma.ticketBatch.findMany({
        where: { ticketTypeId },
        orderBy: { createdAt: 'desc' }
    });
}

export async function deleteTicketBatch(batchId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const batch = await prisma.ticketBatch.findUnique({ where: { id: batchId } });
        if (!batch) return { success: false, error: 'Batch not found' };

        // Check for sales in range
        const sales = await prisma.ticketSaleItem.findFirst({
            where: {
                ticketTypeId: batch.ticketTypeId,
                ticketNumber: {
                    gte: batch.startNumber,
                    lte: batch.endNumber
                }
            }
        });

        if (sales) {
            return { success: false, error: 'Cannot delete: Tickets from this batch have been sold.' };
        }

        await prisma.ticketBatch.delete({ where: { id: batchId } });

        revalidatePath('/dashboard/settings/tickets');
        revalidatePath('/dashboard/ticketing');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete ticket batch' };
    }
}

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
                    where: { id: item.ticketTypeId }
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
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
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
    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
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
            status: 'Returned',
            ticketType: { eventId: eventId }
        },
        include: { ticketType: true },
        orderBy: { returnDate: 'desc' }
    });

    // 3. Aggregate Data
    let totalRevenue = 0;
    let totalTickets = 0;
    const byCategory: Record<string, { count: number, revenue: number }> = {};
    const byType: Record<string, { count: number, revenue: number, category: string }> = {};
    const recentTransactions: any[] = [];

    // Process Manual Sales
    for (const sale of manualSales) {
        totalRevenue += sale.totalAmount;
        let saleCount = 0;

        for (const item of sale.items) {
            const typeName = item.ticketType.name;
            const catName = item.ticketType.category;
            // Sales can be bundles in future, but assuming 1 item = 1 ticket based on schema loop logic
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
            date: assign.returnDate,
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
        recentTransactions: recentTransactions.slice(0, 50)
    };
}

export async function getDetailedSalesReport(eventId: number, dateFilter?: string, page: number = 1) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office', 'Accountant'].includes(session.roleName)) {
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
        source: 'Counter'
    };
    const staffWhere: any = {
        status: 'Returned',
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
        orderBy: { createdAt: 'desc' },
        take: dateStart ? undefined : 200 // Limit if no date filter to keep summary manageable for default view
    });

    // 2. Fetch Staff Returns
    const staffSales = await prisma.staffTicketAssignment.findMany({
        where: staffWhere,
        include: { ticketType: true, staff: true },
        orderBy: { returnDate: 'desc' },
        take: dateStart ? undefined : 200 // Limit if no date filter
    });

    // 3. Normalize Data & Calculate Aggregates
    const rows: any[] = [];
    const summary = {
        totalRevenue: 0,
        totalTickets: 0,
        entrance: { count: 0, revenue: 0 },
        amusement: { count: 0, revenue: 0 },
        byItem: {} as Record<string, { count: number; revenue: number }>
    };

    // Map Counter Sales
    for (const sale of manualSales) {
        summary.totalRevenue += sale.totalAmount;
        summary.totalTickets += sale.items.length;

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
                summary.byItem[item.ticketType.name] = { count: 0, revenue: 0 };
            }
            summary.byItem[item.ticketType.name].count++;
            summary.byItem[item.ticketType.name].revenue += item.price;

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
            amount: sale.totalAmount
        });
    }

    // Map Staff Sales
    for (const assign of staffSales) {
        if (!assign.soldCount || !assign.totalAmount) continue;

        summary.totalRevenue += assign.totalAmount;
        summary.totalTickets += assign.soldCount;

        if (assign.ticketType.category === 'Entrance') {
            summary.entrance.count += assign.soldCount;
            summary.entrance.revenue += assign.totalAmount;
        } else if (assign.ticketType.category === 'Amusement') {
            summary.amusement.count += assign.soldCount;
            summary.amusement.revenue += assign.totalAmount;
        }

        if (!summary.byItem[assign.ticketType.name]) {
            summary.byItem[assign.ticketType.name] = { count: 0, revenue: 0 };
        }
        summary.byItem[assign.ticketType.name].count += assign.soldCount;
        summary.byItem[assign.ticketType.name].revenue += assign.totalAmount;

        const soldEnd = assign.endNumber - (assign.returnedCount || 0);

        rows.push({
            id: `STF-${assign.id}`,
            date: assign.returnDate!,
            source: `Staff: ${assign.staff.name}`,
            ticketType: assign.ticketType.name,
            details: `(#${assign.startNumber}-${soldEnd})`,
            count: assign.soldCount,
            amount: assign.totalAmount
        });
    }

    // Sort combined
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const validPage = Math.max(1, page);
    const startIndex = (validPage - 1) * pageSize;
    const paginatedRows = rows.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(rows.length / pageSize);

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

const staffAssignmentSchema = z.object({
    staffId: z.coerce.number(),
    ticketTypeId: z.coerce.number(),
    inventoryId: z.coerce.number(),
    quantity: z.coerce.number().min(1),
    assignedDate: z.string().optional(), // ISO String
    assignedUpiMachineId: z.coerce.number().optional()
});

export async function assignTicketsToStaff(data: z.infer<typeof staffAssignmentSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = staffAssignmentSchema.parse(data);

        return await prisma.$transaction(async (tx) => {
            const inventory = await tx.ticketInventory.findUnique({ where: { id: parsed.inventoryId } });
            if (!inventory || inventory.status !== 'Available') throw new Error('Stock unavailable');

            const available = inventory.endNumber - inventory.currentNumber + 1;
            if (parsed.quantity > available) throw new Error(`Insufficient stock. Available: ${available}`);

            const startNumber = inventory.currentNumber;
            const endNumber = startNumber + parsed.quantity - 1;

            const ticketType = await tx.ticketType.findUnique({ where: { id: parsed.ticketTypeId } });
            if (!ticketType) throw new Error('Ticket Type not found');

            // Determine UPI Machine
            // Priority: Manual Override -> Ticket Type Default -> Null
            let finalMachineId = parsed.assignedUpiMachineId;
            if (!finalMachineId) {
                finalMachineId = ticketType.upiMachineId || undefined;
            }

            // Determine Date
            const assignedDate = parsed.assignedDate ? new Date(parsed.assignedDate) : new Date();

            // @ts-ignore
            const assignment = await tx.staffTicketAssignment.create({
                data: {
                    staffId: parsed.staffId,
                    ticketTypeId: parsed.ticketTypeId,
                    ticketInventoryId: parsed.inventoryId,
                    seriesLabel: inventory.seriesLabel,
                    startNumber,
                    endNumber,
                    assignedCount: parsed.quantity,
                    status: 'Assigned',
                    assignedUpiMachineId: finalMachineId,
                    assignedDate: assignedDate
                }
            });

            await tx.ticketInventory.update({
                where: { id: inventory.id },
                data: {
                    currentNumber: endNumber + 1,
                    status: (endNumber === inventory.endNumber) ? 'Exhausted' : 'Available'
                }
            });

            return { success: true, assignment };
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

const settlementSchema = z.object({
    assignmentId: z.coerce.number(),
    returnedCount: z.coerce.number().min(0),
    cashReceived: z.coerce.number().min(0),
    upiReceived: z.coerce.number().min(0).optional().default(0),
    returnDate: z.string().optional() // ISO String
});

export async function settleStaffAssignment(data: z.infer<typeof settlementSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = settlementSchema.parse(data);

        await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id: parsed.assignmentId },
                include: {
                    ticketType: {
                        include: {
                            ownerShares: true, // Fetch shares to split revenue
                            upiMachine: true // Fetch assigned machine
                        }
                    }
                }
            });
            if (!assignment) throw new Error('Assignment not found');
            if (assignment.status === 'Returned') throw new Error('Already settled');

            const settleDate = parsed.returnDate ? new Date(parsed.returnDate) : new Date();

            const soldCount = assignment.assignedCount - parsed.returnedCount;
            const expectedAmount = soldCount * assignment.ticketType.price;

            // --- Profit Sharing Logic ---
            const ownerShares = assignment.ticketType.ownerShares || [];
            let totalOwnerShareAmount = 0;
            const upiMachine = assignment.ticketType.upiMachine;
            const isOwnerMaintainedMachine = upiMachine && !upiMachine.isCompanyOwned;

            // 1. Create Ledger Entries for Owners
            if (ownerShares.length > 0 && soldCount > 0) {
                for (const share of ownerShares) {
                    const shareAmount = (expectedAmount * share.sharePercentage) / 100;
                    totalOwnerShareAmount += shareAmount;

                    // Determine if THIS owner collected the money (via their UPI machine)
                    // If the machine belongs to this owner, they collected the FULL sales amount
                    let collectedByThisOwner = 0;
                    if (isOwnerMaintainedMachine && upiMachine.amusementOwnerId === share.amusementOwnerId) {
                        collectedByThisOwner = expectedAmount;
                    }

                    await tx.amusementLedger.create({
                        data: {
                            date: settleDate,
                            amusementOwnerId: share.amusementOwnerId,
                            ticketTypeId: assignment.ticketTypeId,
                            details: `${assignment.ticketType.name} - ${soldCount} tickets`,
                            soldCount: soldCount,
                            totalSales: expectedAmount,
                            ownerSharePercentage: share.sharePercentage,
                            ownerShareAmount: shareAmount,
                            companyShareAmount: expectedAmount - shareAmount,
                            collectedByOwner: collectedByThisOwner,
                            settledAssignmentId: assignment.id,
                            status: 'Pending'
                        }
                    });
                }
            }

            // 2. Day Book Entry for Company Share
            // If an Owner collected the money, the Company did NOT receive cash/bank deposit yet.
            // So we DO NOT create an Income Transaction in the Day Book to avoid inflating Cash Balance.
            // The "Asset" is now "Receivable from Owner", tracked in AmusementLedger.

            if (!isOwnerMaintainedMachine) {
                const companyShare = expectedAmount - totalOwnerShareAmount;

                // Format Description: "Torra Torra Rs.100 x Sold ticket count - balance percentage ie.70%"
                const companyPercentage = expectedAmount > 0
                    ? (companyShare / expectedAmount) * 100
                    : 100;

                await tx.transaction.create({
                    data: {
                        eventId: assignment.ticketType.eventId,
                        amount: companyShare,
                        type: 'Income',
                        category: 'Revenue Share', // Or 'Ticket Sales'
                        description: `${assignment.ticketType.name} - ${soldCount} tkts x ${assignment.ticketType.price} - Co. Share ${companyPercentage.toFixed(1)}%`,
                        paymentMethod: 'Cash', // Assumption for settlement
                        transactionDate: settleDate,
                        recordedBy: session.username
                    }
                });
            }

            // --- End Profit Sharing ---

            await tx.staffTicketAssignment.update({
                where: { id: parsed.assignmentId },
                data: {
                    status: 'Returned',
                    returnDate: settleDate,
                    returnedCount: parsed.returnedCount,
                    soldCount,
                    totalAmount: expectedAmount,
                    cashReceived: parsed.cashReceived,
                    upiReceived: parsed.upiReceived || 0
                }
            });
        });

        revalidatePath('/dashboard/ticketing/staff');
        return { success: true };
    } catch (error: any) {
        console.error('Settlement error:', error);
        return { success: false, error: error.message };
    }
}

export async function getStaffAssignments(eventId: number) {
    // Return active and recent assignments
    return await prisma.staffTicketAssignment.findMany({
        where: { staff: { eventId } },
        include: {
            staff: true,
            ticketType: true,
            ticketInventory: true
        },
        orderBy: { assignedDate: 'desc' }
    });
}

export async function undoStaffAssignment(assignmentId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id: assignmentId },
                include: { ticketInventory: true }
            });

            if (!assignment) throw new Error('Assignment not found');
            if (assignment.status !== 'Assigned') throw new Error('Cannot undo settled assignments.');

            const inventory = assignment.ticketInventory;
            if (!inventory) throw new Error('Inventory record missing.');

            // Check if this was the LATEST assignment from this inventory
            // Inventory currentNumber should be exactly (endNumber + 1)
            // Example: Assigned 1-10. End=10. Inv Current=11.
            if (inventory.currentNumber !== assignment.endNumber + 1) {
                throw new Error('Cannot undo: Subsequent assignments exist from this stock bundle. Please use Settlement instead.');
            }

            // Restore Inventory
            await tx.ticketInventory.update({
                where: { id: inventory.id },
                data: {
                    currentNumber: assignment.startNumber,
                    status: 'Available' // Ensure it's available if it was Exhausted
                }
            });

            // Delete Assignment
            await tx.staffTicketAssignment.delete({ where: { id: assignmentId } });

            return { success: true };
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
