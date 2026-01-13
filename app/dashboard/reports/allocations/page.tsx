import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBookings } from '@/app/allocation-actions';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PrintButton } from '@/components/printing/PrintButton';

export const revalidate = 0;

export default async function AllocatedSpacesReportPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const bookings = await getBookings(session.activeEventId);

    // Sort bookings by Space Label usually makes sense for a report
    bookings.sort((a, b) => a.space.label.localeCompare(b.space.label, undefined, { numeric: true }));

    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    return (
        <div className="max-w-7xl mx-auto p-8 bg-white min-h-screen">
            <div className="flex justify-between items-start mb-8 print:hidden">
                <Link href="/dashboard/reports">
                    <Button variant="ghost" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Reports
                    </Button>
                </Link>
                <PrintButton />
            </div>

            <div className="space-y-6">
                <div className="flex justify-between items-end border-b pb-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Space Allocation Report</h1>
                        <p className="text-gray-600 mt-1">
                            {session.activeEventName}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Generated on: {new Date().toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Total Bookings</p>
                        <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                                    Space
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                                    Exhibitor Details
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                                    Contact
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Booking Info
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bookings.map((booking) => (
                                <tr key={booking.id} className="break-inside-avoid">
                                    <td className="px-4 py-3 align-top border-r">
                                        <div className="font-bold text-gray-900 text-lg">
                                            {booking.space.label}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {booking.space.category.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {booking.space.category.dimensions}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top border-r">
                                        <div className="font-semibold text-gray-900">
                                            {booking.exhibitor.name}
                                        </div>
                                        {booking.exhibitor.faciaName && (
                                            <div className="text-sm text-blue-700 mt-1">
                                                Facia: <span className="font-medium">{booking.exhibitor.faciaName}</span>
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-2">
                                            Cat: {booking.exhibitor.productCategory || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top border-r">
                                        <div className="text-sm text-gray-900 flex items-center gap-1">
                                            <span className="font-medium">Ph:</span> {booking.exhibitor.phone}
                                        </div>
                                        <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                            <span className="font-medium">Email:</span> {booking.exhibitor.email}
                                        </div>
                                        <div className="text-sm text-gray-600 flex items-start gap-1 mt-1">
                                            <span className="font-medium whitespace-nowrap">Contact:</span>
                                            <span className="truncate max-w-[150px]">{booking.exhibitor.contact}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-right">
                                        <div className="font-bold text-gray-900">
                                            ₹{booking.totalAmount.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Booked: {new Date(booking.bookedAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {bookings.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                        No allocated spaces found for this event.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-bold">
                                <td colSpan={3} className="px-4 py-3 text-right border-r text-gray-900">
                                    Total Revenue
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900">
                                    ₹{totalRevenue.toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="text-center text-xs text-gray-400 mt-8 print:mt-auto">
                    <p>End of Report</p>
                </div>
            </div>
        </div>
    );
}
