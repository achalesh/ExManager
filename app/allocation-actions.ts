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

// Batch Allocation
const allocateBatchMaterialsSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    eventId: z.number().min(1, "Event is required"),
    items: z.array(z.object({
        materialId: z.number().min(1, "Material is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        focQuantity: z.number().optional(),
        suffixes: z.array(z.string()).optional(),
    })).min(1, "At least one item is required"),
});

export async function allocateBatchMaterials(data: z.infer<typeof allocateBatchMaterialsSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateBatchMaterialsSchema.parse(data);
        const { exhibitorId, eventId, items } = parsed;

        const createdIds: number[] = [];

        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const { materialId, quantity, focQuantity = 0, suffixes } = item;

                // Validate FOC
                if (focQuantity > quantity) {
                    throw new Error(`FOC Quantity cannot be greater than Total Quantity for material ID ${materialId}`);
                }

                // 1. Handle Tracked Items (if suffixes present)
                if (suffixes && suffixes.length > 0) {
                    // Check if suffixes match quantity
                    // (Frontend ensures this, but double check?)
                    // For tracked items, we ignore 'quantity' input usually and use suffixes.length, 
                    // OR we enforce they match.
                    // The simple way: Trust suffixes.

                    const availableItems = await tx.materialItem.findMany({
                        where: {
                            materialId: materialId,
                            status: 'Available'
                        }
                    });

                    const matchedItemsIds: number[] = [];
                    const notFound: string[] = [];

                    for (const suffix of suffixes) {
                        const match = availableItems.find(i => i.uniqueCode.endsWith(suffix));
                        // Avoid double picking in same batch?
                        if (match && !matchedItemsIds.includes(match.id)) {
                            matchedItemsIds.push(match.id);
                        } else {
                            notFound.push(suffix);
                        }
                    }

                    if (notFound.length > 0) {
                        throw new Error(`Items not found for IDs: ${notFound.join(', ')}`);
                    }

                    // Split into Paid vs FOC based on counts
                    const matchedItems = availableItems.filter(i => matchedItemsIds.includes(i.id));
                    const focItems = matchedItems.slice(0, focQuantity);
                    const paidItems = matchedItems.slice(focQuantity);

                    // Allocate FOC
                    if (focItems.length > 0) {
                        const allocationFOC = await tx.materialAllocation.create({
                            data: {
                                exhibitorId,
                                materialId,
                                quantity: focItems.length,
                                totalPrice: 0,
                                eventId,
                                isFOC: true,
                            },
                        });
                        await tx.materialItem.updateMany({
                            where: { id: { in: focItems.map(i => i.id) } },
                            data: { status: 'Allocated', activeAllocationId: allocationFOC.id }
                        });
                        createdIds.push(allocationFOC.id);
                    }

                    // Allocate Paid
                    if (paidItems.length > 0) {
                        const material = await tx.material.findUnique({ where: { id: materialId } });
                        if (!material) throw new Error("Material not found");

                        const allocationPaid = await tx.materialAllocation.create({
                            data: {
                                exhibitorId,
                                materialId,
                                quantity: paidItems.length,
                                totalPrice: material.price * paidItems.length,
                                eventId,
                                isFOC: false,
                            }
                        });
                        await tx.materialItem.updateMany({
                            where: { id: { in: paidItems.map(i => i.id) } },
                            data: { status: 'Allocated', activeAllocationId: allocationPaid.id }
                        });
                        createdIds.push(allocationPaid.id);
                    }

                } else {
                    // 2. Regular Allocation (Non-tracked)
                    const material = await tx.material.findUnique({ where: { id: materialId } });
                    if (!material) throw new Error(`Material ${materialId} not found`);

                    const paidQty = quantity - focQuantity;

                    if (paidQty > 0) {
                        const alloc = await tx.materialAllocation.create({
                            data: {
                                exhibitorId,
                                materialId,
                                quantity: paidQty,
                                totalPrice: material.price * paidQty,
                                eventId,
                                isFOC: false,
                            }
                        });
                        createdIds.push(alloc.id);
                    }

                    if (focQuantity > 0) {
                        const alloc = await tx.materialAllocation.create({
                            data: {
                                exhibitorId,
                                materialId,
                                quantity: focQuantity,
                                totalPrice: 0,
                                eventId,
                                isFOC: true,
                            }
                        });
                        createdIds.push(alloc.id);
                    }
                }
            }
        });

        revalidatePath('/dashboard/allocate-material');

        // Fetch full details of created allocations for receipt
        const createdAllocations = await prisma.materialAllocation.findMany({
            where: { id: { in: createdIds } },
            include: {
                material: true,
                items: true,
                exhibitor: {
                    include: {
                        bookings: {
                            where: { eventId },
                            include: { space: true }
                        }
                    }
                },
                event: true
            }
        });

        return { success: true, data: createdAllocations };
    } catch (error: any) {
        console.error('Error allocating batch items:', error);
        return { success: false, error: error.message || 'Failed to allocate batch items' };
    }
}

