import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getElectricalItems } from '@/app/resource-actions';
import { getElectricalAllocations, getExhibitors } from '@/app/allocation-actions';
import { ElectricalAllocationInterface } from '@/components/ElectricalAllocationInterface';
import { Zap } from 'lucide-react';

export default async function AllocateElectricPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const [items, allocations, exhibitors] = await Promise.all([
        getElectricalItems(),
        getElectricalAllocations(session.activeEventId),
        getExhibitors()
    ]);

    const totalCost = allocations.reduce((sum, a) => sum + a.totalPrice, 0);
    const totalWattage = allocations.reduce((sum, a) => sum + a.totalWattage, 0);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Electrical Allocation
                </h1>
                <p className="text-gray-600">
                    Allocate electrical items to exhibitors for {session.activeEventName}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Allocations</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-2">
                                {allocations.length}
                            </p>
                        </div>
                        <div className="bg-yellow-100 rounded-lg p-3">
                            <Zap className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Wattage</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">
                                {totalWattage}W
                            </p>
                        </div>
                        <div className="bg-orange-100 rounded-lg p-3">
                            <Zap className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Cost</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                ${totalCost.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-purple-100 rounded-lg p-3">
                            <Zap className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            <ElectricalAllocationInterface
                items={items}
                allocations={allocations}
                exhibitors={exhibitors}
                eventId={session.activeEventId}
            />
        </div>
    );
}
