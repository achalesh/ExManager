'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const recordPaymentSchema = z.object({
    exhibitorId: z.number().min(1, "Exhibitor is required"),
    eventId: z.number().min(1, "Event is required"),
    amount: z.number().min(1, "Amount must be positive"),
    paymentMethod: z.string().min(1, "Method is required"),
    receiptNumber: z.string().min(1, "Receipt number is required"),
    category: z.string().min(1, "Category is required"),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
    date: z.string().optional(), // ISO Date string
});

export async function recordPayment(data: z.infer<typeof recordPaymentSchema>) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const parsed = recordPaymentSchema.parse(data);

        // Check for duplicate receipt number - DISABLED to allow splits
        // const existing = await prisma.payment.findFirst({
        //     where: {
        //         receiptNumber: parsed.receiptNumber,
        //     }
        // });

        // if (existing) {
        //     return { success: false, error: `Receipt Number ${parsed.receiptNumber} already exists.` };
        // }

        const payment = await prisma.payment.create({
            data: {
                exhibitorId: parsed.exhibitorId,
                amount: parsed.amount,
                paymentMethod: parsed.paymentMethod,
                receiptNumber: parsed.receiptNumber,
                category: parsed.category,
                referenceNumber: parsed.referenceNumber,
                notes: parsed.notes,
                paymentDate: parsed.date ? new Date(parsed.date) : new Date(),
                collectedBy: session.name || 'Admin',
            } as any
        });

        // Fetch details for receipt
        const event = await prisma.event.findUnique({ where: { id: parsed.eventId } });
        const exhibitor = await prisma.exhibitor.findUnique({
            where: { id: parsed.exhibitorId },
            include: {
                bookings: {
                    where: { eventId: parsed.eventId },
                    include: { space: true }
                }
            }
        });

        revalidatePath(`/dashboard/billing/${parsed.exhibitorId}`);
        return { success: true, data: { ...payment, event, exhibitor } };
    } catch (error) {
        console.error('Error recording payment:', error);
        return { success: false, error: 'Failed to record payment' };
    }
}

export async function getNextReceiptNumber() {
    // Find the latest payment and increment
    try {
        const lastPayment = await prisma.payment.findFirst({
            orderBy: { id: 'desc' },
            select: { receiptNumber: true }
        });

        if (!lastPayment) return "RPC-1001";

        // Attempt to parse number
        const match = lastPayment.receiptNumber.match(/(\d+)$/);
        if (match) {
            const num = parseInt(match[1]);
            const nextNum = num + 1;
            const prefix = lastPayment.receiptNumber.replace(/(\d+)$/, '');
            return `${prefix}${nextNum}`; // Keep padding? match[1] has padding.
            // Better:
            // const padded = nextNum.toString().padStart(match[1].length, '0');
            // return `${prefix}${padded}`;
        }

        return "RPC-1001"; // Fallback
    } catch (e) {
        return "RPC-1001";
    }
}

import { createApprovalRequest } from './approval-actions';

export async function deletePayment(id: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    // Role Enforcement
    if (session.roleName !== 'Admin') {
        if (session.roleName === 'Accounts' || session.roleName === 'Accountant') {
            return { success: false, error: 'Accounts role is not authorized to delete payments.' };
        }
        if (session.roleName === 'Manager') {
            // Manager delete -> Approval
            return await createApprovalRequest('DELETE', 'Payment', id.toString(), { id }, 'Manager requested delete');
        }
    }

    try {
        const payment = await prisma.payment.findUnique({ where: { id } });
        await prisma.payment.delete({ where: { id } });
        if (payment) {
            revalidatePath(`/dashboard/billing/${payment.exhibitorId}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Delete payment error:', error);
        return { success: false, error: 'Failed to delete payment' };
    }
}

// Batch operations for Receipts
export async function deletePaymentReceipt(receiptNumber: string) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    // Role Enforcement
    if (session.roleName !== 'Admin') {
        if (session.roleName === 'Accounts' || session.roleName === 'Accountant') {
            return { success: false, error: 'Accounts role is not authorized to delete receipts.' };
        }
        if (session.roleName === 'Manager') {
            return await createApprovalRequest('DELETE', 'Payment', receiptNumber, { receiptNumber }, 'Manager requested receipt delete');
        }
    }

    try {
        const payments = await prisma.payment.findMany({ where: { receiptNumber } });
        if (payments.length > 0) {
            await prisma.payment.deleteMany({ where: { receiptNumber } });
            revalidatePath(`/dashboard/billing/${payments[0].exhibitorId}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Delete receipt error:', error);
        return { success: false, error: 'Failed to delete receipt' };
    }
}

export async function updatePaymentReceipt(data: {
    receiptNumber: string,
    date?: Date | string,
    notes?: string,
    category?: string,
    amount?: number,       // Added for singular updates
    paymentMethod?: string // Added for singular updates
}) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    // Role Enforcement
    if (session.roleName !== 'Admin') {
        // Manager & Accounts -> Approval for Update
        // Use receiptNumber as key
        return await createApprovalRequest('UPDATE', 'Payment', data.receiptNumber, data, `${session.roleName} requested receipt update`);
    }

    try {
        const updateData: any = {
            notes: data.notes,
            category: data.category,
            collectedBy: (session.name || 'Admin') + ' (Edit)',
        };

        if (data.date) updateData.paymentDate = new Date(data.date);
        if (data.amount) updateData.amount = data.amount;
        if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;

        // Find exhibitor first for revalidation
        const payment = await prisma.payment.findFirst({ where: { receiptNumber: data.receiptNumber } });

        await prisma.payment.updateMany({
            where: { receiptNumber: data.receiptNumber },
            data: updateData
        });

        if (payment) {
            revalidatePath(`/dashboard/billing/${payment.exhibitorId}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Update receipt error:', error);
        return { success: false, error: 'Failed to update receipt' };
    }
}

export async function updatePayment(id: number, data: { amount?: number, paymentMethod?: string, notes?: string, category?: string, paymentDate?: Date | string }) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    // Role Enforcement
    if (session.roleName !== 'Admin') {
        return await createApprovalRequest('UPDATE', 'Payment', id.toString(), data, `${session.roleName} requested payment update`);
    }

    try {
        const updateData: any = {
            ...data,
            collectedBy: (session.name || 'Admin') + ' (Edit)',
        };

        if (data.paymentDate) {
            updateData.paymentDate = new Date(data.paymentDate);
        }

        const payment = await prisma.payment.update({
            where: { id },
            data: updateData
        });
        revalidatePath(`/dashboard/billing/${payment.exhibitorId}`);
        return { success: true };
    } catch (error) {
        console.error('Update payment error:', error);
        return { success: false, error: 'Failed to update payment' };
    }
}
