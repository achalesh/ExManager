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
    notes?: string;
    exhibitorName: string;
    space: string;
    collectedBy?: string;
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

export function PaymentReportTable({ initialPayments }: { initialPayments: Payment[] }) {
    const [payments, setPayments] = useState(initialPayments);
    const [searchTerm, setSearchTerm] = useState('');
    const [methodFilter, setMethodFilter] = useState('All');
    const [loading, setLoading] = useState<string | null>(null);
    const [editReceipt, setEditReceipt] = useState<GroupedPayment | null>(null);
    const [deleteReceiptNum, setDeleteReceiptNum] = useState<string | null>(null);
    const router = useRouter();

    // Grouping Logic
    const groupedPayments: GroupedPayment[] = Object.values(payments.reduce((acc, p) => {
        if (!acc[p.receiptNumber]) {
            acc[p.receiptNumber] = {
                receiptNumber: p.receiptNumber,
                date: new Date(p.paymentDate),
                exhibitorName: p.exhibitorName,
                space: p.space,
                category: p.category,
                totalAmount: 0,
                methods: [],
                notes: p.notes || '',
                collectedBy: p.collectedBy || '',
                ids: [],
                isSplit: false
            };
        }
        acc[p.receiptNumber].totalAmount += p.amount;
        if (!acc[p.receiptNumber].methods.includes(p.paymentMethod)) {
            acc[p.receiptNumber].methods.push(p.paymentMethod);
        }
        acc[p.receiptNumber].ids.push(p.id);
        acc[p.receiptNumber].isSplit = acc[p.receiptNumber].ids.length > 1;
        return acc;
    }, {} as Record<string, GroupedPayment>));

    // Filtering
    const filteredPayments = groupedPayments.filter(p => {
        const matchesSearch =
            p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.exhibitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.space.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMethod = methodFilter === 'All' || p.methods.includes(methodFilter);
        return matchesSearch && matchesMethod;
    });

    // Stats
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.totalAmount, 0);

    // Handlers
    const handleDelete = async () => {
        if (!deleteReceiptNum) return;
        setLoading(deleteReceiptNum);
        try {
            const res = await deletePaymentReceipt(deleteReceiptNum);
            if (res.success) {
                setPayments(payments.filter(p => p.receiptNumber !== deleteReceiptNum));
                setDeleteReceiptNum(null);
                router.refresh();
            } else {
                alert(res.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to delete');
        } finally {
            setLoading(null);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editReceipt) return;
        setLoading(editReceipt.receiptNumber);

        try {
            // If split, we only support updating common fields via updatePaymentReceipt
            // If single, we could technically update amount/method too via updatePayment, 
            // but for consistency let's stick to Receipt level update unless strictly single?
            // Actually, if single, users expect full edit. 
            // BUT our new action `updatePaymentReceipt` handles fields: receiptNumber, date, notes, category.
            // It does NOT handle Amount/Method.

            // Strategy: 
            // If single, call updatePayment (by ID) to allow full edit.
            // If split, call updatePaymentReceipt (by Receipt#) for restricted edit.

            let res;
            if (editReceipt.isSplit) {
                res = await updatePaymentReceipt(editReceipt.receiptNumber, {
                    paymentDate: editReceipt.date,
                    notes: editReceipt.notes,
                    category: editReceipt.category,
                    // receiptNumber change is risky if conflicts, but we can allow if supported
                });
            } else {
                // Determine the single ID
                const id = editReceipt.ids[0];
                // We need to pass amount/method from form?
                // The form below needs to handle this distinction.
                // For now, let's keep it simple: Use updatePaymentReceipt for EVERYONE for fields it supports.
                // If they need to change amount on a single payment, we can add that logic.

                // Let's pass the fields we have in the form.
                // If editReceipt has changed amount/method (only visible if single), we need to use updatePayment.

                // Wait, editReceipt state is a GroupedPayment object.
                // If I edit amount there, I need to know.

                // Let's simplfy: Always use updatePaymentReceipt for common fields.
                // And if it's single, we call updatePayment for Amount/Method if changed?

                // Actually, let's just use updatePaymentReceipt for all common fields.
                // And if it's single, we call updatePayment to update Amount/Method if needed.

                // For this iteration, let's implement updatePaymentReceipt for common fields.
                // And disable Amount/Method editing for everyone to ensure safety during this transition?
                // User said "update the same", likely meaning "view".
                // But generally users need to edit Amount if they made a typo.
                // So for Single payments, Amount edit is critical.

                // Split logic:
                if (editReceipt.isSplit) {
                    res = await updatePaymentReceipt(editReceipt.receiptNumber, {
                        paymentDate: editReceipt.date,
                        notes: editReceipt.notes,
                        category: editReceipt.category
                    });
                } else {
                    // Single
                    res = await updatePayment(editReceipt.ids[0], {
                        paymentDate: editReceipt.date,
                        notes: editReceipt.notes,
                        category: editReceipt.category,
                        amount: editReceipt.totalAmount, // Assuming input maps to this
                        paymentMethod: editReceipt.methods[0]
                    });
                }
            }

            if (res.success) {
                // Optimistic update tricky due to grouping. 
                // Simplest is to router.refresh() and let server reload, 
                // but we can try to update local state.

                // Ensure Date object is valid
                const newDate = new Date(editReceipt.date);

                setPayments(prev => prev.map(p => {
                    if (p.receiptNumber === editReceipt.receiptNumber) {
                        return {
                            ...p,
                            paymentDate: newDate,
                            notes: editReceipt.notes,
                            category: editReceipt.category,
                            // If single, update amount/method too
                            ...(editReceipt.isSplit ? {} : {
                                amount: editReceipt.totalAmount,
                                paymentMethod: editReceipt.methods[0]
                            })
                        };
                    }
                    return p;
                }));

                setEditReceipt(null);
                router.refresh();
            } else {
                alert(res.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to update');
        } finally {
            setLoading(null);
        }
    };

    const handleDownloadCSV = () => {
        const headers = ['Date', 'Receipt No', 'Exhibitor', 'Space', 'Category', 'Total Amount', 'Method', 'Notes', 'Collected By'];
        const rows = filteredPayments.map(p => [
            format(new Date(p.date), 'yyyy-MM-dd'),
            p.receiptNumber,
            `"${p.exhibitorName}"`,
            p.space,
            p.category,
            p.totalAmount.toFixed(2),
            p.methods.join(' + '),
            `"${p.notes || ''}"`,
            p.collectedBy || ''
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payment_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 w-full md:w-auto">
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
                    <div className="bg-slate-100 px-4 py-2 rounded-lg font-bold">
                        Total: ₹{totalAmount.toLocaleString('en-IN')}
                    </div>
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
                            <TableHead className="text-right">Actions</TableHead>
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
                            </TableRow>
                        ))}
                        {filteredPayments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
