
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UPIMachinesClient } from '@/components/features/UPIMachinesClient';
import { TicketMachineAssignment } from '@/components/reports/TicketMachineAssignment';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">UPI Machines</h1>
            <p className="text-muted-foreground">Manage UPI QR codes and terminals for ticket counters and amusements.</p>
            <UPIMachinesClient />

            <div className="border-t pt-6">
                <TicketMachineAssignment />
            </div>
        </div>
    );
}
