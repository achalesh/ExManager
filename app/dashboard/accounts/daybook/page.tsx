import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DaybookInterface } from '@/components/features/DaybookInterface';

export default async function DaybookPage() {
    const session = await getSession();
    if (!session || !session.activeEventId) {
        redirect('/dashboard');
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2">Daybook</h1>
            <p className="text-gray-500 mb-6">Daily cash book and ledger for {session.activeEventName}</p>
            <DaybookInterface eventId={session.activeEventId} />
        </div>
    );
}
