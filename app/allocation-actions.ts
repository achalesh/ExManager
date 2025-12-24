'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Space Allocation
const allocateSpaceSchema = z.object({
    spaceId: z.number().min(1, "Space is required"),
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    eventId: z.number().min(1, "Event is required"),
});

export async function allocateSpace(data: z.infer<typeof allocateSpaceSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateSpaceSchema.parse(data);

        // Check if space is available
        const space = await prisma.space.findUnique({
            where: { id: parsed.spaceId },
            include: { category: true }
        });

        if (!space) {
            return { success: false, error: 'Space not found' };
        }

        if (space.status !== 'Available') {
            return { success: false, error: 'Space is not available' };
        }

        // Create booking and update space status
        await prisma.$transaction([
            prisma.booking.create({
                data: {
                    spaceId: parsed.spaceId,
                    exhibitorId: parsed.exhibitorId,
                    eventId: parsed.eventId,
                    totalAmount: space.category.price,
                }
            }),
            prisma.space.update({
                where: { id: parsed.spaceId },
                data: { status: 'Booked' }
            })
        ]);

        revalidatePath('/dashboard/allocate-space');
        revalidatePath('/dashboard/settings/spaces');
        return { success: true };
    } catch (error) {
        console.error('Error allocating space:', error);
        return { success: false, error: 'Failed to allocate space' };
    }
}

// Delete Allocation
export async function deleteAllocation(bookingId: number) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            return { success: false, error: 'Booking not found' };
        }

        // Delete booking and update space status to Available
        await prisma.$transaction([
            prisma.booking.delete({
                where: { id: bookingId }
            }),
            prisma.space.update({
                where: { id: booking.spaceId },
                data: { status: 'Available' }
            })
        ]);

        revalidatePath('/dashboard/allocate-space');
        revalidatePath('/dashboard/settings/spaces');
        return { success: true };
    } catch (error) {
        console.error('Error deleting allocation:', error);
        return { success: false, error: 'Failed to delete allocation' };
    }
}

export async function getBookings(eventId?: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const activeEventId = eventId || session.activeEventId;

    if (!activeEventId) {
        return [];
    }

    return await prisma.booking.findMany({
        where: {
            eventId: activeEventId
        },
        include: {
            space: {
                include: {
                    category: true
                }
            },
            exhibitor: true
        },
        orderBy: {
            bookedAt: 'desc'
        }
    });
}

// Material Allocation
const allocateMaterialSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    materialId: z.number().min(1, "Material is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    eventId: z.number().min(1, "Event is required"),
    isFOC: z.boolean().optional(),
});

export async function allocateMaterial(data: z.infer<typeof allocateMaterialSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateMaterialSchema.parse(data);

        const material = await prisma.material.findUnique({
            where: { id: parsed.materialId }
        });

        if (!material) {
            return { success: false, error: 'Material not found' };
        }

        const totalPrice = parsed.isFOC ? 0 : material.price * parsed.quantity;

        await prisma.materialAllocation.create({
            data: {
                exhibitorId: parsed.exhibitorId,
                materialId: parsed.materialId,
                quantity: parsed.quantity,
                totalPrice,
                eventId: parsed.eventId,
                isFOC: parsed.isFOC || false,
            }
        });

        revalidatePath('/dashboard/allocate-material');
        return { success: true };
    } catch (error) {
        console.error('Error allocating material:', error);
        return { success: false, error: 'Failed to allocate material' };
    }
}

// Scanned Allocation
const allocateScannedItemsSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    codes: z.array(z.string()).min(1, "At least one item must be scanned"),
    eventId: z.number().min(1, "Event is required"),
    isFOC: z.boolean().optional(),
});

