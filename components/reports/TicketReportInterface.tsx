'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TicketingReportControls } from "@/components/TicketingReportControls";
import { DeleteSaleButton } from "@/components/DeleteSaleButton";
import { Banknote, Ticket, Calendar, TrendingUp, Users, Wallet, Clock, CreditCard } from 'lucide-react';

interface TicketReportProps {
    data: {
        totalRevenue: number;
        totalTickets: number;
        byCategory: Record<string, { count: number, revenue: number }>;
        byType: Record<string, { count: number, revenue: number, category: string }>;
        staffPerformance: Array<{ name: string, sold: number, revenue: number, cash: number, upi: number }>;
        hourlyStats: Record<number, { count: number, revenue: number }>;
        paymentStats: { cash: number, upi: number };
        recentTransactions: Array<{ id: string | number, date: string, count: number, amount: number, type: string }>;
    };
    eventName: string;
}

export default function TicketReportInterface({ data, eventName }: TicketReportProps) {
    const { totalRevenue, totalTickets, byCategory, byType, staffPerformance, hourlyStats, paymentStats, recentTransactions } = data;

    // Helper to format currency
    const formatCurrency = (val: number) => `₹ ${val.toLocaleString('en-IN')}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Ticketing Report</h1>
                    <p className="text-gray-600">Sales summary for {eventName}</p>
                </div>
                <TicketingReportControls data={data} filename="ticketing_report" />
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                        <Banknote className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Tickets Sold</CardTitle>
                        <Ticket className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{totalTickets.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg. Ticket Price</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {totalTickets > 0 ? formatCurrency(Math.round(totalRevenue / totalTickets)) : '₹ 0'}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">UPI Collection</CardTitle>
                        <CreditCard className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{formatCurrency(paymentStats.upi)}</div>
                        <p className="text-xs text-gray-500">{(paymentStats.upi / totalRevenue * 100).toFixed(1)}% of total</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="staff">Staff Performance</TabsTrigger>
                    <TabsTrigger value="hourly">Hourly Analysis</TabsTrigger>
                    <TabsTrigger value="payment">Payment Methods</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sales by Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(byCategory).map(([category, stats]) => (
                                        <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-semibold text-gray-900">{category}</div>
                                                <div className="text-sm text-gray-500">{stats.count} tickets</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900">{formatCurrency(stats.revenue)}</div>
                                                <div className="text-xs text-gray-400">
                                                    {((stats.revenue / totalRevenue) * 100).toFixed(1)}%
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
                                    {Object.entries(byType)
                                        .sort(([, a], [, b]) => b.revenue - a.revenue)
                                        .slice(0, 5)
                                        .map(([type, stats]) => (
                                            <div key={type} className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">{type}</p>
                                                    <p className="text-xs text-gray-500">{stats.category}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">{formatCurrency(stats.revenue)}</div>
                                                    <div className="text-xs text-gray-500">{stats.count} sold</div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* STAFF TAB */}
                <TabsContent value="staff">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" /> Staff Performance Leaderboard
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Staff Member</TableHead>
                                        <TableHead className="text-right">Tickets Sold</TableHead>
                                        <TableHead className="text-right">Total Revenue</TableHead>
                                        <TableHead className="text-right text-green-600">Cash</TableHead>
                                        <TableHead className="text-right text-blue-600">UPI</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staffPerformance.map((staff, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium text-gray-500">#{idx + 1}</TableCell>
                                            <TableCell className="font-semibold">{staff.name}</TableCell>
                                            <TableCell className="text-right">{staff.sold}</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(staff.revenue)}</TableCell>
                                            <TableCell className="text-right text-green-700 font-mono">{formatCurrency(staff.cash)}</TableCell>
                                            <TableCell className="text-right text-blue-700 font-mono">{formatCurrency(staff.upi)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {staffPerformance.length === 0 && <TableRow><TableCell colSpan={6} className="text-center p-8 text-gray-500">No staff sales recorded.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HOURLY TAB */}
                <TabsContent value="hourly">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" /> Hourly Sales Trend
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time Block</TableHead>
                                        <TableHead>Activity Bar</TableHead>
                                        <TableHead className="text-right">Tickets</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(hourlyStats).map(([hour, stats]) => {
                                        if (stats.count === 0 && stats.revenue === 0) return null;
                                        const h = Number(hour);
                                        const timeLabel = `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

                                        // Max value for bar scaling (assuming rough max revenue per hour ~ 50k for visualization scaling or relative to max in set)
                                        // Let's compute local max for this render?
                                        // For simplicity, just use a fixed width logic or simply display data.
                                        // Let's try a simple visual bar using revenue relative to total revenue is too small.
                                        // Maybe relative to max hour?

                                        return (
                                            <TableRow key={h}>
                                                <TableCell className="font-medium whitespace-nowrap">{timeLabel}</TableCell>
                                                <TableCell className="w-full">
                                                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden w-full max-w-sm">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full"
                                                            style={{ width: `${Math.min((stats.revenue / (totalRevenue * 0.5)) * 100, 100)}%` }} // Rough scaling
                                                        ></div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{stats.count}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(stats.revenue)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {/* Show "No Activity" if empty */}
                                    {Object.values(hourlyStats).every(s => s.revenue === 0) && (
                                        <TableRow><TableCell colSpan={4} className="text-center p-8 text-gray-500">No hourly data available.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PAYMENT TAB */}
                <TabsContent value="payment">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="h-5 w-5" /> Payment Methods
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center justify-center">
                                    <h3 className="text-lg font-semibold text-green-800 mb-2">Cash Collected</h3>
                                    <p className="text-4xl font-bold text-green-700">{formatCurrency(paymentStats.cash)}</p>
                                    <p className="text-sm text-green-600 mt-2">
                                        {((paymentStats.cash / totalRevenue) * 100).toFixed(1)}% of total revenue
                                    </p>
                                </div>
                                <div className="p-6 bg-orange-50 rounded-xl border border-orange-100 flex flex-col items-center justify-center">
                                    <h3 className="text-lg font-semibold text-orange-800 mb-2">UPI / Digital</h3>
                                    <p className="text-4xl font-bold text-orange-700">{formatCurrency(paymentStats.upi)}</p>
                                    <p className="text-sm text-orange-600 mt-2">
                                        {((paymentStats.upi / totalRevenue) * 100).toFixed(1)}% of total revenue
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TRANSACTIONS TAB */}
                <TabsContent value="transactions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Items / Description</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentTransactions.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="whitespace-nowrap text-gray-600">
                                                    {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.type === 'Counter' ? 'default' : 'secondary'}>
                                                        {tx.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {tx.count} tickets
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {formatCurrency(tx.amount)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {tx.type === 'Counter' ? (
                                                        <div className="flex justify-end scale-75 origin-right">
                                                            <DeleteSaleButton id={Number(tx.id)} />
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Settled</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
