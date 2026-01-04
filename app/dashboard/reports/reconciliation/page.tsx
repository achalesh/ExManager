import { ReconciliationClient } from '@/components/ReconciliationClient';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ReconciliationPage() {
    const session = await getSession();
    if (!session || !['Admin', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">UPI Reconciliation</h1>
            <p className="text-gray-500">
                Upload PhonePe CSV reports to reconcile daily collections against system records.
            </p>

            <ReconciliationClient />
        </div>
    );
}
