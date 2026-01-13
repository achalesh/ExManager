import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getElectricalItems } from '@/app/resource-actions';
import { CreateElectricalDialog } from '@/components/dialogs/CreateElectricalDialog';
import { Zap, IndianRupee } from 'lucide-react';

export default async function CreateElectricalPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (session.roleName !== 'Admin' && session.roleName !== 'Manager') {
        redirect('/dashboard');
    }

    const items = await getElectricalItems();

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Electrical Item Management
                    </h1>
                    <p className="text-gray-600">
                        Create and manage electrical items for allocation
                    </p>
                </div>
                <CreateElectricalDialog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.length === 0 ? (
                    <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
                        <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No electrical items yet</h3>
                        <p className="text-gray-600 mb-6">
                            Create your first electrical item to get started
                        </p>
                        <CreateElectricalDialog />
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="bg-yellow-100 rounded-lg p-3">
                                        <Zap className="h-6 w-6 text-yellow-600" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {item.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {item.wattage}W
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {item.description && (
                                <p className="text-sm text-gray-600 mb-4">
                                    {item.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center text-gray-900">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    <span className="font-semibold">
                                        {item.price.toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {item.wattage} Watts
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-900 mb-2">⚡ Tip</h3>
                <p className="text-sm text-yellow-800">
                    Track power requirements by specifying wattage for each electrical item.
                    Common items include LED lights, fans, power strips, and spotlights.
                </p>
            </div>
        </div>
    );
}