// Material Allocation
const allocateMaterialSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    materialId: z.number().min(1, "Material is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    eventId: z.number().min(1, "Event is required"),
    focQuantity: z.number().optional(), // New field
    isFOC: z.boolean().optional(), // Legacy support or explicit full FOC override
});

export async function allocateMaterial(data: z.infer<typeof allocateMaterialSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateMaterialSchema.parse(data);
        const { quantity, focQuantity = 0 } = parsed;

        if (focQuantity > quantity) {
            return { success: false, error: 'FOC Quantity cannot be greater than Total Quantity' };
        }

        const material = await prisma.material.findUnique({
            where: { id: parsed.materialId }
        });

        if (!material) {
            return { success: false, error: 'Material not found' };
        }

        const paidQuantity = quantity - focQuantity;

        const createdIds: number[] = [];

        await prisma.$transaction(async (tx) => {
            // 1. Paid Allocation
            if (paidQuantity > 0) {
                const allocPaid = await tx.materialAllocation.create({
                    data: {
                        exhibitorId: parsed.exhibitorId,
                        materialId: parsed.materialId,
                        quantity: paidQuantity,
                        totalPrice: material.price * paidQuantity,
                        eventId: parsed.eventId,
                        isFOC: false,
                    }
                });
                createdIds.push(allocPaid.id);
            }

            // 2. FOC Allocation
            if (focQuantity > 0) {
                const allocFOC = await tx.materialAllocation.create({
                    data: {
                        exhibitorId: parsed.exhibitorId,
                        materialId: parsed.materialId,
                        quantity: focQuantity,
                        totalPrice: 0,
                        eventId: parsed.eventId,
                        isFOC: true,
                    }
                });
                createdIds.push(allocFOC.id);
            }
        });

        revalidatePath('/dashboard/allocate-material');

        const createdAllocations = await prisma.materialAllocation.findMany({
            where: { id: { in: createdIds } },
            include: {
                material: true,
                items: true,
                exhibitor: {
                    include: {
                        bookings: {
                            where: { eventId: parsed.eventId },
                            include: { space: true }
                        }
                    }
                },
                event: true
            }
        });

        return { success: true, data: createdAllocations };
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

// Allocate specific items by suffix
const allocateMaterialItemsSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    materialId: z.number().min(1, "Material is required"),
    suffixes: z.array(z.string()).min(1, "At least one Item ID is required"),
    eventId: z.number().min(1, "Event is required"),
    focQuantity: z.number().optional(),
});

