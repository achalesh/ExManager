
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AmusementLedgerReportsClient } from '@/components/reports/AmusementLedgerReportsClient';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Amusement Ledger (Daily)</h1>
            <AmusementLedgerReportsClient />
        </div>
    );
}
