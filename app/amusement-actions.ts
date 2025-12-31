'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Validation Schemas ---

const ownerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    contactNumber: z.string().optional(),
});

// --- Actions ---

export async function getAmusementOwners() {
    try {
        const owners = await prisma.amusementOwner.findMany({
            orderBy: { name: 'asc' },
            include: {
                ticketTypes: true // Include linked tickets to show count or details
            }
        });
        return { success: true, data: owners };
    } catch (error) {
        console.error('Error fetching amusement owners:', error);
        return { success: false, error: 'Failed to fetch owners' };
    }
}

export async function createAmusementOwner(data: z.infer<typeof ownerSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    const result = ownerSchema.safeParse(data);
    if (!result.success) {
        return { success: false, error: result.error.issues[0].message };
    }

    try {
        const owner = await prisma.amusementOwner.create({
            data: result.data
        });
        revalidatePath('/dashboard/amusements'); // Assuming this will be the path
        return { success: true, data: owner };
    } catch (error) {
        console.error('Error creating amusement owner:', error);
        return { success: false, error: 'Failed to create owner' };
    }
}

export async function updateAmusementOwner(id: number, data: z.infer<typeof ownerSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    const result = ownerSchema.safeParse(data);
    if (!result.success) {
        return { success: false, error: result.error.issues[0].message };
    }

    try {
        const owner = await prisma.amusementOwner.update({
            where: { id },
            data: result.data
        });
        revalidatePath('/dashboard/amusements');
        return { success: true, data: owner };
    } catch (error) {
        console.error('Error updating amusement owner:', error);
        return { success: false, error: 'Failed to update owner' };
    }
}

export async function deleteAmusementOwner(id: number) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Check for linked ticket types
        const linkedTickets = await prisma.ticketType.count({
            where: { amusementOwnerId: id }
        });

        if (linkedTickets > 0) {
            return { success: false, error: `Cannot delete owner. Linked to ${linkedTickets} ticket types.` };
        }

        await prisma.amusementOwner.delete({
            where: { id }
        });
        revalidatePath('/dashboard/amusements');
        return { success: true };
    } catch (error) {
        console.error('Error deleting amusement owner:', error);
        return { success: false, error: 'Failed to delete owner' };
    }
}

// --- Reporting ---

export async function getRevenueShareReport(eventId: number) {
    // Determine the report range or scope? For now, fetch ALL sales for linked tickets
    // Optimization: Depending on data volume, raw query might be better, but prisma aggregate is cleaner for now.

    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Fetch all Amusement Owners with their linked Ticket Types
        const owners = await prisma.amusementOwner.findMany({
            include: {
                ticketTypes: {
                    where: { eventId: eventId },
                    include: {
                        // We need sales data.
                        // TicketSaleItem links to TicketType.
                        // Use aggregation on saleItems if possible?
                        // Or select saleItems to calculate.
                        saleItems: {
                            select: {
                                price: true // The price it was sold at
                            }
                        }
                    }
                }
            }
        });

        const report = owners.map((owner: any) => {
            const rides = owner.ticketTypes.map((ride: any) => {
                const totalSales = ride.saleItems.reduce((sum: number, item: any) => sum + item.price, 0);
                const quantitySold = ride.saleItems.length;
                const shareAmount = (totalSales * ride.ownerSharePercentage) / 100;

                return {
                    id: ride.id,
                    name: ride.name,
                    quantitySold,
                    totalSales,
                    sharePercentage: ride.ownerSharePercentage,
                    shareAmount
                };
            });

            const totalOwnerShare = rides.reduce((sum: number, ride: any) => sum + ride.shareAmount, 0);
            const totalGross = rides.reduce((sum: number, ride: any) => sum + ride.totalSales, 0);

            return {
                ownerId: owner.id,
                ownerName: owner.name,
                ownerContact: owner.contactNumber,
                rides,
                totalGross,
                totalOwnerShare
            };
        });

        return { success: true, data: report };
    } catch (error) {
        console.error('Error generating revenue share report:', error);
        return { success: false, error: 'Failed to generate report' };
    }
}
