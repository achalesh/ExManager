'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Create a new approval request
export async function createApprovalRequest(
    type: 'UPDATE' | 'DELETE',
    resource: string,           // 'Payment', 'Booking'
    resourceId: string,
    data: any,
    reason?: string
) {
    const session = await getSession();
    if (!session?.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.approvalRequest.create({
            data: {
                type,
                resource,
                resourceId: resourceId.toString(),
                data: JSON.stringify(data),
                reason,
                requestedBy: session.userId,
                status: 'PENDING'
            }
        });

        // Revalidate admin approvals page (even if it doesn't exist yet, good practice)
        revalidatePath('/dashboard/admin/approvals');
        return { success: true, message: 'Request sent for approval' };
    } catch (error) {
        console.error('Create approval error:', error);
        return { success: false, error: 'Failed to create approval request' };
    }
}

// Get all pending requests (for Admin)
export async function getPendingRequests() {
    const session = await getSession();
    // Strict Admin check
    if (session?.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const requests = await prisma.approvalRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                requester: {
                    select: { name: true, email: true, role: { select: { name: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: requests };
    } catch (error) {
        console.error('Get approvals error:', error);
        return { success: false, error: 'Failed to fetch requests' };
    }
}

// Approve a request
export async function approveRequest(requestId: number) {
    const session = await getSession();
    const adminId = session?.userId || 0;

    // START TRANSACTION
    // 1. Get Request
    // 2. Execute Action (Update/Delete)
    // 3. Mark Request Approved

    try {
        const request = await prisma.approvalRequest.findUnique({
            where: { id: requestId }
        });

        if (!request || request.status !== 'PENDING') {
            return { success: false, error: 'Invalid request' };
        }

        const data = JSON.parse(request.data);

        await prisma.$transaction(async (tx) => {
            // EXECUTE ACTION based on Resource and Type
            if (request.resource === 'Payment') {
                if (request.type === 'DELETE') {
                    // For Receipts, we might need special handling if ID is receiptNumber
                    // The request.resourceId should ideally be the receiptNumber if we are doing batch delete
                    // OR simple ID if single payment.
                    // Based on previous work, we consolidated to Receipts. 
                    // Let's assume resourceId IS the receiptNumber for PaymentReceipt resource.
                    await tx.payment.deleteMany({
                        where: { receiptNumber: request.resourceId }
                    });
                } else if (request.type === 'UPDATE') {
                    // Start simple: Update fields.
                    // If data contains receiptNumber check for uniqueness?
                    // data: { paymentDate, ... }
                    await tx.payment.updateMany({
                        where: { receiptNumber: request.resourceId },
                        data: {
                            // Only update allowed fields from common data
                            paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
                            notes: data.notes,
                            category: data.category,
                            // If receipt number change requested?
                            // receiptNumber: data.receiptNumber 
                        }
                    });
                }
            }
            // Add other resources here (Booking, etc)

            // Mark Approved
            await tx.approvalRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    reviewedBy: adminId
                }
            });
        });

        revalidatePath('/dashboard/admin/approvals');
        return { success: true };
    } catch (error) {
        console.error('Approve error:', error);
        return { success: false, error: 'Failed to approve request' };
    }
}

// Reject
export async function rejectRequest(requestId: number) {
    const session = await getSession();
    const adminId = session?.userId || 0;

    try {
        await prisma.approvalRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                reviewedBy: adminId
            }
        });
        revalidatePath('/dashboard/admin/approvals');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to reject' };
    }
}
