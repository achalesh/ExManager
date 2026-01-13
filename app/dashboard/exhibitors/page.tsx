import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getExhibitors } from '@/app/exhibitor-actions';
import { EditExhibitorDialog } from '@/components/dialogs/EditExhibitorDialog';
import { DeleteExhibitorButton } from '@/components/shared/DeleteExhibitorButton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ExhibitorsPage() {
    const session = await getSession();

    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    const exhibitors = await getExhibitors();

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Exhibitor Directory</h1>
                    <p className="text-gray-600">Manage registered exhibitors</p>
                </div>

                {/* Search - For now simple UI, real filtering can be done client side or URL params. 
                    Adding a placeholder search input for visual completeness. 
                    Ideally this would be a client component for interaction. 
                    I'll keep it static here or just a header. */}
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company / Facia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone / Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {exhibitors.map((exhibitor) => (
                                    <tr key={exhibitor.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{exhibitor.name}</div>
                                            <div className="text-xs text-gray-500">{exhibitor.faciaName}</div>
                                            {exhibitor.productCategory && (
                                                <div className="text-xs text-blue-600 mt-1">{exhibitor.productCategory}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{exhibitor.contact}</div>
                                            <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px]" title={exhibitor.address}>{exhibitor.address}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{exhibitor.phone}</div>
                                            <div className="text-xs text-gray-500">{exhibitor.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {exhibitor.bookings.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {exhibitor.bookings.map((b, idx) => (
                                                        <span key={idx} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                                            {b.space.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">No bookings</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end items-center gap-2">
                                                <EditExhibitorDialog exhibitor={exhibitor} />
                                                <DeleteExhibitorButton id={exhibitor.id} name={exhibitor.name} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {exhibitors.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                            No exhibitors found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
