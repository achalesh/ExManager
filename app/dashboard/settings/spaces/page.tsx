import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSpaceCategories, getSpaces } from '@/app/space-actions';
import { CreateSpaceCategoryDialog } from '@/components/dialogs/CreateSpaceCategoryDialog';
import { BulkCreateSpacesDialog } from '@/components/dialogs/BulkCreateSpacesDialog';
import { MapPin, Ruler, Grid3x3, IndianRupee } from 'lucide-react';
import { EditSpaceCategoryDialog } from '@/components/dialogs/EditSpaceCategoryDialog';
import { DeleteSpaceCategoryButton } from '@/components/shared/DeleteSpaceCategoryButton';
import { EditSpaceDialog } from '@/components/dialogs/EditSpaceDialog';
import { DeleteSpaceButton } from '@/components/shared/DeleteSpaceButton';

export default async function SpaceManagementPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (session.roleName !== 'Admin' && session.roleName !== 'Manager') {
        redirect('/dashboard');
    }

    const [categories, spaces] = await Promise.all([
        getSpaceCategories(),
        session.activeEventId ? getSpaces(session.activeEventId) : Promise.resolve([])
    ]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Space Management
                </h1>
                <p className="text-gray-600">
                    Create space categories and manage event spaces
                </p>
            </div>

            {/* Space Categories Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Space Categories</h2>
                    <CreateSpaceCategoryDialog />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.length === 0 ? (
                        <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
                            <Grid3x3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
                            <p className="text-gray-600 mb-6">
                                Create your first space category to get started
                            </p>
                            <CreateSpaceCategoryDialog />
                        </div>
                    ) : (
                        categories.map((category) => (
                            <div
                                key={category.id}
                                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center">
                                        <div className="bg-indigo-100 rounded-lg p-3">
                                            <MapPin className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {category.name}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {category.shape}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Ruler className="h-4 w-4 mr-2" />
                                        {category.dimensions}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Grid3x3 className="h-4 w-4 mr-2" />
                                        {category._count.spaces} spaces
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="flex items-center text-gray-900">
                                        <IndianRupee className="h-4 w-4 mr-1" />
                                        <span className="font-semibold">
                                            {category.price.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <EditSpaceCategoryDialog category={category} />
                                        <DeleteSpaceCategoryButton id={category.id} name={category.name} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Event Spaces Section */}
            {session.activeEventId && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Spaces for {session.activeEventName}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {spaces.length} total spaces
                            </p>
                        </div>
                        {categories.length > 0 && (
                            <BulkCreateSpacesDialog
                                categories={categories}
                                eventId={session.activeEventId}
                            />
                        )}
                    </div>

                    {spaces.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No spaces yet</h3>
                            <p className="text-gray-600 mb-6">
                                Create spaces for this event using bulk creation
                            </p>
                            {categories.length > 0 ? (
                                <BulkCreateSpacesDialog
                                    categories={categories}
                                    eventId={session.activeEventId}
                                />
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Create a space category first
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Label
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Category
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Exhibitor
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {spaces.map((space) => (
                                            <tr key={space.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">
                                                        {space.label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {space.category.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {space.category.dimensions}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${space.status === 'Available'
                                                        ? 'bg-green-100 text-green-800'
                                                        : space.status === 'Booked'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {space.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {space.bookings[0]?.exhibitor.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <EditSpaceDialog space={space} categories={categories} />
                                                        <DeleteSpaceButton id={space.id} label={space.label} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!session.activeEventId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                        Select an active event to create and manage spaces
                    </p>
                </div>
            )}
        </div>
    );
}
