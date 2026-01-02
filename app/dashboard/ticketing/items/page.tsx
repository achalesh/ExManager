import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTicketTypes } from '@/app/ticketing-actions';
import { TicketItemsList } from '@/components/TicketItemsList';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event.</div>;
    }

    const items = await getTicketTypes(session.activeEventId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ticket Items</h1>
                <p className="text-gray-500">Define the ticket items, their prices, and amusement owners.</p>
            </div>

            <TicketItemsList initialItems={items} eventId={session.activeEventId} />
        </div>
    );
}
