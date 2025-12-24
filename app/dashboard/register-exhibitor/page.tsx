import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getExhibitors } from '@/app/allocation-actions';
import { RegisterExhibitorDialog } from '@/components/RegisterExhibitorDialog';
import { EditExhibitorDialog } from '@/components/EditExhibitorDialog';
import { DeleteExhibitorButton } from '@/components/DeleteExhibitorButton';
import { Users, Mail, Phone } from 'lucide-react';

export default async function RegisterExhibitorPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const exhibitors = await getExhibitors();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Register Exhibitor
                </h1>
                <p className="text-gray-600">
                    Add new exhibitors to the system
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <RegisterExhibitorDialog />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Exhibitors</h2>
                    <span className="text-sm text-gray-500">{exhibitors.length} total</span>
                </div>

                {exhibitors.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No exhibitors yet</h3>
                        <p className="text-gray-600">
                            Register your first exhibitor to get started
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Exhibitor
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Advance Paid
                                    </th>


                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Registered
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {exhibitors.map((exhibitor) => (
                                    <tr key={exhibitor.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <span className="text-indigo-700 font-semibold text-sm">
                                                        {exhibitor.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {exhibitor.name}
                                                    </div>
                                                    {exhibitor.faciaName && (
                                                        <div className="text-sm text-gray-500">
                                                            {exhibitor.faciaName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 flex items-center">
                                                <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                                {exhibitor.phone}
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center">
                                                <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                                {exhibitor.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {exhibitor.productCategory || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                ${exhibitor.advancePaid.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(exhibitor.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <EditExhibitorDialog exhibitor={exhibitor} />
                                                <DeleteExhibitorButton id={exhibitor.id} name={exhibitor.name} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
