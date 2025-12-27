
'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Delete all material allocations for an exhibitor
export async function deleteExhibitorMaterialAllocations(exhibitorId: number, eventId: number) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const allocations = await prisma.materialAllocation.findMany({
            where: {
                exhibitorId: exhibitorId,
                eventId: eventId
            },
            include: { items: true }
        });

        if (allocations.length === 0) {
            return { success: true }; // Nothing to delete
        }

        await prisma.$transaction(async (tx) => {
            // 1. Release all tracked items
            for (const alloc of allocations) {
                if (alloc.items.length > 0) {
                    await tx.materialItem.updateMany({
                        where: { activeAllocationId: alloc.id },
                        data: {
                            status: 'Available',
                            activeAllocationId: null
                        }
                    });
                }
            }

            // 2. Delete all allocations
            await tx.materialAllocation.deleteMany({
                where: {
                    exhibitorId: exhibitorId,
                    eventId: eventId
                }
            });
        });

        revalidatePath('/dashboard/allocate-material');
        return { success: true };

    } catch (error) {
        console.error('Error deleting exhibitor material allocations:', error);
        return { success: false, error: 'Failed to delete allocations' };
    }
}

// Delete all electrical allocations for an exhibitor
export async function deleteExhibitorElectricalAllocations(exhibitorId: number, eventId: number) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.electricalAllocation.deleteMany({
            where: {
                exhibitorId: exhibitorId,
                eventId: eventId
            }
        });

        revalidatePath('/dashboard/allocate-electrical');
        return { success: true };

    } catch (error) {
        console.error('Error deleting exhibitor electrical allocations:', error);
        return { success: false, error: 'Failed to delete allocations' };
    }
}
