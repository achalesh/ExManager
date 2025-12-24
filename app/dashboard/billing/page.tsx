import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBillingSummary } from '@/app/billing-actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, FileText } from 'lucide-react';

export default async function BillingDashboard() {
    const session = await getSession();
    if (!session || !session.activeEventId) {
        redirect('/dashboard');
    }

    const exhibitors = await getBillingSummary(session.activeEventId);

    const totalReceivable = exhibitors.reduce((sum, ex) => sum + ex.totalCost, 0);
    const totalCollected = exhibitors.reduce((sum, ex) => sum + ex.totalPaid, 0);
    const totalPending = totalReceivable - totalCollected;

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Billing & Payments</h1>
                    <p className="text-gray-500">Manage invoices and collections for {session.activeEventName}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Receivable</CardTitle>
                        <IndianRupee className="h-4 w-4 mr-1" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalReceivable.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Collected</CardTitle>
                        <IndianRupee className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">₹{totalCollected.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Pending Balance</CardTitle>
                        <IndianRupee className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹{totalPending.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Exhibitors List */}
            <div className="bg-white rounded-lg shadow border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Exhibitor</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                            <TableHead className="text-right">Invoiced</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {exhibitors.map((ex) => (
                            <TableRow key={ex.id}>
                                <TableCell className="font-medium">
                                    <div>{ex.name}</div>
                                    <div className="text-xs text-gray-500">{ex.stallName}</div>
                                </TableCell>
                                <TableCell>{ex.contact}</TableCell>
                                <TableCell className="text-right">₹{ex.totalCost.toLocaleString()}</TableCell>
                                <TableCell className="text-right">₹{ex.totalInvoiced.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-green-600">₹{ex.totalPaid.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-bold text-red-600">₹{ex.balance.toLocaleString()}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={ex.status === 'Settled' ? 'secondary' : 'destructive'}
                                        className={ex.status === 'Settled' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                                        {ex.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/dashboard/billing/${ex.id}`}>
                                        <Button variant="ghost" size="sm">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Details
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {exhibitors.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                    No exhibitors found for this event.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
