import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTicketingReport } from '@/app/ticketing-actions';
import { TicketingReportControls } from '@/components/TicketingReportControls';
import { DeleteSaleButton } from '@/components/DeleteSaleButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Banknote, Calendar } from 'lucide-react';

export default async function TicketingReportPage() {
    const session = await getSession();

    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event first.</div>;
    }

    const report = await getTicketingReport(session.activeEventId);

    if (!report) return <div>Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Ticketing Report</h1>
                    <p className="text-gray-600">Sales summary for {session.activeEventName}</p>
                </div>
                <TicketingReportControls data={report} filename="ticketing_report" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                        <Banknote className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">₹ {report.totalRevenue.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Tickets Sold</CardTitle>
                        <Ticket className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{report.totalTickets.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Average Ticket Price</CardTitle>
                        <Calendar className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            ₹ {report.totalTickets > 0 ? Math.round(report.totalRevenue / report.totalTickets) : 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(report.byCategory).map(([category, stats]) => (
                                <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-semibold text-gray-900">{category}</div>
                                        <div className="text-sm text-gray-500">{stats.count} tickets</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900">₹ {stats.revenue.toLocaleString()}</div>
                                        <div className="text-xs text-gray-400">
                                            {((stats.revenue / report.totalRevenue) * 100).toFixed(1)}% of total
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Drivers (Rides/Entrance)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(report.byType)
                                .sort(([, a], [, b]) => b.revenue - a.revenue)
                                .slice(0, 5)
                                .map(([type, stats]) => (
                                    <div key={type} className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{type}</p>
                                            <p className="text-xs text-gray-500">{stats.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">₹ {stats.revenue.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">{stats.count} sold</div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Sales Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {report.recentTransactions.map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(tx.date).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {tx.count} items
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                            ₹ {tx.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {tx.type === 'Counter' ? (
                                                <div className="flex justify-end">
                                                    <DeleteSaleButton id={tx.id} />
                                                </div>
                                            ) : (
                                                <a href="/dashboard/ticketing/staff" className="text-indigo-600 hover:text-indigo-900 text-xs">
                                                    Manage Staff
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