export async function allocateMaterialItems(data: z.infer<typeof allocateMaterialItemsSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateMaterialItemsSchema.parse(data);
        const { suffixes, materialId, exhibitorId, eventId, focQuantity = 0 } = parsed;

        if (focQuantity > suffixes.length) {
            return { success: false, error: 'FOC Quantity cannot be greater than Total Items' };
        }

        // 1. Fetch all available items for this material
        const availableItems = await prisma.materialItem.findMany({
            where: {
                materialId: materialId,
                status: 'Available'
            },
            include: { material: true }
        });

        const material = availableItems.length > 0 ? availableItems[0].material : await prisma.material.findUnique({ where: { id: materialId } });

        if (!material) {
            return { success: false, error: 'Material not found' };
        }

        // 2. Resolve suffixes to items
        const matchedItems: any[] = [];
        const notFoundSuffixes: string[] = [];

        for (const suffix of suffixes) {
            // Find items ending with this suffix
            const matches = availableItems.filter(i => i.uniqueCode.endsWith(suffix));

            if (matches.length === 0) {
                notFoundSuffixes.push(suffix);
            } else if (matches.length > 1) {
                return { success: false, error: `Ambiguous ID '${suffix}'. Multiple items found ending with this.` };
            } else {
                // Check if we already picked this item (duplicate suffix in input)
                if (matchedItems.find(i => i.id === matches[0].id)) {
                    // Duplicate suffix in input, just ignore double counting or error?
                    // Array of suffixes from UI might contain duplicates? filter unique first.
                    // user might type 001, 001
                } else {
                    matchedItems.push(matches[0]);
                }
            }
        }

        if (notFoundSuffixes.length > 0) {
            return {
                success: false,
                error: `Items not found (or not available) for IDs: ${notFoundSuffixes.join(', ')}`
            };
        }

        // 3. Create Allocation(s)
        const totalItems = matchedItems.length;
        // Split items into Paid and FOC
        const focItems = matchedItems.slice(0, focQuantity);
        const paidItems = matchedItems.slice(focQuantity);

        // We need transactions
        await prisma.$transaction(async (tx) => {

            // FOC Allocation
            if (focItems.length > 0) {
                const allocationFOC = await tx.materialAllocation.create({
                    data: {
                        exhibitorId,
                        materialId,
                        quantity: focItems.length,
                        totalPrice: 0,
                        eventId,
                        isFOC: true,
                    }
                });

                await tx.materialItem.updateMany({
                    where: { id: { in: focItems.map(i => i.id) } },
                    data: {
                        status: 'Allocated',
                        activeAllocationId: allocationFOC.id
                    }
                });
            }

            // Paid Allocation
            if (paidItems.length > 0) {
                const allocationPaid = await tx.materialAllocation.create({
                    data: {
                        exhibitorId,
                        materialId,
                        quantity: paidItems.length,
                        totalPrice: material.price * paidItems.length,
                        eventId,
                        isFOC: false,
                    }
                });

                await tx.materialItem.updateMany({
                    where: { id: { in: paidItems.map(i => i.id) } },
                    data: {
                        status: 'Allocated',
                        activeAllocationId: allocationPaid.id
                    }
                });
            }
        });

        revalidatePath('/dashboard/allocate-material');
        return { success: true };

    } catch (error) {
        console.error('Error allocating specific items:', error);
        return { success: false, error: 'Failed to allocate items' };
    }
}

export async function deleteMaterialAllocation(allocationId: number) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const allocation = await prisma.materialAllocation.findUnique({
            where: { id: allocationId },
            include: { items: true }
        });

        if (!allocation) {
            return { success: false, error: 'Allocation not found' };
        }

        await prisma.$transaction(async (tx) => {
            // 1. If there are specific items linked, restore them to Available
            if (allocation.items.length > 0) {
                await tx.materialItem.updateMany({
                    where: { activeAllocationId: allocationId },
                    data: {
                        status: 'Available',
                        activeAllocationId: null
                    }
                });
            }

            // 2. Delete the allocation
            await tx.materialAllocation.delete({
                where: { id: allocationId }
            });
        });

        revalidatePath('/dashboard/allocate-material');
        return { success: true };

    } catch (error) {
        console.error('Error deleting material allocation:', error);
        return { success: false, error: 'Failed to delete allocation' };
    }
}

