'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, FileUp } from 'lucide-react';
import { uploadPhonePeCSV, getReconciliationReport } from '@/app/reconciliation-actions';
import { toast } from 'sonner'; // Assuming sonner or use standard alert

interface ReportEntry {
    machineId: number;
    machineName: string;
    systemAmount: number;
    bankAmount: number;
}

export function ReconciliationClient() {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState<ReportEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadData();
    }, [date]);

    async function loadData() {
        setLoading(true);
        const res = await getReconciliationReport(date, date);
        if (res.success && res.data) {
            setReport(res.data.sort((a, b) => a.machineName.localeCompare(b.machineName)));
        } else {
            // alert('Failed to load report');
        }
        setLoading(false);
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await uploadPhonePeCSV(formData);
            if (res.success) {
                alert(`Processed ${res.processedCount} transactions. Errors: ${res.errorCount}`);
                loadData();
            } else {
                alert(res.error || 'Upload failed');
            }
        } catch (err) {
            alert('Error uploading file');
        }
        setUploading(false);
        // Reset input
        e.target.value = '';
    }

    // Totals
    const totalSystem = report.reduce((sum, r) => sum + r.systemAmount, 0);
    const totalBank = report.reduce((sum, r) => sum + r.bankAmount, 0);
    const totalDiff = totalBank - totalSystem;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Reconciliation Date</label>
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-[200px]"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" className="relative cursor-pointer" disabled={uploading}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Import PhonePe CSV
                        <input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleUpload}
                        />
                    </Button>
                    <Button onClick={loadData} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">System Recorded (Staff)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalSystem.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Bank Received (CSV)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">₹{totalBank.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className={totalDiff < 0 ? 'bg-red-50' : (totalDiff > 0 ? 'bg-green-50' : 'bg-gray-50')}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Difference</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalDiff < 0 ? 'text-red-600' : (totalDiff > 0 ? 'text-green-600' : 'text-gray-900')}`}>
                            ₹{totalDiff.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Machine-wise Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Monitor Name</TableHead>
                                <TableHead className="text-right">System Amount</TableHead>
                                <TableHead className="text-right">Bank Amount</TableHead>
                                <TableHead className="text-right">Difference</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.map(row => {
                                const diff = row.bankAmount - row.systemAmount;
                                return (
                                    <TableRow key={row.machineId}>
                                        <TableCell className="font-medium">{row.machineName}</TableCell>
                                        <TableCell className="text-right">₹{row.systemAmount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">₹{row.bankAmount.toFixed(2)}</TableCell>
                                        <TableCell className={`text-right font-medium ${diff !== 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {diff === 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Matched
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Mismatch
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {report.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                        No data available for this date.
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
