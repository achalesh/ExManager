import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AmusementLedgerInterface } from '@/components/AmusementLedgerInterface';

async function getAmusementOwners(eventId: string) {
    if (!eventId) return [];
    return prisma.amusementOwner.findMany({
        where: {
            ticketTypes: {
                some: { eventId: Number(eventId) }
            }
        },
        orderBy: { name: 'asc' }
    });
}

export default async function AmusementLedgerPage() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    const owners = await getAmusementOwners(session.activeEventId);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Amusement Ledger</h1>
            <AmusementLedgerInterface owners={owners} />
        </div>
    );
}
