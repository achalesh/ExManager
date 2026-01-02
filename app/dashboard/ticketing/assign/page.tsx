import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTicketTypes } from '@/app/ticketing-actions';
import { getInventory } from '@/app/inventory-actions';
import { AssignTicketsInterface } from '@/components/AssignTicketsInterface';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event.</div>;
    }

    const [items, inventory] = await Promise.all([
        getTicketTypes(session.activeEventId),
        getInventory(session.activeEventId)
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Assign Tickets</h1>
                <p className="text-gray-500">Assign ticket stock bundles to active sales counters/items.</p>
            </div>

            <AssignTicketsInterface items={items} inventory={inventory} />
        </div>
    );
}
