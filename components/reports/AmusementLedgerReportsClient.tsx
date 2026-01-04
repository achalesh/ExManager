'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Download, Filter } from 'lucide-react';
import { getAmusementOwners, getAmusementLedgerReport } from '@/app/amusement-actions';

interface LedgerEntry {
    id: number;
    date: Date;
    ownerName: string;
    itemName: string;
    soldCount: number;
    totalSales: number;
    sharePercentage: number;
    ownerShareAmount: number;
    companyShareAmount: number;
    collectedByOwner: number;
    netPayable: number;
    status: string;
}

export function AmusementLedgerReportsClient() {
    const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadOwners();
    }, []);

    useEffect(() => {
        // Auto load on filter change
        loadReport();
    }, [selectedOwnerId, date]);

    async function loadOwners() {
        const res = await getAmusementOwners();
        if (res.success && res.data) {
            setOwners(res.data);
        }
    }

    async function loadReport() {
        setLoading(true);
        const ownerId = selectedOwnerId === 'all' ? undefined : parseInt(selectedOwnerId);

        // Fetch for specific date (start=end)
        const res = await getAmusementLedgerReport(ownerId, date, date);

        if (res.success && res.data) {
            setEntries(res.data.entries);
        }
        setLoading(false);
    }

    const totalOwnerShare = entries.reduce((sum, e) => sum + e.ownerShareAmount, 0);
    const totalCollected = entries.reduce((sum, e) => sum + (e.collectedByOwner || 0), 0);
    const totalNetPayable = entries.reduce((sum, e) => sum + (e.netPayable || 0), 0);
    const totalCompanyShare = entries.reduce((sum, e) => sum + e.companyShareAmount, 0);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 w-full md:w-64">
                        <label className="text-sm font-medium">Select Owner</label>
                        <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Owners" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Owners</SelectItem>
                                {owners.map(owner => (
                                    <SelectItem key={owner.id} value={owner.id.toString()}>
                                        {owner.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 w-full md:w-auto">
                        <label className="text-sm font-medium">Date</label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <Button onClick={loadReport} disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Filter className="h-4 w-4" />}
                        Refresh
                    </Button>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Total Owner Share</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">₹{totalOwnerShare.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700">Collected by Owners</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">₹{totalCollected.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700">Net Payable</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">₹{totalNetPayable.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Total Company Share</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">₹{totalCompanyShare.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Ledger Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Ledger</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Sold Count</TableHead>
                                <TableHead className="text-right">Total Sales</TableHead>
                                <TableHead className="text-right">Owner Share</TableHead>
                                <TableHead className="text-right">Collected</TableHead>
                                <TableHead className="text-right">Net Payable</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length > 0 ? (
                                entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{entry.ownerName}</TableCell>
                                        <TableCell>{entry.itemName}</TableCell>
                                        <TableCell className="text-right">{entry.soldCount}</TableCell>
                                        <TableCell className="text-right">₹{entry.totalSales.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-medium text-blue-600">
                                            ₹{entry.ownerShareAmount.toFixed(2)}
                                            <span className="text-xs text-muted-foreground ml-1">({entry.sharePercentage}%)</span>
                                        </TableCell>
                                        <TableCell className="text-right text-orange-600">
                                            {entry.collectedByOwner > 0 ? `₹${entry.collectedByOwner.toFixed(2)}` : '-'}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${entry.netPayable >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₹{entry.netPayable.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No ledger entries found for this date.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
