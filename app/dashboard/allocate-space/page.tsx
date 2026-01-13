import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSpaces } from '@/app/space-actions';
import { getBookings, getExhibitors } from '@/app/allocation-actions';
import { SpaceAllocationView } from '@/components/features/SpaceAllocationView';

export default async function AllocateSpacePage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const [allSpaces, bookings, exhibitors] = await Promise.all([
        getSpaces(session.activeEventId),
        getBookings(session.activeEventId),
        getExhibitors()
    ]);

    return (
        <SpaceAllocationView
            allSpaces={allSpaces}
            bookings={bookings}
            exhibitors={exhibitors}
            eventId={session.activeEventId}
            eventName={session.activeEventName || 'Event'}
        />
    );
}
