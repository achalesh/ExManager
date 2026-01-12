import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTicketingReport } from '@/app/ticketing-actions';
import TicketReportInterface from '@/components/reports/TicketReportInterface';

export default async function TicketingReportPage() {
    const session = await getSession();

    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event first.</div>;
    }

    const report = await getTicketingReport(session.activeEventId);

    if (!report) return <div>Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <TicketReportInterface data={report} eventName={session.activeEventName || 'Event'} />
        </div>
    );
}
