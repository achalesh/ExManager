'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Edit2, Trash2, Filter, Loader2, Download, AlertTriangle } from 'lucide-react';
import { updatePayment, deletePayment, updatePaymentReceipt, deletePaymentReceipt } from '@/app/payment-actions';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Payment {
    id: number;
    paymentDate: Date;
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    category: string;
    notes?: string | null;
    exhibitorName: string;
    space: string;
    collectedBy?: string | null;
}

interface GroupedPayment {
    receiptNumber: string;
    date: Date;
    exhibitorName: string;
    space: string;
    category: string;
    totalAmount: number;
    methods: string[];
    notes: string;
    collectedBy: string;
    ids: number[];
    isSplit: boolean;
}

// ... (imports)

interface PaymentReportTableProps {
    initialPayments: Payment[];
    role: string;
}

export function PaymentReportTable({ initialPayments, role }: PaymentReportTableProps) {
    const [payments, setPayments] = useState(initialPayments);
    const [searchTerm, setSearchTerm] = useState('');
    const [methodFilter, setMethodFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const isAdmin = role === 'Admin';

    const [editReceipt, setEditReceipt] = useState<GroupedPayment | null>(null);
    const [deleteReceiptNum, setDeleteReceiptNum] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Group payments by Receipt Number
    const groupedPayments: GroupedPayment[] = [];
    const receiptMap = new Map<string, Payment[]>();

    payments.forEach(p => {
        const existing = receiptMap.get(p.receiptNumber) || [];
        existing.push(p);
        receiptMap.set(p.receiptNumber, existing);
    });

    // Create sorted array of grouped payments
    Array.from(receiptMap.entries()).forEach(([receipt, items]) => {
        const first = items[0];
        const total = items.reduce((sum, i) => sum + i.amount, 0);
        const methods = Array.from(new Set(items.map(i => i.paymentMethod)));

        groupedPayments.push({
            receiptNumber: receipt,
            date: new Date(first.paymentDate),
            exhibitorName: first.exhibitorName,
            space: first.space,
            category: first.category,
            totalAmount: total,
            methods: methods,
            notes: items.map(i => i.notes).filter(Boolean).join('; '),
            collectedBy: first.collectedBy || '-',
            ids: items.map(i => i.id),
            isSplit: items.length > 1
        });
    });

    // Sort by date desc
    groupedPayments.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Filter
    const filteredPayments = groupedPayments.filter(p => {
        const matchesSearch =
            p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.exhibitorName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMethod = methodFilter === 'All' || p.methods.includes(methodFilter);

        const matchesDate = !dateFilter ||
            (p.date.getDate() === dateFilter.getDate() &&
                p.date.getMonth() === dateFilter.getMonth() &&
                p.date.getFullYear() === dateFilter.getFullYear());

        return matchesSearch && matchesMethod && matchesDate;
    });

    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.totalAmount, 0);

    const handleDownloadCSV = () => {
        const headers = ['Date', 'Receipt No', 'Exhibitor', 'Space', 'Category', 'Amount', 'Method', 'Notes', 'Collected By'];
        const rows = filteredPayments.map(p => [
            format(p.date, 'yyyy-MM-dd'),
            p.receiptNumber,
            p.exhibitorName,
            p.space,
            p.category,
            p.totalAmount,
            p.methods.join('/'),
            p.notes,
            p.collectedBy
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `payment_report_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editReceipt) return;
        setLoading(true);

        try {
            // Logic for update would go here - confusing as it depends on whether we update singular or batch
            // The logic from previous file seems to assume we call updatePaymentReceipt for the whole group
            const res = await updatePaymentReceipt({
                receiptNumber: editReceipt.receiptNumber,
                date: editReceipt.date,
                notes: editReceipt.notes,
                // For split payments, we can't edit amount/method easily here via this UI
                // If not split, we can
                ...(!editReceipt.isSplit ? {
                    amount: editReceipt.totalAmount,
                    paymentMethod: editReceipt.methods[0]
                } : {})
            });

            if (res.success) {
                // Refresh logic - ideally router.refresh() but local state update is faster
                setEditReceipt(null);
                setPayments(prev => prev.map(p => {
                    if (p.receiptNumber === editReceipt.receiptNumber) {
                        return {
                            ...p,
                            paymentDate: editReceipt.date,
                            notes: editReceipt.notes, // Simplified
                            ...(!editReceipt.isSplit ? {
                                amount: editReceipt.totalAmount,
                                paymentMethod: editReceipt.methods[0]
                            } : {})
                        };
                    }
                    return p;
                }));
                router.refresh();
            } else {
                alert('Update failed: ' + res.error);
            }
        } catch (err) {
            console.error(err);
            alert('Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 w-full md:w-auto">
                    {/* ... (Search & Filter) */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search receipt, exhibitor..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Methods</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="bg-slate-100 px-4 py-2 rounded-lg font-bold">
                            Total: ₹{totalAmount.toLocaleString('en-IN')}
                        </div>
                    )}
                    <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Exhibitor</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Notes</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPayments.map(payment => (
                            <TableRow key={payment.receiptNumber}>
                                <TableCell>{format(new Date(payment.date), 'dd MMM yyyy')}</TableCell>
                                <TableCell className="font-mono">{payment.receiptNumber}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{payment.exhibitorName}</div>
                                    <div className="text-xs text-muted-foreground">{payment.space}</div>
                                </TableCell>
                                <TableCell>{payment.category}</TableCell>
                                <TableCell className="text-right font-bold">₹{payment.totalAmount.toLocaleString('en-IN')}</TableCell>
                                <TableCell>
                                    <div className="flex gap-1 flex-wrap">
                                        {payment.methods.map(m => (
                                            <span key={m} className={`px-2 py-1 rounded-full text-xs border ${m === 'Cash' ? 'bg-green-50 border-green-200 text-green-700' :
                                                m === 'UPI' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                    'bg-gray-50 border-gray-200 text-gray-700'
                                                }`}>
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={payment.notes}>{payment.notes}</TableCell>
                                {isAdmin && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => setEditReceipt(payment)}>
                                                <Edit2 className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteReceiptNum(payment.receiptNumber)}>
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {filteredPayments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                                    No payments found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editReceipt} onOpenChange={(o) => !o && setEditReceipt(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Payment Details</DialogTitle>
                        <DialogDescription>
                            {editReceipt?.receiptNumber} - {editReceipt?.exhibitorName}
                            {editReceipt?.isSplit && <div className="text-amber-600 flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Split payment: Amount and Method cannot be edited.</div>}
                        </DialogDescription>
                    </DialogHeader>
                    {editReceipt && (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Payment Date</Label>
                                <Input
                                    type="date"
                                    value={format(new Date(editReceipt.date), 'yyyy-MM-dd')}
                                    onChange={e => setEditReceipt({ ...editReceipt, date: new Date(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Total Amount</Label>
                                    <Input
                                        type="number"
                                        value={editReceipt.totalAmount}
                                        onChange={e => setEditReceipt({ ...editReceipt, totalAmount: parseFloat(e.target.value) })}
                                        disabled={editReceipt.isSplit}
                                        className={editReceipt.isSplit ? "bg-gray-100" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Method</Label>
                                    {editReceipt.isSplit ? (
                                        <Input value="Split (Multiple)" disabled className="bg-gray-100" />
                                    ) : (
                                        <Select
                                            value={editReceipt.methods[0]}
                                            onValueChange={v => setEditReceipt({ ...editReceipt, methods: [v] })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={editReceipt.category}
                                    onValueChange={v => setEditReceipt({ ...editReceipt, category: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Rent">Rent</SelectItem>
                                        <SelectItem value="Material">Material</SelectItem>
                                        <SelectItem value="Electrical">Electrical</SelectItem>
                                        <SelectItem value="Shed">Shed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input
                                    value={editReceipt.notes || ''}
                                    onChange={e => setEditReceipt({ ...editReceipt, notes: e.target.value })}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditReceipt(null)}>Cancel</Button>
                                <Button type="submit" disabled={loading === editReceipt.receiptNumber}>
                                    {loading === editReceipt.receiptNumber && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteReceiptNum} onOpenChange={(o) => !o && setDeleteReceiptNum(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Payment Receipt?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete this receipt and all associated payment records
                            {deleteReceiptNum && payments.filter(p => p.receiptNumber === deleteReceiptNum).length > 1 ? ' (including all split parts)' : ''}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteReceiptNum(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading === deleteReceiptNum}>
                            {loading === deleteReceiptNum && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
