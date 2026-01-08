'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const bulkAddSchema = z.object({
    materialId: z.number(),
    quantity: z.number().min(1).max(100),
    prefix: z.string().optional(),
});

export async function addBulkMaterialItems(data: {
    materialId: number;
    quantity: number;
    prefix?: string;
}) {
    console.log('Server Action: addBulkMaterialItems called', data);
    try {
        const validated = bulkAddSchema.parse(data);
        const material = await prisma.material.findUnique({
            where: { id: validated.materialId },
        });

        if (!material) {
            console.error('Material not found for id:', validated.materialId);
            return { success: false, error: 'Material not found' };
        }

        const prefix = validated.prefix || `MAT-${material.name.substring(0, 3).toUpperCase()}-`;
        console.log('Using prefix:', prefix);

        // Fetch existing codes to find the highest serial number for this prefix
        const existingItems = await prisma.materialItem.findMany({
            where: {
                materialId: validated.materialId,
                uniqueCode: {
                    startsWith: prefix
                }
            },
            select: { uniqueCode: true }
        });
        console.log(`Found ${existingItems.length} existing items with prefix ${prefix}`);

        let maxSerial = 0;
        existingItems.forEach(item => {
            const part = item.uniqueCode.replace(prefix, '');
            const num = parseInt(part);
            if (!isNaN(num) && num > maxSerial) {
                maxSerial = num;
            }
        });
        console.log('Calculated maxSerial:', maxSerial);

        const newItems = [];
        for (let i = 1; i <= validated.quantity; i++) {
            const serialNumber = (maxSerial + i).toString().padStart(3, '0');
            newItems.push({
                materialId: validated.materialId,
                uniqueCode: `${prefix}${serialNumber}`,
                status: 'Available',
            });
        }

        if (newItems.length > 0) {
            console.log(`Generated ${newItems.length} items. First: ${newItems[0].uniqueCode}, Last: ${newItems[newItems.length - 1].uniqueCode}`);
        } else {
            console.log('No new items generated?');
        }

        const createResult = await prisma.materialItem.createMany({
            data: newItems,
        });
        console.log('createMany result:', createResult);

        revalidatePath('/dashboard/settings/materials');
        return { success: true, count: newItems.length };
    } catch (error: any) {
        console.error('Failed to add bulk items detailed error:', error);
        // Return duplicate error nicely
        if (error.code === 'P2002') {
            return { success: false, error: 'Duplicate codes generated. Please try a different prefix or quantity.' };
        }
        return { success: false, error: error.message || 'Failed to create items' };
    }
}

export async function getMaterialItems(materialId: number) {
    try {
        const items = await prisma.materialItem.findMany({
            where: { materialId },
            orderBy: { id: 'desc' },
        });
        return items;
    } catch (error) {
        console.error('Failed to fetch material items:', error);
        return [];
    }
}

// RESTORED TICKET ACTIONS

export async function addInventory(data: {
    eventId: number;
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    price: number;
    category: string;
    splitSize?: number; // Optional split size
}) {
    try {
        const chunks = [];
        let currentStart = data.startNumber;
        const splitSize = data.splitSize || 1000; // Default to 1000 if not provided

        while (currentStart <= data.endNumber) {
            // Calculate end of current chunk
            // If splitSize is 100, Start 1 -> End 100 (1 + 100 - 1)
            // But we must handle "Boundaries" for 1000s if splitSize is 1000 (legacy)
            // Simpler logic: purely size based? 
            // The previous logic was boundary-aligned (1001-2000). 
            // If we want strict 100 size: 1-100, 101-200.

            // Let's use simple size addition but respect endNumber
            let chunkEnd = currentStart + splitSize - 1;

            // If using default 1000, keep legacy boundary logic to align nice numbers?
            // "The next 1000s boundary": (Math.floor((currentStart - 1) / 1000) + 1) * 1000
            // If the user explicitly asks for splitSize (e.g. 100), we should just add 100.
            // But usually printed books align to 1-100, 101-200.
            // If Start is 5, split 100 -> 5 to 104? Or 5 to 100?
            // Usually tickets are strictly numbered. 1-100.
            // Let's trust pure addition for custom sizes, satisfying the "Bundle Size" request.

            if (!data.splitSize) {
                // Legacy 1000 alignment
                const nextBoundary = (Math.floor((currentStart - 1) / 1000) + 1) * 1000;
                chunkEnd = Math.min(nextBoundary, data.endNumber);
            } else {
                // Strict size limit, but clamp to endNumber
                chunkEnd = Math.min(chunkEnd, data.endNumber);
            }

            chunks.push({
                start: currentStart,
                end: chunkEnd
            });

            currentStart = chunkEnd + 1;
        }

        console.log(`Adding Inventory: ${data.startNumber}-${data.endNumber} (${data.endNumber - data.startNumber + 1} tickets). SplitSize: ${splitSize}. Created ${chunks.length} chunks.`);

        await prisma.$transaction(
            chunks.map(chunk =>
                prisma.ticketInventory.create({
                    data: {
                        eventId: data.eventId,
                        seriesLabel: data.seriesLabel,
                        startNumber: chunk.start,
                        endNumber: chunk.end,
                        currentNumber: chunk.start,
                        price: data.price,
                        category: data.category,
                        status: 'Available',
                    } as any,
                })
            )
        );

        revalidatePath('/dashboard/settings/inventory');
        return { success: true };
    } catch (error) {
        console.error('Failed to add inventory:', error);
        return { success: false, error: 'Failed to add inventory' };
    }
}

export async function getInventory(eventId: number) {
    try {
        const inventory = await prisma.ticketInventory.findMany({
            where: { eventId },
            orderBy: { id: 'desc' },
        });
        return inventory;
    } catch (error) {
        console.error('Failed to fetch inventory:', error);
        return [];
    }
}

export async function deleteMaterialItem(id: number) {
    try {
        await prisma.materialItem.delete({
            where: { id },
        });
        revalidatePath('/dashboard/settings/materials');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete material item:', error);
        return { success: false, error: 'Failed to delete item' };
    }
}

export async function deleteInventory(id: number) {
    try {
        // Check for dependencies (Staff Assignments)
        const assignmentCount = await prisma.staffTicketAssignment.count({
            where: { ticketInventoryId: id }
        });

        if (assignmentCount > 0) {
            return {
                success: false,
                error: `Cannot delete: This inventory has been used for ${assignmentCount} staff assignment(s).`
            };
        }

        await prisma.ticketInventory.delete({
            where: { id },
        });
        revalidatePath('/dashboard/settings/inventory');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete inventory:', error);

        // Handle specific Prisma FK error code
        if (error.code === 'P2003') {
            return { success: false, error: 'Cannot delete: This inventory is referenced by other records.' };
        }

        return { success: false, error: 'Failed to delete inventory' };
    }
}

export async function updateInventory(id: number, data: {
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    price: number;
    category: string;
}) {
    try {
        // We might want to recalc currentNumber if startNumber changes, but usually edits are for typos.
        // For safety, if startNumber changes, reset currentNumber to startNumber IF currentNumber < new startNumber?
        // Or just let user manage. Simple update is best for now.

        await prisma.ticketInventory.update({
            where: { id },
            data: {
                seriesLabel: data.seriesLabel,
                startNumber: data.startNumber,
                endNumber: data.endNumber,
                price: data.price,
                category: data.category,
            } as any, // Cast to any to bypass stale types
        });
        revalidatePath('/dashboard/settings/inventory');
        return { success: true };
    } catch (error) {
        console.error('Failed to update inventory:', error);
        return { success: false, error: 'Failed to update inventory' };
    }
}
