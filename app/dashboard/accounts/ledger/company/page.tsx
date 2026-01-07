import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CompanyLedgerInterface } from '@/components/CompanyLedgerInterface';
import { getEventLedger } from '@/app/accounts-actions';

export default async function CompanyLedgerPage() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    // New action to fetch full event ledger (or recent 100)
    const { transactions, summary } = await getEventLedger(session.activeEventId);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Company & Event Ledger</h1>
            <CompanyLedgerInterface initialTransactions={transactions} summary={summary} />
        </div>
    );
}
