'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

const updateExhibitorSchema = z.object({
    id: z.coerce.number(),
    name: z.string().min(2),
    faciaName: z.string().optional(),
    productCategory: z.string().optional(),
    idProof: z.string().optional(),
    contact: z.string().min(2),
    phone: z.string().min(10),
    secondaryPhone: z.string().optional(),
    address: z.string().optional(),
    email: z.string().email(),
});

export async function getExhibitors() {
    // Admin/Manager/Office should see this
    const session = await getSession();
    if (!session) return [];

    return await prisma.exhibitor.findMany({
        orderBy: { name: 'asc' },
        include: { bookings: { select: { id: true, space: { select: { label: true } } } } } // Show booked spaces count or labels
    });
}

export async function updateExhibitor(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const data = {
            id: formData.get('id'),
            name: formData.get('name'),
            faciaName: formData.get('faciaName'),
            productCategory: formData.get('productCategory'),
            idProof: formData.get('idProof'),
            contact: formData.get('contact'),
            phone: formData.get('phone'),
            secondaryPhone: formData.get('secondaryPhone'),
            address: formData.get('address'),
            email: formData.get('email'),
        };

        const parsed = updateExhibitorSchema.parse(data);

        await prisma.exhibitor.update({
            where: { id: parsed.id },
            data: {
                name: parsed.name,
                faciaName: parsed.faciaName || '',
                productCategory: parsed.productCategory || '',
                idProof: parsed.idProof || '',
                contact: parsed.contact,
                phone: parsed.phone,
                secondaryPhone: parsed.secondaryPhone || '',
                address: parsed.address || '',
                email: parsed.email,
            }
        });

        revalidatePath('/dashboard/exhibitors');
        revalidatePath('/dashboard/register-exhibitor');
        return { success: true };
    } catch (error) {
        console.error('Error updating exhibitor:', error);
        return { success: false, error: 'Failed to update exhibitor' };
    }
}

export async function deleteExhibitor(id: number) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Check dependencies
        const bookings = await prisma.booking.count({ where: { exhibitorId: id } });
        if (bookings > 0) {
            return { success: false, error: 'Cannot delete exhibitor with existing bookings.' };
        }

        await prisma.exhibitor.delete({ where: { id } });
        revalidatePath('/dashboard/exhibitors');
        revalidatePath('/dashboard/register-exhibitor');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete exhibitor' };
    }
}
