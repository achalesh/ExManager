'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Space Category Actions
const createSpaceCategorySchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    price: z.number().min(0, "Price must be 0 or greater"),
    shape: z.string().min(1, "Shape is required"),
    dimensions: z.string().min(1, "Dimensions are required"),
});

export async function createSpaceCategory(data: z.infer<typeof createSpaceCategorySchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = createSpaceCategorySchema.parse(data);

        await prisma.spaceCategory.create({
            data: {
                name: parsed.name,
                price: parsed.price,
                shape: parsed.shape,
                dimensions: parsed.dimensions,
            }
        });

        revalidatePath('/dashboard/settings/spaces');
        return { success: true };
    } catch (error) {
        console.error('Error creating space category:', error);
        return { success: false, error: 'Failed to create space category' };
    }
}

const updateSpaceCategorySchema = z.object({
    id: z.number(),
    name: z.string().min(2, "Name must be at least 2 characters"),
    price: z.number().min(0, "Price must be 0 or greater"),
    shape: z.string().min(1, "Shape is required"),
    dimensions: z.string().min(1, "Dimensions are required"),
});

export async function updateSpaceCategory(data: z.infer<typeof updateSpaceCategorySchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = updateSpaceCategorySchema.parse(data);

        await prisma.spaceCategory.update({
            where: { id: parsed.id },
            data: {
                name: parsed.name,
                price: parsed.price,
                shape: parsed.shape,
                dimensions: parsed.dimensions,
            }
        });

        revalidatePath('/dashboard/settings/spaces');
        return { success: true };
    } catch (error) {
        console.error('Error updating space category:', error);
        return { success: false, error: 'Failed to update space category' };
    }
}

export async function deleteSpaceCategory(id: number) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Check for existing spaces
        const spacesCount = await prisma.space.count({
            where: { categoryId: id }
        });

        if (spacesCount > 0) {
            return { success: false, error: `Cannot delete category. It has ${spacesCount} associated spaces.` };
        }

        await prisma.spaceCategory.delete({
            where: { id }
        });

        revalidatePath('/dashboard/settings/spaces');
        return { success: true };
    } catch (error) {
        console.error('Error deleting space category:', error);
        return { success: false, error: 'Failed to delete space category' };
    }
}

export async function getSpaceCategories() {
    const session = await getSession();

    if (!session) {
        return [];
    }

    return await prisma.spaceCategory.findMany({
        include: {
            _count: {
                select: { spaces: true }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });
}

// Space Actions
const createSpaceSchema = z.object({
    label: z.string().min(1, "Label is required"),
    categoryId: z.number().min(1, "Category is required"),
    eventId: z.number().min(1, "Event is required"),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
});

export async function createSpace(data: z.infer<typeof createSpaceSchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = createSpaceSchema.parse(data);

        await prisma.space.create({
            data: {
                label: parsed.label,
                categoryId: parsed.categoryId,
                eventId: parsed.eventId,
                positionX: parsed.positionX,
                positionY: parsed.positionY,
                status: 'Available',
            }
        });

        revalidatePath('/dashboard/settings/spaces');
        revalidatePath('/dashboard/allocate-space');
        return { success: true };
    } catch (error) {
        console.error('Error creating space:', error);
        return { success: false, error: 'Failed to create space' };
    }
}

const bulkCreateSpacesSchema = z.object({
    prefix: z.string().min(1, "Prefix is required"),
    startNumber: z.number().min(1, "Start number must be at least 1"),
    count: z.number().min(1, "Count must be at least 1").max(100, "Maximum 100 spaces at once"),
    categoryId: z.number().min(1, "Category is required"),
    eventId: z.number().min(1, "Event is required"),
});

export async function bulkCreateSpaces(data: z.infer<typeof bulkCreateSpacesSchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = bulkCreateSpacesSchema.parse(data);

        const spaces = [];
        for (let i = 0; i < parsed.count; i++) {
            const number = parsed.startNumber + i;
            const label = `${parsed.prefix}${number.toString().padStart(2, '0')}`;
            spaces.push({
                label,
                categoryId: parsed.categoryId,
                eventId: parsed.eventId,
                status: 'Available',
            });
        }

        await prisma.space.createMany({
            data: spaces
        });

        revalidatePath('/dashboard/settings/spaces');
        revalidatePath('/dashboard/allocate-space');
        return { success: true, count: spaces.length };
    } catch (error) {
        console.error('Error bulk creating spaces:', error);
        return { success: false, error: 'Failed to create spaces' };
    }
}

export async function getSpaces(eventId?: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const activeEventId = eventId || session.activeEventId;

    if (!activeEventId) {
        return [];
    }

    return await prisma.space.findMany({
        where: {
            eventId: activeEventId
        },
        include: {
            category: true,
            bookings: {
                include: {
                    exhibitor: true
                }
            }
        },
        orderBy: {
            label: 'asc'
        }
    });
}

export async function updateSpacePosition(spaceId: number, positionX: number, positionY: number) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.space.update({
            where: { id: spaceId },
            data: {
                positionX,
                positionY
            }
        });

        revalidatePath('/dashboard/allocate-space');
        return { success: true };
    } catch (error) {
        console.error('Error updating space position:', error);
        return { success: false, error: 'Failed to update position' };
    }
}

export async function getAvailableSpaces(eventId?: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const activeEventId = eventId || session.activeEventId;

    if (!activeEventId) {
        return [];
    }

    return await prisma.space.findMany({
        where: {
            eventId: activeEventId,
            status: 'Available'
        },
        include: {
            category: true
        },
        orderBy: {
            label: 'asc'
        }
    });
}

const updateSpaceSchema = z.object({
    id: z.number(),
    label: z.string().min(1, "Label is required"),
    categoryId: z.number().min(1, "Category is required"),
    status: z.enum(['Available', 'Booked', 'Reserved']),
});

export async function updateSpace(data: z.infer<typeof updateSpaceSchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = updateSpaceSchema.parse(data);

        await prisma.space.update({
            where: { id: parsed.id },
            data: {
                label: parsed.label,
                categoryId: parsed.categoryId,
                status: parsed.status,
            }
        });

        revalidatePath('/dashboard/settings/spaces');
        revalidatePath('/dashboard/allocate-space');
        return { success: true };
    } catch (error) {
        console.error('Error updating space:', error);
        return { success: false, error: 'Failed to update space' };
    }
}

export async function deleteSpace(id: number) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const space = await prisma.space.findUnique({
            where: { id },
            include: { bookings: true }
        });

        if (!space) {
            return { success: false, error: "Space not found" };
        }

        if (space.status === 'Booked' || space.bookings.length > 0) {
            return { success: false, error: "Cannot delete a booked space. Please cancel the booking first." };
        }

        await prisma.space.delete({
            where: { id }
        });

        revalidatePath('/dashboard/settings/spaces');
        revalidatePath('/dashboard/allocate-space');
        return { success: true };
    } catch (error) {
        console.error('Error deleting space:', error);
        return { success: false, error: 'Failed to delete space' };
    }
}
