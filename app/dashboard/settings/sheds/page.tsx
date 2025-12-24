import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSheds } from '@/app/resource-actions';
import { CreateShedDialog } from '@/components/CreateShedDialog';
import { Home, IndianRupee, Ruler } from 'lucide-react';

export default async function CreateShedsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (session.roleName !== 'Admin' && session.roleName !== 'Manager') {
        redirect('/dashboard');
    }

    const sheds = await getSheds();

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Shed Management
                    </h1>
                    <p className="text-gray-600">
                        Create and manage sheds for allocation
                    </p>
                </div>
                <CreateShedDialog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sheds.length === 0 ? (
                    <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
                        <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No sheds yet</h3>
                        <p className="text-gray-600 mb-6">
                            Create your first shed to get started
                        </p>
                        <CreateShedDialog />
                    </div>
                ) : (
                    sheds.map((shed) => (
                        <div
                            key={shed.id}
                            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="bg-green-100 rounded-lg p-3">
                                        <Home className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {shed.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center">
                                            <Ruler className="h-3 w-3 mr-1" />
                                            {shed.dimensions}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {shed.description && (
                                <p className="text-sm text-gray-600 mb-4">
                                    {shed.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center text-gray-900">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    <span className="font-semibold">
                                        {shed.price.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">🏠 Tip</h3>
                <p className="text-sm text-green-800">
                    Sheds provide covered space for exhibitors.
                    Define different sizes and types based on your event requirements.
                </p>
            </div>
        </div>
    );
}
