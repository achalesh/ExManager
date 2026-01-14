
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDetailedSalesReport } from '@/app/ticketing-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Coins, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import Link from 'next/link';

export default async function DetailedSalesReportPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const session = await getSession();

    if (!session || !['Admin', 'Manager', 'Office', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event first.</div>;
    }

    const dateFilter = typeof searchParams.date === 'string' ? searchParams.date : undefined;
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;

    const report = await getDetailedSalesReport(session.activeEventId, dateFilter, page);

    if (!report) return <div>Loading...</div>;

    const ticketTypenames = Object.keys(report.summary.byItem).sort();

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Sold Ticket Details</h1>
                <p className="text-gray-600">Detailed log of all ticket sales for {session.activeEventName}</p>
            </div>




            {/* Summary Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-800">Total Revenue</CardTitle>
                        <Coins className="h-5 w-5 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">₹ {report.summary.totalRevenue.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-800">Total Tickets</CardTitle>
                        <Ticket className="h-5 w-5 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{report.summary.totalTickets.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-800">Entrance</CardTitle>
                        <Ticket className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">{report.summary.entrance.count.toLocaleString()}</div>
                        <p className="text-xs text-green-600 mt-1">₹ {report.summary.entrance.revenue.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-800">Amusement</CardTitle>
                        <Ticket className="h-5 w-5 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900">{report.summary.amusement.count.toLocaleString()}</div>
                        <p className="text-xs text-orange-600 mt-1">₹ {report.summary.amusement.revenue.toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Item-wise Breakdown Summary */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Item Breakdown</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2">
                    {ticketTypenames.map(name => {
                        const item = report.summary.byItem[name];
                        return (
                            <Card key={name} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-2">
                                    <div className="text-[10px] font-medium text-gray-500 truncate uppercase tracking-wider" title={name}>{name}</div>
                                    <div className="mt-0.5 text-sm font-bold text-gray-900">₹ {item.revenue.toLocaleString()}</div>
                                    <div className="text-[9px] text-gray-400 mb-1">{item.count} tix</div>

                                    <div className="flex justify-between items-center text-[9px] border-t pt-1 mt-1">
                                        <span className="text-green-600 font-semibold" title="Cash">
                                            ₹{item.cash.toLocaleString()}
                                        </span>
                                        <span className="text-blue-600 font-semibold" title="UPI">
                                            ₹{item.upi.toLocaleString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-6">
                    <div className="space-y-1">
                        <CardTitle>Sales Transaction Log</CardTitle>
                        <p className="text-sm text-gray-500">
                            Page {report.pagination.currentPage} of {report.pagination.totalPages}
                        </p>
                    </div>
                    {/* Date Filter Form */}
                    <form className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                                type="date"
                                name="date"
                                defaultValue={dateFilter || ''}
                                className="pl-9 h-8 w-40 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm">Filter</Button>
                        {dateFilter && (
                            <Link href="/dashboard/reports/sales">
                                <Button variant="ghost" size="sm">Clear</Button>
                            </Link>
                        )}
                    </form>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cash</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">UPI</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {report.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            No sales records found.
                                        </td>
                                    </tr>
                                ) : (
                                    report.rows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(row.date).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {row.source === 'Counter' ? (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                                        Counter
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-700">
                                                        {row.source}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {row.ticketType}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {row.details}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {row.count}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 text-right">
                                                ₹ {row.cash}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700 text-right">
                                                ₹ {row.upi}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-right text-sm text-gray-900">
                                        Grand Total (Filtered)
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 text-right">
                                        ₹ {report.summary.totalCash.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 text-right">
                                        ₹ {report.summary.totalUpi.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {report.pagination.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <Link href={`/dashboard/reports/sales?page=${report.pagination.currentPage - 1}${dateFilter ? `&date=${dateFilter}` : ''}`}>
                                <Button variant="outline" size="sm" disabled={report.pagination.currentPage <= 1}>
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                </Button>
                            </Link>
                            <span className="text-sm font-medium text-gray-600">
                                Page {report.pagination.currentPage}
                            </span>
                            <Link href={`/dashboard/reports/sales?page=${report.pagination.currentPage + 1}${dateFilter ? `&date=${dateFilter}` : ''}`}>
                                <Button variant="outline" size="sm" disabled={report.pagination.currentPage >= report.pagination.totalPages}>
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
