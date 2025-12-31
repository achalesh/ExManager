import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AmusementOwners } from '@/components/AmusementOwners';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Amusement Configuration</h1>
            <AmusementOwners />
        </div>
    );
}
