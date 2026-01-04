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
        // Fetch all Amusement Owners with their linked Ticket Shares for this event
        const owners = await prisma.amusementOwner.findMany({
            include: {
                ticketShares: {
                    where: { ticketType: { eventId: eventId } },
                    include: {
                        ticketType: {
                            include: {
                                saleItems: {
                                    select: { price: true }
                                }
                            }
                        }
                    }
                },
                // Also fetch legacy direct links if any exist, for backward compatibility or transition
                ticketTypes: {
                    where: { eventId: eventId, ownerShares: { none: {} } }, // Only those WITHOUT shares defined
                    include: {
                        saleItems: { select: { price: true } }
                    }
                }
            }
        });

        const report = owners.map((owner: any) => {
            const rides: any[] = [];

            // 1. Process New Share Model
            owner.ticketShares.forEach((share: any) => {
                const ride = share.ticketType;
                const totalSales = ride.saleItems.reduce((sum: number, item: any) => sum + item.price, 0);
                const quantitySold = ride.saleItems.length;
                const shareAmount = (totalSales * share.sharePercentage) / 100;

                rides.push({
                    id: ride.id,
                    name: ride.name,
                    quantitySold,
                    totalSales,
                    sharePercentage: share.sharePercentage,
                    shareAmount
                });
            });

            // 2. Process Legacy Direct Links (if any remain that don't have shares)
            owner.ticketTypes.forEach((ride: any) => {
                const totalSales = ride.saleItems.reduce((sum: number, item: any) => sum + item.price, 0);
                const quantitySold = ride.saleItems.length;
                const shareAmount = (totalSales * ride.ownerSharePercentage) / 100;

                rides.push({
                    id: ride.id,
                    name: ride.name,
                    quantitySold,
                    totalSales,
                    sharePercentage: ride.ownerSharePercentage,
                    shareAmount
                });
            });

            const totalOwnerShare = rides.reduce((sum: number, ride: any) => sum + ride.shareAmount, 0);
            const totalGross = rides.reduce((sum: number, ride: any) => sum + ride.totalSales, 0);

            // Filter out owners with no activity/rides to declutter report? 
            // Or keep them to show they have nothing. Keeping all for now.

            return {
                ownerId: owner.id,
                ownerName: owner.name,
                ownerContact: owner.contactNumber,
                rides,
                totalGross,
                totalOwnerShare
            };
        });

        // Filter out empty entries if desired
        const activeReport = report.filter((r: any) => r.rides.length > 0);

        return { success: true, data: activeReport };
    } catch (error) {
        console.error('Error generating revenue share report:', error);
        return { success: false, error: 'Failed to generate report' };
    }
}

export async function getAmusementLedgerReport(
    ownerId: number | undefined,
    dateStart?: string,
    dateEnd?: string
) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const whereClause: any = {};
        if (ownerId) whereClause.amusementOwnerId = ownerId;

        if (dateStart && dateEnd) {
            whereClause.date = {
                gte: new Date(dateStart),
                lte: new Date(dateEnd)
            };
        } else if (dateStart) {
            const start = new Date(dateStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateStart);
            end.setHours(23, 59, 59, 999);
            whereClause.date = {
                gte: start,
                lte: end
            };
        }

        const ledgerEntries = await prisma.amusementLedger.findMany({
            where: whereClause,
            include: {
                ticketType: true,
                amusementOwner: true
            },
            orderBy: { date: 'desc' }
        });

        // calculate totals
        let totalOwnerShare = 0;
        let totalCollectedByOwner = 0;

        const entries = ledgerEntries.map(entry => {
            totalOwnerShare += entry.ownerShareAmount;
            // @ts-ignore - Prisma types might be stale
            const collected = entry.collectedByOwner || 0;
            totalCollectedByOwner += collected;

            return {
                id: entry.id,
                date: entry.date,
                ownerName: entry.amusementOwner.name,
                itemName: entry.ticketType.name,
                soldCount: entry.soldCount,
                totalSales: entry.totalSales,
                sharePercentage: entry.ownerSharePercentage,
                ownerShareAmount: entry.ownerShareAmount,
                companyShareAmount: entry.companyShareAmount,
                status: entry.status,
                collectedByOwner: collected,
                netPayable: entry.ownerShareAmount - collected
            };
        });

        return {
            success: true,
            data: {
                entries,
                totalOwnerShare,
                totalCollectedByOwner,
                totalNetPayable: totalOwnerShare - totalCollectedByOwner
            }
        };
    } catch (error) {
        console.error('Error fetching ledger report:', error);
        return { success: false, error: 'Failed to fetch ledger report' };
    }
}
