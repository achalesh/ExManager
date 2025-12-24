import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getMaterials } from '@/app/resource-actions';
import { CreateMaterialDialog } from '@/components/CreateMaterialDialog';
import { MaterialInventoryList } from '@/components/MaterialInventoryList';
import { DeleteMaterialButton } from '@/components/DeleteMaterialButton';
import { EditMaterialDialog } from '@/components/EditMaterialDialog';
import { Package, IndianRupee } from 'lucide-react';

export default async function CreateMaterialsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (session.roleName !== 'Admin' && session.roleName !== 'Manager') {
        redirect('/dashboard');
    }

    const materials = await getMaterials();

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Material Management
                    </h1>
                    <p className="text-gray-600">
                        Create and manage materials for allocation
                    </p>
                </div>
                <CreateMaterialDialog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.length === 0 ? (
                    <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
                        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No materials yet</h3>
                        <p className="text-gray-600 mb-6">
                            Create your first material to get started
                        </p>
                        <CreateMaterialDialog />
                    </div>
                ) : (
                    materials.map((material) => (
                        <div
                            key={material.id}
                            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="bg-blue-100 rounded-lg p-3">
                                        <Package className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {material.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {material.unit}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <EditMaterialDialog material={material} />
                                    <DeleteMaterialButton id={material.id} name={material.name} />
                                </div>
                            </div>

                            {material.description && (
                                <p className="text-sm text-gray-600 mb-4">
                                    {material.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center text-gray-900">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    <span className="font-semibold">
                                        {material.price.toFixed(2)}
                                    </span>
                                    <span className="text-gray-500 text-sm ml-1">
                                        per {material.unit}
                                    </span>
                                </div>
                                <MaterialInventoryList material={material} />
                            </div>
                        </div>
                    ))
                )}
            </div >

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tip</h3>
                <p className="text-sm text-blue-800">
                    Materials can be allocated to exhibitors during the event.
                    Common materials include chairs, tables, banners, carpets, and display stands.
                </p>
            </div>
        </div >
    );
}