// Update Allocation
const updateMaterialAllocationSchema = z.object({
    allocationId: z.number().min(1, "Allocation ID is required"),
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    materialId: z.number().min(1, "Material is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    suffixes: z.array(z.string()).optional(), // For tracked items
    eventId: z.number().min(1, "Event is required"),
    isFOC: z.boolean().optional(),
});

export async function updateMaterialAllocation(data: z.infer<typeof updateMaterialAllocationSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = updateMaterialAllocationSchema.parse(data);
        const { allocationId, suffixes = [] } = parsed;

        const allocation = await prisma.materialAllocation.findUnique({
            where: { id: allocationId },
            include: { items: true, material: true }
        });

        if (!allocation) {
            return { success: false, error: 'Allocation not found' };
        }

        // Determine if this is a tracked allocation (based on existing items or new suffixes)
        // If it WAS tracked (has items) OR matches logic for tracking now? 
        // Logic: if suffixes provided > 0, treat as tracked. If original had items, treat as tracked.

        // Simplified Logic:
        // 1. If it has tracked items, we must handle item delta.
        // 2. If it's pure number based, just update number.

        await prisma.$transaction(async (tx) => {
            // Handle Tracked Items
            if (suffixes.length > 0 || allocation.items.length > 0) {
                // 1. Identify Removed Items
                const oldSuffixes = allocation.items.map(i => i.uniqueCode);
                // We need to compare *full unique codes* if possible, or just suffixes if that's how we track.
                // But wait, the input is 'suffixes'.
                // If the item already exists, we know its ID.
                // The UI passes suffixes (e.g. "001"). 
                // We need to map these to actual items.

                // Strategy: 
                // - Release ALL currently linked items for this allocation.
                // - Re-allocate based on the new list of suffixes.
                // - This is safer than computing delta with suffixes vs full codes.

                // 1. Release all currently linked items
                await tx.materialItem.updateMany({
                    where: { activeAllocationId: allocationId },
                    data: { status: 'Available', activeAllocationId: null }
                });

                // 2. Allocate items for new suffixes
                if (suffixes.length > 0) {
                    const availableItems = await tx.materialItem.findMany({
                        where: {
                            materialId: parsed.materialId,
                            status: 'Available'
                        }
                    });

                    const matchedItemsIds: number[] = [];
                    const notFound: string[] = [];

                    for (const suffix of suffixes) {
                        const match = availableItems.find(i => i.uniqueCode.endsWith(suffix));
                        // NOTE: We might have just released some items in step 1, so we should actually
                        // fetch ALL items for this material that are (Available OR previously linked to this allocation)
                        // But since we did step 1 inside transaction, they ARE 'Available' now in DB state 
                        // (Prisma transactions might need interactive check, but here we run queries sequentially inside tx).
                        // Wait, `availableItems` query above will see the updates from step 1? 
                        // Yes, interactive transactions see their own writes.

                        if (match) {
                            if (!matchedItemsIds.includes(match.id)) {
                                matchedItemsIds.push(match.id);
                            }
                        } else {
                            notFound.push(suffix);
                        }
                    }

                    if (notFound.length > 0) {
                        throw new Error(`Items not found for IDs: ${notFound.join(', ')}`);
                    }

                    if (matchedItemsIds.length !== suffixes.length) {
                        // Should verify no duplicates in input
                    }

                    // Update status to Allocated
                    await tx.materialItem.updateMany({
                        where: { id: { in: matchedItemsIds } },
                        data: { status: 'Allocated', activeAllocationId: allocationId }
                    });
                }
            }

            // Update Allocation Record
            // If tracked, quantity is suffixes.length. Else, parsed.quantity.
            const newQuantity = (suffixes.length > 0) ? suffixes.length : parsed.quantity;
            const newTotalPrice = parsed.isFOC ? 0 : allocation.material.price * newQuantity;

            await tx.materialAllocation.update({
                where: { id: allocationId },
                data: {
                    exhibitorId: parsed.exhibitorId,
                    materialId: parsed.materialId,
                    quantity: newQuantity,
                    totalPrice: newTotalPrice,
                    isFOC: parsed.isFOC || false,
                }
            });
        });

        revalidatePath('/dashboard/allocate-material');

        // Fetch updated allocation for receipt
        const updatedAllocation = await prisma.materialAllocation.findUnique({
            where: { id: allocationId },
            include: {
                material: true,
                items: true,
                exhibitor: true
            }
        });

        return { success: true, data: [updatedAllocation] };

    } catch (error: any) {
        console.error('Error updating material allocation:', error);
        return { success: false, error: error.message || 'Failed to update allocation' };
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
            exhibitor: {
                include: {
                    bookings: {
                        where: { eventId: activeEventId },
                        include: { space: true }
                    }
                }
            },
            items: true,
            event: true
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

        const newAllocation = await prisma.electricalAllocation.create({
            data: {
                exhibitorId: parsed.exhibitorId,
                electricalItemId: parsed.electricalItemId,
                quantity: parsed.quantity,
                totalPrice: item.price * parsed.quantity,
                totalWattage: item.wattage * parsed.quantity,
                eventId: parsed.eventId,
            }
        });

        revalidatePath('/dashboard/allocate-electric');

        const createdAllocation = await prisma.electricalAllocation.findFirst({
            where: { id: newAllocation.id },
            include: {
                electricalItem: true,
                exhibitor: {
                    include: {
                        bookings: {
                            where: { eventId: parsed.eventId },
                            include: { space: true }
                        }
                    }
                },
                event: true
            }
        });

        return { success: true, data: [createdAllocation] };
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
            exhibitor: {
                include: {
                    bookings: {
                        where: { eventId: activeEventId },
                        include: { space: true }
                    }
                }
            },
            event: true
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

        const newAllocation = await prisma.shedAllocation.create({
            data: {
                exhibitorId: parsed.exhibitorId,
                shedId: parsed.shedId,
                price: shed.price,
                eventId: parsed.eventId,
            }
        });

        revalidatePath('/dashboard/allocate-shed');

        const createdAllocation = await prisma.shedAllocation.findFirst({
            where: { id: newAllocation.id },
            include: {
                shed: true,
                exhibitor: {
                    include: {
                        bookings: {
                            where: { eventId: parsed.eventId },
                            include: { space: true }
                        }
                    }
                },
                event: true
            }
        });

        return { success: true, data: [createdAllocation] };
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
            exhibitor: {
                include: {
                    bookings: {
                        where: { eventId: activeEventId },
                        include: { space: true }
                    }
                }
            },
            event: true
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
// Get single exhibitor summary
export async function getExhibitorSummary(exhibitorId: number, eventId: number) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const [
            exhibitor,
            bookings,
            materialAllocations,
            electricalAllocations,
            shedAllocations,
            payments
        ] = await Promise.all([
            prisma.exhibitor.findUnique({ where: { id: exhibitorId } }),
            prisma.booking.findMany({
                where: { exhibitorId, eventId },
                include: { space: { include: { category: true } } }
            }),
            prisma.materialAllocation.findMany({
                where: { exhibitorId, eventId },
                include: { material: true, items: true }
            }),
            prisma.electricalAllocation.findMany({
                where: { exhibitorId, eventId },
                include: { electricalItem: true }
            }),
            prisma.shedAllocation.findMany({
                where: { exhibitorId, eventId },
                include: { shed: true }
            }),
            prisma.payment.findMany({
                where: { exhibitorId }, // Note: Payment doesn't have eventId in schema, fetching all for exhibitor
                orderBy: { createdAt: 'desc' }
            })
        ]);

        if (!exhibitor) {
            return { success: false, error: 'Exhibitor not found' };
        }

        // Calculate Totals
        const spaceTotal = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        const materialTotal = materialAllocations.reduce((sum, a) => sum + a.totalPrice, 0);
        const electricalTotal = electricalAllocations.reduce((sum, a) => sum + a.totalPrice, 0);
        const shedTotal = shedAllocations.reduce((sum, a) => sum + (a.price || 0), 0);
        const grandTotal = spaceTotal + materialTotal + electricalTotal + shedTotal;
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = grandTotal - totalPaid;

        return {
            success: true,
            data: {
                exhibitor,
                bookings,
                materialAllocations,
                electricalAllocations,
                shedAllocations,
                payments,
                summary: {
                    spaceTotal,
                    materialTotal,
                    electricalTotal,
                    shedTotal,
                    grandTotal,
                    totalPaid,
                    balance
                }
            }
        };

    } catch (error) {
        console.error('Error fetching exhibitor summary:', error);
        return { success: false, error: 'Failed to fetch exhibitor summary' };
    }
}
// Batch Electrical Allocation
const allocateBatchElectricalSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    eventId: z.number().min(1, "Event is required"),
    items: z.array(z.object({
        electricalItemId: z.number().min(1, "Electrical Item is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
    })).min(1, "At least one item is required"),
});

