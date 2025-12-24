import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTicketTypes } from '@/app/ticketing-actions';
import { TicketingPOS } from '@/components/TicketingPOS';

export default async function TicketingPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">No Event Selected</h2>
                    <p className="text-gray-500 mt-2">Please select an event from the dashboard to start selling tickets.</p>
                </div>
            </div>
        );
    }

    const ticketTypes = await getTicketTypes(session.activeEventId);

    return (
        <div className="bg-gray-50 min-h-screen -m-8 p-8 block"> {/* Override default layout padding/bg if needed, but for now standard container */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Ticket Counter</h1>
                <p className="text-gray-600">Event: {session.activeEventName}</p>
            </div>

            <TicketingPOS ticketTypes={ticketTypes} eventId={session.activeEventId} />
        </div>
    );
}
