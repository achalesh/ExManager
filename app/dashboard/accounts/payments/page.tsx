import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBillingSummary } from '@/app/billing-actions';
import { PaymentCollectionInterface } from '@/components/PaymentCollectionInterface';

export default async function PaymentCollectionPage() {
    const session = await getSession();
    if (!session || !session.activeEventId) {
        redirect('/dashboard');
    }

    const exhibitors = await getBillingSummary(session.activeEventId);

    // Sort alphabetically by name for easier searching
    const sortedExhibitors = [...exhibitors].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payment Collection</h1>
                    <p className="text-gray-500">Manage receipts and collections for {session.activeEventName}</p>
                </div>
            </div>

            <PaymentCollectionInterface
                exhibitors={sortedExhibitors}
                eventId={session.activeEventId}
            />
        </div>
    );
}