export async function allocateBatchElectrical(data: z.infer<typeof allocateBatchElectricalSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = allocateBatchElectricalSchema.parse(data);
        const { exhibitorId, eventId, items } = parsed;

        const createdIds: number[] = [];

        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const electricalItem = await tx.electricalItem.findUnique({
                    where: { id: item.electricalItemId }
                });

                if (!electricalItem) {
                    throw new Error(`Electrical Item ${item.electricalItemId} not found`);
                }

                const totalPrice = electricalItem.price * item.quantity;
                const totalWattage = electricalItem.wattage * item.quantity;

                const allocation = await tx.electricalAllocation.create({
                    data: {
                        exhibitorId,
                        electricalItemId: item.electricalItemId,
                        quantity: item.quantity,
                        totalPrice,
                        totalWattage,
                        eventId
                    }
                });
                createdIds.push(allocation.id);
            }
        });

        revalidatePath('/dashboard/allocate-electrical');

        const createdAllocations = await prisma.electricalAllocation.findMany({
            where: { id: { in: createdIds } },
            include: {
                electricalItem: true,
                exhibitor: true,
                event: true
            }
        });

        return { success: true, data: createdAllocations };

    } catch (error: any) {
        console.error('Error allocating batch electrical items:', error);
        return { success: false, error: error.message || 'Failed to allocate items' };
    }
}

