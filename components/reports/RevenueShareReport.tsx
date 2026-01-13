'use client';

import { useState, useEffect } from 'react';
import { getRevenueShareReport } from '@/app/amusement-actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, Download, FileText, IndianRupee, Ticket, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface RevenueShareReportProps {
    eventId: number;
    eventName: string;
}

interface ReportData {
    ownerId: number;
    ownerName: string;
    ownerContact: string;
    rides: {
        id: number;
        name: string;
        quantitySold: number;
        totalSales: number;
        sharePercentage: number;
        shareAmount: number;
    }[];
    totalGross: number;
    totalOwnerShare: number;
}

export function RevenueShareReport({ eventId, eventName }: RevenueShareReportProps) {
    const [data, setData] = useState<ReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
        loadReport();
    }, [eventId, startDate, endDate]);

    async function loadReport() {
        setLoading(true);
        const res = await getRevenueShareReport(eventId, startDate, endDate);
        if (res.success && res.data) {
            setData(res.data);
            setError('');
        } else {
            setError(res.error || 'Failed to load report');
        }
        setLoading(false);
    }

    const printReport = () => {
        window.print();
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center gap-2"><AlertCircle className="h-5 w-5" /> {error}</div>;

    const grandTotalShare = data.reduce((sum, owner) => sum + owner.totalOwnerShare, 0);
    const grandTotalGross = data.reduce((sum, owner) => sum + owner.totalGross, 0);
    const grandTotalTickets = data.reduce((sum, owner) => {
        return sum + owner.rides.reduce((rideSum, ride) => rideSum + ride.quantitySold, 0);
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 print:hidden">
                <div className="flex items-end gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs">From Date</Label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                type="date"
                                className="pl-9 w-[150px]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">To Date</Label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                type="date"
                                className="pl-9 w-[150px]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="text-gray-500 h-10"
                    >
                        Reset
                    </Button>
                </div>
                <Button onClick={printReport} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" /> Print Report
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-purple-600" />
                            {grandTotalTickets.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <IndianRupee className="h-5 w-5 text-gray-600" />
                            {grandTotalGross.toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Payout Liability</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2 text-green-600">
                            <IndianRupee className="h-5 w-5" />
                            {grandTotalShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="print:shadow-none print:border-none">
                <CardHeader className="print:p-0 print:mb-4">
                    <CardTitle className="text-2xl">Revenue Share Report</CardTitle>
                    <CardDescription>{eventName} - Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}</CardDescription>
                </CardHeader>
                <CardContent className="print:p-0">
                    <div className="space-y-8">
                        {data.map(owner => (
                            <div key={owner.ownerId} className="border rounded-lg p-4 bg-gray-50/50 print:bg-white print:border-black print:p-0 print:mb-4">
                                <div className="flex justify-between items-center mb-4 border-b pb-2 print:border-black">
                                    <div>
                                        <h3 className="font-bold text-lg">{owner.ownerName}</h3>
                                        {owner.ownerContact && <div className="text-sm text-gray-500">{owner.ownerContact}</div>}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Payable Amount</div>
                                        <div className="font-bold text-xl text-green-600 print:text-black">₹{owner.totalOwnerShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Amusement Name</TableHead>
                                            <TableHead className="text-right">Quantity Sold</TableHead>
                                            <TableHead className="text-right">Total Gross</TableHead>
                                            <TableHead className="text-right">Share %</TableHead>
                                            <TableHead className="text-right">Owner Share</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {owner.rides.map(ride => (
                                            <TableRow key={ride.id}>
                                                <TableCell className="font-medium">{ride.name}</TableCell>
                                                <TableCell className="text-right">{ride.quantitySold}</TableCell>
                                                <TableCell className="text-right">₹{ride.totalSales.toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right">{ride.sharePercentage}%</TableCell>
                                                <TableCell className="text-right font-semibold">₹{ride.shareAmount.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                        {owner.rides.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground">No ticket sales linked.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}

                        {data.length === 0 && (
                            <div className="text-center py-12 text-gray-500">No revenue share data found. Ensure Amusements are linked to Owners and Tickets have been sold.</div>
                        )}

                        {data.length > 0 && (
                            <div className="flex justify-end pt-4 border-t">
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground uppercase font-bold">Total Payout Liability</div>
                                    <div className="text-3xl font-bold">₹{grandTotalShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
