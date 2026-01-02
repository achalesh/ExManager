import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getInventory } from '@/app/inventory-actions';
import { TicketStockList } from '@/components/TicketStockList';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event.</div>;
    }

    const inventory = await getInventory(session.activeEventId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ticket Stock</h1>
                <p className="text-gray-500">Register ticket books and inventory by category and rate.</p>
            </div>

            <TicketStockList initialInventory={inventory} eventId={session.activeEventId} />
        </div>
    );
}