export async function deleteElectricalAllocation(allocationId: number) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.electricalAllocation.delete({
            where: { id: allocationId }
        });

        revalidatePath('/dashboard/allocate-electrical');
        return { success: true };
    } catch (error) {
        console.error('Error deleting electrical allocation:', error);
        return { success: false, error: 'Failed to delete allocation' };
    }
}

const updateElectricalAllocationSchema = z.object({
    allocationId: z.number().min(1, "Allocation ID is required"),
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    electricalItemId: z.number().min(1, "Electrical Item is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    eventId: z.number().min(1, "Event is required"),
});

export async function updateElectricalAllocation(data: z.infer<typeof updateElectricalAllocationSchema>) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = updateElectricalAllocationSchema.parse(data);
        const { allocationId, electricalItemId, quantity } = parsed;

        const electricalItem = await prisma.electricalItem.findUnique({
            where: { id: electricalItemId }
        });

        if (!electricalItem) {
            return { success: false, error: 'Electrical item not found' };
        }

        const totalPrice = electricalItem.price * quantity;
        const totalWattage = electricalItem.wattage * quantity;

        await prisma.electricalAllocation.update({
            where: { id: allocationId },
            data: {
                exhibitorId: parsed.exhibitorId,
                electricalItemId: parsed.electricalItemId,
                quantity: parsed.quantity,
                totalPrice,
                totalWattage,
                eventId: parsed.eventId
            }
        });

        revalidatePath('/dashboard/allocate-electrical');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating electrical allocation:', error);
        return { success: false, error: error.message || 'Failed to update allocation' };
    }
}
