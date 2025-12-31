import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RevenueShareReport } from '@/components/RevenueShareReport';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event.</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight mb-4">Reports</h1>
            <RevenueShareReport eventId={session.activeEventId} eventName={session.activeEventName || 'Event'} />
        </div>
    );
}
