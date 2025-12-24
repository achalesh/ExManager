import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSheds } from '@/app/resource-actions';
import { getShedAllocations, getExhibitors } from '@/app/allocation-actions';
import { ShedAllocationInterface } from '@/components/ShedAllocationInterface';
import { Home } from 'lucide-react';

export default async function AllocateShedPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const [sheds, allocations, exhibitors] = await Promise.all([
        getSheds(),
        getShedAllocations(session.activeEventId),
        getExhibitors()
    ]);

    const totalCost = allocations.reduce((sum, a) => sum + a.price, 0);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Shed Allocation
                </h1>
                <p className="text-gray-600">
                    Allocate sheds to exhibitors for {session.activeEventName}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Allocations</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">
                                {allocations.length}
                            </p>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3">
                            <Home className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                ${totalCost.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-purple-100 rounded-lg p-3">
                            <Home className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            <ShedAllocationInterface
                sheds={sheds}
                allocations={allocations}
                exhibitors={exhibitors}
                eventId={session.activeEventId}
            />
        </div>
    );
}
