'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createMaterialSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string(),
    price: z.number().min(0, "Price must be 0 or greater"),
    unit: z.string().min(1, "Unit is required"),
});

export async function createMaterial(data: z.infer<typeof createMaterialSchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = createMaterialSchema.parse(data);

        await prisma.material.create({
            data: {
                name: parsed.name,
                description: parsed.description,
                price: parsed.price,
                unit: parsed.unit,
            }
        });

        revalidatePath('/dashboard/settings/materials');
        return { success: true };
    } catch (error) {
        console.error('Error creating material:', error);
        return { success: false, error: 'Failed to create material' };
    }
}

export async function getMaterials() {
    const session = await getSession();

    if (!session) {
        return [];
    }

    return await prisma.material.findMany({
        orderBy: {
            name: 'asc'
        },
        include: {
            items: {
                select: {
                    status: true
                }
            }
        }
    });

}


export async function updateMaterial(id: number, data: z.infer<typeof createMaterialSchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = createMaterialSchema.parse(data);

        await prisma.material.update({
            where: { id },
            data: {
                name: parsed.name,
                description: parsed.description,
                price: parsed.price,
                unit: parsed.unit,
            }
        });

        revalidatePath('/dashboard/settings/materials');
        return { success: true };
    } catch (error) {
        console.error('Error updating material:', error);
        return { success: false, error: 'Failed to update material' };
    }
}

export async function deleteMaterial(id: number) {
    console.log('Server Action: deleteMaterial called for id:', id);
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        console.log('Server Action: Unauthorized');
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const allocationCount = await prisma.materialAllocation.count({
            where: { materialId: id }
        });
        console.log('Allocation count:', allocationCount);

        const inventoryCount = await prisma.materialItem.count({
            where: { materialId: id }
        });
        console.log('Inventory count:', inventoryCount);

        if (allocationCount > 0) {
            return { success: false, error: 'Cannot delete: Material is allocated to exhibitors.' };
        }

        if (inventoryCount > 0) {
            return { success: false, error: 'Cannot delete: Material has inventory items.' };
        }

        await prisma.material.delete({
            where: { id }
        });
        console.log('Material deleted successfully');

        revalidatePath('/dashboard/settings/materials');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting material:', error);
        // Return the actual error message for debugging
        return { success: false, error: error.message || 'Failed to delete material' };
    }
}

const createElectricalItemSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string(),
    price: z.number().min(0, "Price must be 0 or greater"),
    wattage: z.number().min(0, "Wattage must be 0 or greater"),
});

export async function createElectricalItem(data: z.infer<typeof createElectricalItemSchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = createElectricalItemSchema.parse(data);

        await prisma.electricalItem.create({
            data: {
                name: parsed.name,
                description: parsed.description,
                price: parsed.price,
                wattage: parsed.wattage,
            }
        });

        revalidatePath('/dashboard/settings/electrical');
        return { success: true };
    } catch (error) {
        console.error('Error creating electrical item:', error);
        return { success: false, error: 'Failed to create electrical item' };
    }
}

export async function getElectricalItems() {
    const session = await getSession();

    if (!session) {
        return [];
    }

    return await prisma.electricalItem.findMany({
        orderBy: {
            name: 'asc'
        }
    });
}

const createShedSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string(),
    dimensions: z.string().min(1, "Dimensions are required"),
    price: z.number().min(0, "Price must be 0 or greater"),
});

export async function createShed(data: z.infer<typeof createShedSchema>) {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = createShedSchema.parse(data);

        await prisma.shed.create({
            data: {
                name: parsed.name,
                description: parsed.description,
                dimensions: parsed.dimensions,
                price: parsed.price,
            }
        });

        revalidatePath('/dashboard/settings/sheds');
        return { success: true };
    } catch (error) {
        console.error('Error creating shed:', error);
        return { success: false, error: 'Failed to create shed' };
    }
}

export async function getSheds() {
    const session = await getSession();

    if (!session) {
        return [];
    }

    return await prisma.shed.findMany({
        orderBy: {
            name: 'asc'
        }
    });
}