export async function allocateScannedItems(data: z.infer<typeof allocateScannedItemsSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateScannedItemsSchema.parse(data);
        const { codes, exhibitorId, eventId, isFOC } = parsed;

        // 1. Fetch items to validate
        const items = await prisma.materialItem.findMany({
            where: { uniqueCode: { in: codes } },
            include: { material: true }
        });

        if (items.length !== codes.length) {
            return { success: false, error: 'Some scanned items were not found in the system.' };
        }

        // 2. Validate availability
        const unavailable = items.filter(i => i.status !== 'Available');
        if (unavailable.length > 0) {
            return {
                success: false,
                error: `Some items are already allocated or unavailable: ${unavailable.map(i => i.uniqueCode).join(', ')}`
            };
        }

        // 3. Group by Material Type (in case mixed scan)
        const itemsByMaterial = items.reduce((acc, item) => {
            if (!acc[item.materialId]) {
                acc[item.materialId] = { material: item.material, items: [] };
            }
            acc[item.materialId].items.push(item);
            return acc;
        }, {} as Record<number, { material: any, items: any[] }>);

        // 4. Create Transactions per Material Type
        await prisma.$transaction(async (tx) => {
            for (const matIdStr in itemsByMaterial) {
                const group = itemsByMaterial[matIdStr];
                const quantity = group.items.length;
                const totalPrice = isFOC ? 0 : group.material.price * quantity;

                // Create Allocation Header
                const allocation = await tx.materialAllocation.create({
                    data: {
                        exhibitorId,
                        materialId: parseInt(matIdStr),
                        quantity,
                        totalPrice,
                        eventId,
                        isFOC: isFOC || false,
                    }
                });

                // Update Items
                await tx.materialItem.updateMany({
                    where: { id: { in: group.items.map(i => i.id) } },
                    data: {
                        status: 'Allocated',
                        activeAllocationId: allocation.id
                    }
                });
            }
        });

        revalidatePath('/dashboard/allocate-material');
        return { success: true };

    } catch (error) {
        console.error('Error allocating scanned items:', error);
        return { success: false, error: 'Failed to allocate scanned items' };
    }
}

export async function getMaterialAllocations(eventId?: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const activeEventId = eventId || session.activeEventId;

    if (!activeEventId) {
        return [];
    }

    return await prisma.materialAllocation.findMany({
        where: {
            eventId: activeEventId
        },
        include: {
            material: true,
            exhibitor: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

// Electrical Allocation
const allocateElectricalSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    electricalItemId: z.number().min(1, "Electrical item is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    eventId: z.number().min(1, "Event is required"),
});

export async function allocateElectrical(data: z.infer<typeof allocateElectricalSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateElectricalSchema.parse(data);

        const item = await prisma.electricalItem.findUnique({
            where: { id: parsed.electricalItemId }
        });

        if (!item) {
            return { success: false, error: 'Electrical item not found' };
        }

        const totalPrice = item.price * parsed.quantity;
        const totalWattage = item.wattage * parsed.quantity;

        await prisma.electricalAllocation.create({
            data: {
                exhibitorId: parsed.exhibitorId,
                electricalItemId: parsed.electricalItemId,
                quantity: parsed.quantity,
                totalPrice,
                totalWattage,
                eventId: parsed.eventId,
            }
        });

        revalidatePath('/dashboard/allocate-electric');
        return { success: true };
    } catch (error) {
        console.error('Error allocating electrical:', error);
        return { success: false, error: 'Failed to allocate electrical item' };
    }
}

export async function getElectricalAllocations(eventId?: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const activeEventId = eventId || session.activeEventId;

    if (!activeEventId) {
        return [];
    }

    return await prisma.electricalAllocation.findMany({
        where: {
            eventId: activeEventId
        },
        include: {
            electricalItem: true,
            exhibitor: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

// Shed Allocation
const allocateShedSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    shedId: z.number().min(1, "Shed is required"),
    eventId: z.number().min(1, "Event is required"),
});

export async function allocateShed(data: z.infer<typeof allocateShedSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateShedSchema.parse(data);

        // Check if exhibitor already has a shed
        const existing = await prisma.shedAllocation.findFirst({
            where: {
                exhibitorId: parsed.exhibitorId,
                eventId: parsed.eventId
            }
        });

        if (existing) {
            return { success: false, error: 'Exhibitor already has a shed allocated' };
        }

        const shed = await prisma.shed.findUnique({
            where: { id: parsed.shedId }
        });

        if (!shed) {
            return { success: false, error: 'Shed not found' };
        }

        await prisma.shedAllocation.create({
            data: {
                exhibitorId: parsed.exhibitorId,
                shedId: parsed.shedId,
                price: shed.price,
                eventId: parsed.eventId,
            }
        });

        revalidatePath('/dashboard/allocate-shed');
        return { success: true };
    } catch (error) {
        console.error('Error allocating shed:', error);
        return { success: false, error: 'Failed to allocate shed' };
    }
}

export async function getShedAllocations(eventId?: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const activeEventId = eventId || session.activeEventId;

    if (!activeEventId) {
        return [];
    }

    return await prisma.shedAllocation.findMany({
        where: {
            eventId: activeEventId
        },
        include: {
            shed: true,
            exhibitor: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

// Get all exhibitors
export async function getExhibitors() {
    const session = await getSession();

    if (!session) {
        return [];
    }

    return await prisma.exhibitor.findMany({
        orderBy: {
            name: 'asc'
        }
    });
}
