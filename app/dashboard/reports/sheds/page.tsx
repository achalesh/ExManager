import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ShedReportsClient } from '@/components/reports/ShedReportsClient';

export default async function ShedReportsPage() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    const eventId = session.activeEventId;
    if (!eventId) {
        return <div className="p-8 text-center">No active event selected.</div>;
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });

    // Fetch all shed allocations for the event
    const allocations = await prisma.shedAllocation.findMany({
        where: { eventId },
        include: {
            exhibitor: {
                include: {
                    bookings: {
                        where: { eventId },
                        include: { space: true }
                    }
                }
            },
            shed: true
        },
        orderBy: { exhibitor: { name: 'asc' } }
    });

    // Post-process for financial summary grouped by Exhibitor
    const groupedByExhibitor: Record<number, any> = {};

    allocations.forEach((alloc) => {
        const exId = alloc.exhibitorId;
        if (!groupedByExhibitor[exId]) {
            groupedByExhibitor[exId] = {
                exhibitor: alloc.exhibitor,
                allocations: [],
                totalCost: 0,
                totalItems: 0
            };
        }
        groupedByExhibitor[exId].allocations.push(alloc);
        groupedByExhibitor[exId].totalCost += alloc.price; // Shed allocation calls it 'price', not 'totalPrice'
        groupedByExhibitor[exId].totalItems += 1; // 1 shed per allocation record usually
    });

    // Convert to array and sort
    const financialSummary = Object.values(groupedByExhibitor).sort((a: any, b: any) =>
        a.exhibitor.name.localeCompare(b.exhibitor.name)
    );

    const totalRevenue = financialSummary.reduce((sum: number, item: any) => sum + item.totalCost, 0);

    return (
        <div className="max-w-7xl mx-auto py-6">
            <ShedReportsClient
                allocations={allocations}
                financialSummary={financialSummary}
                eventName={event?.name || 'Event'}
                totalRevenue={totalRevenue}
            />
        </div>
    );
}
