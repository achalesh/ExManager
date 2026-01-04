'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const upiMachineSchema = z.object({
    name: z.string().min(1, "Name is required"),
    provider: z.string().min(1, "Provider is required"),
    terminalId: z.string().optional(),
    merchantId: z.string().optional(),
    isCompanyOwned: z.boolean().default(true),
    amusementOwnerId: z.coerce.number().optional().nullable(),
});

export async function getUPIMachines() {
    try {
        const machines = await prisma.uPIMachine.findMany({
            include: {
                amusementOwner: true
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: machines };
    } catch (error) {
        console.error('Error fetching UPI machines:', error);
        return { success: false, error: 'Failed to fetch machines' };
    }
}

export async function createUPIMachine(data: z.infer<typeof upiMachineSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = upiMachineSchema.parse(data);

        await prisma.uPIMachine.create({
            data: {
                ...parsed,
                amusementOwnerId: parsed.isCompanyOwned ? null : parsed.amusementOwnerId
            }
        });

        revalidatePath('/dashboard/settings/machines');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to create machine' };
    }
}

export async function updateUPIMachine(id: number, data: z.infer<typeof upiMachineSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = upiMachineSchema.parse(data);

        await prisma.uPIMachine.update({
            where: { id },
            data: {
                ...parsed,
                amusementOwnerId: parsed.isCompanyOwned ? null : parsed.amusementOwnerId
            }
        });

        revalidatePath('/dashboard/settings/machines');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update machine' };
    }
}

export async function deleteUPIMachine(id: number) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Check usage
        const linkedTickets = await prisma.ticketType.count({
            where: { upiMachineId: id }
        });
        if (linkedTickets > 0) return { success: false, error: 'Machine is assigned to ticket items' };

        await prisma.uPIMachine.delete({ where: { id } });

        revalidatePath('/dashboard/settings/machines');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete machine' };
    }
}

// --- Bulk Assignment Actions ---

export async function getAllTicketTypesWithMachine() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const tickets = await prisma.ticketType.findMany({
            where: {
                // Fetch valid tickets. Could filter by active event if needed, but "Settings" usually implies global config.
                // Assuming we want to configure current Active Event's tickets or all?
                // For now, fetching all seems risky if there are old events. 
                // Better to fetch for *active* or *upcoming* events, or just all and let the UI filter/group.
                // Let's fetch all for simplicity in settings, or maybe filter by status if Event has status.
                event: {
                    status: { in: ['Upcoming', 'Ongoing'] }
                }
            },
            include: {
                upiMachine: true,
                event: {
                    select: { name: true }
                }
            },
            orderBy: [
                { eventId: 'desc' },
                { name: 'asc' }
            ]
        });
        return { success: true, data: tickets };
    } catch (error) {
        console.error('Error fetching ticket types:', error);
        return { success: false, error: 'Failed to fetch tickets' };
    }
}

export async function updateTicketMachineAssignment(ticketTypeId: number, upiMachineId: number | null) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.ticketType.update({
            where: { id: ticketTypeId },
            data: {
                upiMachineId: upiMachineId
            }
        });
        revalidatePath('/dashboard/settings/machines');
        return { success: true };
    } catch (error) {
        console.error('Error updating ticket machine:', error);
        return { success: false, error: 'Failed to update assignment' };
    }
}
