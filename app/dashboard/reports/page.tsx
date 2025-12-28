import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getEventReport, getExhibitorReport, getAllocationSummary } from '@/app/report-actions';
import { ReportControls } from '@/components/ReportControls';
import { Calendar, Users, MapPin, IndianRupee, Package, Zap, Home, TrendingUp, Download, List, Printer } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ReportsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const [eventReport, exhibitorReport, allocationSummary] = await Promise.all([
        getEventReport(session.activeEventId),
        getExhibitorReport(session.activeEventId),
        getAllocationSummary(session.activeEventId)
    ]);

    if (!eventReport) {
        return <div>Event not found</div>;
    }

    const { event, statistics, categoryBreakdown } = eventReport;

    return (
        <div className="print:p-8">
            <div className="mb-8 flex items-center justify-between print:mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Reports & Analytics
                    </h1>
                    <p className="text-gray-600">
                        {event.name} - {new Date(event.startDate).toLocaleDateString()} to {new Date(event.endDate).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ReportControls
                        eventName={event.name}
                        exhibitorReport={exhibitorReport}
                        allocationSummary={allocationSummary}
                    />
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Total Revenue"
                    value={`₹${statistics.totalRevenue.toFixed(2)}`}
                    icon={IndianRupee}
                    color="green"
                    subtitle={`Advance: ₹${statistics.totalAdvancePaid.toFixed(2)}`}
                />
                <MetricCard
                    title="Occupancy Rate"
                    value={`${statistics.occupancyRate}%`}
                    icon={TrendingUp}
                    color="blue"
                    subtitle={`${statistics.bookedSpaces}/${statistics.totalSpaces} spaces`}
                />
                <MetricCard
                    title="Total Exhibitors"
                    value={statistics.totalExhibitors.toString()}
                    icon={Users}
                    color="purple"
                    subtitle="Registered"
                />
                <MetricCard
                    title="Total Wattage"
                    value={`${statistics.totalWattage}W`}
                    icon={Zap}
                    color="yellow"
                    subtitle="Power consumption"
                />
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Breakdown</h2>
                    <div className="space-y-4">
                        <RevenueItem
                            label="Space Bookings"
                            amount={statistics.spaceRevenue}
                            total={statistics.totalRevenue}
                            icon={MapPin}
                            color="indigo"
                        />
                        <RevenueItem
                            label="Materials"
                            amount={statistics.materialRevenue}
                            total={statistics.totalRevenue}
                            icon={Package}
                            color="blue"
                        />
                        <RevenueItem
                            label="Electrical Items"
                            amount={statistics.electricalRevenue}
                            total={statistics.totalRevenue}
                            icon={Zap}
                            color="yellow"
                        />
                        <RevenueItem
                            label="Sheds"
                            amount={statistics.shedRevenue}
                            total={statistics.totalRevenue}
                            icon={Home}
                            color="green"
                        />
                    </div>
                </div>

                {/* Space Category Breakdown */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Space Categories</h2>
                    <div className="space-y-4">
                        {Object.entries(categoryBreakdown).map(([name, data]: [string, any]) => (
                            <div key={name} className="border-b border-gray-100 pb-3 last:border-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">{name}</span>
                                    <span className="text-sm text-gray-600">
                                        {data.booked}/{data.total} booked
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full"
                                            style={{ width: `${(data.booked / data.total) * 100}%` }}
                                        />
                                    </div>
                                    <span className="font-semibold text-green-600">
                                        ₹{data.revenue.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Allocation Summary */}
            {
                allocationSummary && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Materials */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Materials</h3>
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="space-y-3">
                                {allocationSummary.materials.length === 0 ? (
                                    <p className="text-sm text-gray-500">No allocations</p>
                                ) : (
                                    allocationSummary.materials.map((item: any) => (
                                        <div key={item.name} className="text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-900">{item.name}</span>
                                                <span className="font-medium">{item.totalQuantity} {item.unit}</span>
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                                {item.allocations} allocations - ₹{item.totalCost.toFixed(2)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Electrical */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Electrical</h3>
                                <Zap className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="space-y-3">
                                {allocationSummary.electrical.length === 0 ? (
                                    <p className="text-sm text-gray-500">No allocations</p>
                                ) : (
                                    allocationSummary.electrical.map((item: any) => (
                                        <div key={item.name} className="text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-900">{item.name}</span>
                                                <span className="font-medium">{item.totalQuantity} units</span>
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                                {item.totalWattage}W - ₹{item.totalCost.toFixed(2)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sheds */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Sheds</h3>
                                <Home className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="space-y-3">
                                {allocationSummary.sheds.length === 0 ? (
                                    <p className="text-sm text-gray-500">No allocations</p>
                                ) : (
                                    allocationSummary.sheds.map((item: any) => (
                                        <div key={item.name} className="text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-900">{item.name}</span>
                                                <span className="font-medium">{item.allocations}</span>
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                                {item.dimensions} - ₹{item.totalCost.toFixed(2)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Exhibitor Report */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Exhibitor Financial Summary</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Facia Name (Exhibitor)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Size
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Space
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Materials
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Electrical
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Shed
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Paid
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Balance
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {exhibitorReport.map((exhibitor: any) => (
                                <tr key={exhibitor.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {exhibitor.faciaName || exhibitor.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {exhibitor.faciaName && exhibitor.name !== exhibitor.faciaName ? (
                                                <span className="block text-xs">{exhibitor.name}</span>
                                            ) : null}
                                            {exhibitor.phone}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {exhibitor.bookings.map((b: any) => b.space.category.dimensions).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ₹{exhibitor.totals.spaceTotal.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ₹{exhibitor.totals.materialTotal.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ₹{exhibitor.totals.electricalTotal.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ₹{exhibitor.totals.shedTotal.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        ₹{exhibitor.totals.totalCost.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                        ₹{exhibitor.totals.totalPaid.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-medium ${exhibitor.totals.balance > 0 ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                            ₹{exhibitor.totals.balance.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}

function MetricCard({ title, value, icon: Icon, color, subtitle }: any) {
    const colorClasses = {
        green: 'bg-green-100 text-green-600',
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        yellow: 'bg-yellow-100 text-yellow-600',
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
}

function RevenueItem({ label, amount, total, icon: Icon, color }: any) {
    const percentage = total > 0 ? (amount / total) * 100 : 0;

    const colorClasses = {
        indigo: 'text-indigo-600',
        blue: 'text-blue-600',
        yellow: 'text-yellow-600',
        green: 'text-green-600',
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
                <Icon className={`h-5 w-5 mr-3 ${colorClasses[color as keyof typeof colorClasses]}`} />
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{label}</span>
                        <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${color === 'indigo' ? 'bg-indigo-600' : color === 'blue' ? 'bg-blue-600' : color === 'yellow' ? 'bg-yellow-600' : 'bg-green-600'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
            </div>
            <span className="ml-4 text-sm font-semibold text-gray-900">
                ₹{amount.toFixed(2)}
            </span>
        </div>
    );
}
