import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getMaterials } from '@/app/resource-actions';
import { getMaterialAllocations, getExhibitors } from '@/app/allocation-actions';
import { MaterialAllocationInterface } from '@/components/MaterialAllocationInterface';
import { Package } from 'lucide-react';

export default async function AllocateMaterialPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const [materials, allocations, exhibitors] = await Promise.all([
        getMaterials(),
        getMaterialAllocations(session.activeEventId),
        getExhibitors()
    ]);

    const totalCost = allocations.reduce((sum, a) => sum + a.totalPrice, 0);
    const totalItems = allocations.reduce((sum, a) => sum + a.quantity, 0);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Material Allocation
                </h1>
                <p className="text-gray-600">
                    Allocate materials to exhibitors for {session.activeEventName}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Allocations</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                                {allocations.length}
                            </p>
                        </div>
                        <div className="bg-blue-100 rounded-lg p-3">
                            <Package className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Items</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">
                                {totalItems}
                            </p>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3">
                            <Package className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Cost</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                ₹{totalCost.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-purple-100 rounded-lg p-3">
                            <Package className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            <MaterialAllocationInterface
                materials={materials}
                allocations={allocations}
                exhibitors={exhibitors}
                eventId={session.activeEventId}
            />
        </div>
    );
}
