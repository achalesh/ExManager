'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// --- Schema Definitions ---

export const ticketTypeSchema = z.object({
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
    ticketsPerBooklet: z.coerce.number().optional().default(100),
});

export const ticketBatchSchema = z.object({
    ticketTypeId: z.coerce.number(),
    mode: z.enum(['manual', 'inventory']).default('manual'),
    startNumber: z.coerce.number().optional(),
    endNumber: z.coerce.number().optional(),
    inventoryId: z.coerce.number().optional(),
    quantity: z.coerce.number().optional(),
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
                ticketsPerBooklet: parsed.ticketsPerBooklet,

                ownerShares: {
                    create: sharesToCreate.map(s => ({
                        amusementOwnerId: s.amusementOwnerId,
                        sharePercentage: s.sharePercentage
                    }))
                }
            } as any,
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
        const parsed = ticketTypeSchema.partial().parse(data);

        // If shares are updated, we need to replace them
        // This logic is complex for partial updates, usually we expect full ownerShares array if updating ownership

        await prisma.ticketType.update({
            where: { id },
            data: {
                ...(parsed.category && { category: parsed.category }),
                ...(parsed.name && { name: parsed.name }),
                ...(parsed.price !== undefined && { price: parsed.price }),
                ...(parsed.upiMachineId !== undefined && { upiMachineId: parsed.upiMachineId }),
                ...(parsed.ticketsPerBooklet !== undefined && { ticketsPerBooklet: parsed.ticketsPerBooklet }),

                // For now, if ownerShares are passed, we might need a separate logic or assume full replace
                // But ticketType update in UI might not send shares. 
            }
        });

        // If we need to update shares:
        if (parsed.ownerShares) {
            // Delete existing
            await prisma.ticketOwnerShare.deleteMany({ where: { ticketTypeId: id } });
            // Create new
            if (parsed.ownerShares.length > 0) {
                await prisma.ticketOwnerShare.createMany({
                    data: parsed.ownerShares.map(s => ({
                        ticketTypeId: id,
                        amusementOwnerId: s.amusementOwnerId,
                        sharePercentage: s.sharePercentage
                    }))
                });

                // Update main legacy pointers
                await prisma.ticketType.update({
                    where: { id },
                    data: {
                        amusementOwnerId: parsed.ownerShares[0].amusementOwnerId,
                        ownerSharePercentage: parsed.ownerShares[0].sharePercentage
                    }
                });
            } else {
                await prisma.ticketType.update({
                    where: { id },
                    data: {
                        amusementOwnerId: null,
                        ownerSharePercentage: 0
                    }
                });
            }
        }

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/settings/tickets');
        return { success: true };
    } catch (error) {
        console.error('Error updating ticket type:', error);
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

export const assignStockSchema = z.object({
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
