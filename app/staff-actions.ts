'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { cwd } from 'process';

const staffSchema = z.object({
    eventId: z.coerce.number(),
    name: z.string().min(2, "Name must be at least 2 characters"),
    age: z.coerce.number().min(18, "Age must be at least 18").max(100, "Age must be under 100"),
    dob: z.string(),
    address: z.string().min(5, "Address must be at least 5 characters"),
    contactNo: z.string().min(10, "Contact number must be at least 10 digits"),
    secContact: z.string().optional(),
    adharNumber: z.string().min(12, "Aadhar Number must be at least 12 characters"),
    department: z.string().min(1, "Department is required"),
    userId: z.coerce.number().optional().nullable(),
});

export async function addStaff(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const data = {
            eventId: Number(formData.get('eventId')),
            name: formData.get('name') as string,
            // Calculate age roughly for validation, real calculation happens later
            age: 18,
            dob: formData.get('dob') as string,
            address: formData.get('address') as string,
            contactNo: formData.get('contactNo') as string,
            secContact: formData.get('secContact') as string,
            adharNumber: formData.get('adharNumber') as string,
            department: formData.get('department') as string,
            userId: formData.get('userId') ? Number(formData.get('userId')) : null,
        };

        // Recalculate age properly
        const dobStr = data.dob;
        if (dobStr) {
            const birthDate = new Date(dobStr);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            data.age = calculatedAge;
        }

        const result = staffSchema.safeParse(data);
        if (!result.success) {
            console.error('Validation Error:', result.error);
            // Handle potential API difference in Zod v4 vs v3
            const err = result.error as any;
            const issues = err.issues || err.errors;
            const errorMessages = issues?.map((i: any) => i.message).join(', ') || 'Validation failed';
            return { success: false, error: errorMessages };
        }

        const photo = formData.get('photo') as File | null;
        let photoUrl = '';

        if (photo && photo.size > 0) {
            const buffer = Buffer.from(await photo.arrayBuffer());
            const filename = `${Date.now()}_${photo.name.replace(/\s/g, '_')}`;
            const uploadDir = join(cwd(), 'public', 'uploads', 'staff');
            await mkdir(uploadDir, { recursive: true });
            await writeFile(join(uploadDir, filename), buffer);
            photoUrl = `/uploads/staff/${filename}`;
        }

        const parsed = result.data;

        await prisma.staff.create({
            data: {
                ...parsed,
                dob: new Date(parsed.dob),
                photoUrl: photoUrl || null,
            }
        });

        revalidatePath('/dashboard/staff');
        return { success: true };

    } catch (error: any) {
        console.error('Error adding staff:', error);
        return { success: false, error: error.message || 'Failed to add staff' };
    }
}

export async function getEventStaff(eventId: number) {
    const session = await getSession();
    if (!session) return [];

    return await prisma.staff.findMany({
        where: { eventId },
        include: { user: true },
        orderBy: { name: 'asc' }
    });
}

export async function deleteStaff(staffId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.staff.delete({
            where: { id: staffId }
        });
        revalidatePath('/dashboard/staff');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete staff' };
    }
}

export async function updateStaff(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const id = Number(formData.get('id'));
        if (!id) return { success: false, error: 'Staff ID required' };

        const data = {
            eventId: Number(formData.get('eventId')),
            name: formData.get('name') as string,
            // Calculate age roughly for validation
            age: 18,
            dob: formData.get('dob') as string,
            address: formData.get('address') as string,
            contactNo: formData.get('contactNo') as string,
            secContact: formData.get('secContact') as string || undefined,
            adharNumber: formData.get('adharNumber') as string,
            department: formData.get('department') as string,
        };

        const dobStr = data.dob;
        if (dobStr) {
            const birthDate = new Date(dobStr);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            data.age = calculatedAge;
        }

        const result = staffSchema.omit({ userId: true }).safeParse(data);

        if (!result.success) {
            console.error('Validation Error:', result.error);
            const err = result.error as any;
            const issues = err.issues || err.errors;
            const errorMessages = issues?.map((i: any) => i.message).join(', ') || 'Validation failed';
            return { success: false, error: errorMessages };
        }

        const photo = formData.get('photo') as File | null;
        let photoUrl = undefined;

        if (photo && photo.size > 0) {
            const buffer = Buffer.from(await photo.arrayBuffer());
            const filename = `${Date.now()}_${photo.name.replace(/\s/g, '_')}`;
            const uploadDir = join(cwd(), 'public', 'uploads', 'staff');
            await mkdir(uploadDir, { recursive: true });
            await writeFile(join(uploadDir, filename), buffer);
            photoUrl = `/uploads/staff/${filename}`;
        }

        const parsed = result.data;

        await prisma.staff.update({
            where: { id },
            data: {
                ...parsed,
                dob: new Date(parsed.dob),
                ...(photoUrl && { photoUrl }),
            }
        });

        revalidatePath('/dashboard/staff');
        return { success: true };

    } catch (error: any) {
        console.error('Error updating staff:', error);
        return { success: false, error: error.message || 'Failed to update staff' };
    }
}
