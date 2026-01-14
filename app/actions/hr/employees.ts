'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { cwd } from 'process';
import { employeeSchema } from './schemas';

export async function addEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const data = {
            eventId: Number(formData.get('eventId')),
            name: formData.get('name') as string,
            age: 18, // Recalculated below
            dob: formData.get('dob') as string,
            address: formData.get('address') as string,
            contactNo: formData.get('contactNo') as string,
            secContact: formData.get('secContact') as string,
            adharNumber: formData.get('adharNumber') as string,
            department: formData.get('department') as string,
            userId: formData.get('userId') ? Number(formData.get('userId')) : null,
            salaryAmount: Number(formData.get('salaryAmount') || 0),
            salaryFrequency: formData.get('salaryFrequency') as string || 'Monthly',
            status: 'Active',
            joiningDate: formData.get('joiningDate') as string || null,
            endDate: formData.get('endDate') as string || null,
        };

        // Recalculate age
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

        const result = employeeSchema.safeParse(data);
        if (!result.success) {
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
                eventId: parsed.eventId,
                name: parsed.name,
                age: parsed.age,
                dob: new Date(parsed.dob),
                address: parsed.address,
                contactNo: parsed.contactNo,
                secContact: parsed.secContact || null,
                adharNumber: parsed.adharNumber,
                department: parsed.department,
                userId: parsed.userId,
                photoUrl: photoUrl || null,
                salaryAmount: parsed.salaryAmount,
                salaryFrequency: parsed.salaryFrequency,
                status: parsed.status,
                joiningDate: parsed.joiningDate ? new Date(parsed.joiningDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null
            }
        });

        revalidatePath('/dashboard/hr/employees');
        return { success: true };

    } catch (error: any) {
        console.error('Error adding employee:', error);
        return { success: false, error: error.message || 'Failed to add employee' };
    }
}

export async function getEmployees(eventId: number) {
    const session = await getSession();
    if (!session) return [];

    return await prisma.staff.findMany({
        where: { eventId },
        include: { user: true },
        orderBy: { name: 'asc' }
    });
}

export async function deleteEmployee(employeeId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.staff.delete({
            where: { id: employeeId }
        });
        revalidatePath('/dashboard/hr/employees');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete employee' };
    }
}

export async function updateEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const id = Number(formData.get('id'));
        if (!id) return { success: false, error: 'Employee ID required' };

        const data = {
            eventId: Number(formData.get('eventId')),
            name: formData.get('name') as string,
            age: 18,
            dob: formData.get('dob') as string,
            address: formData.get('address') as string,
            contactNo: formData.get('contactNo') as string,
            secContact: formData.get('secContact') as string || undefined,
            adharNumber: formData.get('adharNumber') as string,
            department: formData.get('department') as string,
            salaryAmount: Number(formData.get('salaryAmount') || 0),
            salaryFrequency: formData.get('salaryFrequency') as string || 'Monthly',
            status: formData.get('status') as string || 'Active',
            joiningDate: formData.get('joiningDate') as string || null,
            endDate: formData.get('endDate') as string || null,
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

        const result = employeeSchema.omit({ userId: true }).safeParse(data);

        if (!result.success) {
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
                eventId: parsed.eventId,
                name: parsed.name,
                age: parsed.age,
                dob: new Date(parsed.dob),
                address: parsed.address,
                contactNo: parsed.contactNo,
                secContact: parsed.secContact || null,
                adharNumber: parsed.adharNumber,
                department: parsed.department,
                salaryAmount: parsed.salaryAmount,
                salaryFrequency: parsed.salaryFrequency,
                status: parsed.status,
                ...(photoUrl && { photoUrl }),
                joiningDate: parsed.joiningDate ? new Date(parsed.joiningDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null
            }
        });

        revalidatePath('/dashboard/hr/employees');
        return { success: true };

    } catch (error: any) {
        console.error('Error updating employee:', error);
        return { success: false, error: error.message || 'Failed to update employee' };
    }
}
