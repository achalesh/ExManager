'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Edit2, Trash2, Filter, Loader2, Download } from 'lucide-react';
import { updatePayment, deletePayment } from '@/app/payment-actions';
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

export function PaymentReportTable({ initialPayments }: { initialPayments: Payment[] }) {
    const [payments, setPayments] = useState(initialPayments);
    const [searchTerm, setSearchTerm] = useState('');
    const [methodFilter, setMethodFilter] = useState('All');
    const [loading, setLoading] = useState<number | null>(null);
    const [editPayment, setEditPayment] = useState<Payment | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const router = useRouter();

    // Filtering
    const filteredPayments = payments.filter(p => {
        const matchesSearch =
            p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.exhibitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.space.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMethod = methodFilter === 'All' || p.paymentMethod === methodFilter;
        return matchesSearch && matchesMethod;
    });

    // Stats
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    // Handlers
    const handleDelete = async () => {
        if (!deleteId) return;
        setLoading(deleteId);
        try {
            const res = await deletePayment(deleteId);
            if (res.success) {
                setPayments(payments.filter(p => p.id !== deleteId));
                setDeleteId(null);
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
        if (!editPayment) return;
        setLoading(editPayment.id);

        try {
            const res = await updatePayment(editPayment.id, {
                amount: editPayment.amount,
                paymentMethod: editPayment.paymentMethod,
                category: editPayment.category,
                notes: editPayment.notes,
                paymentDate: editPayment.paymentDate
            });

            if (res.success) {
                setPayments(payments.map(p => p.id === editPayment.id ? { ...p, ...editPayment } : p));
                setEditPayment(null);
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
        const headers = ['Date', 'Receipt No', 'Exhibitor', 'Space', 'Category', 'Amount', 'Method', 'Notes', 'Collected By'];
        const rows = filteredPayments.map(p => [
            format(new Date(p.paymentDate), 'yyyy-MM-dd'),
            p.receiptNumber,
            `"${p.exhibitorName}"`,
            p.space,
            p.category,
            p.amount.toFixed(2),
            p.paymentMethod,
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
                        Total: ₹{totalAmount.toLocaleString()}
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
                            <TableRow key={payment.id}>
                                <TableCell>{format(new Date(payment.paymentDate), 'dd MMM yyyy')}</TableCell>
                                <TableCell className="font-mono">{payment.receiptNumber}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{payment.exhibitorName}</div>
                                    <div className="text-xs text-muted-foreground">{payment.space}</div>
                                </TableCell>
                                <TableCell>{payment.category}</TableCell>
                                <TableCell className="text-right font-bold">₹{payment.amount.toLocaleString()}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs border ${payment.paymentMethod === 'Cash' ? 'bg-green-50 border-green-200 text-green-700' :
                                        payment.paymentMethod === 'UPI' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                            'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}>
                                        {payment.paymentMethod}
                                    </span>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={payment.notes}>{payment.notes}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditPayment(payment)}>
                                            <Edit2 className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(payment.id)}>
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
            <Dialog open={!!editPayment} onOpenChange={(o) => !o && setEditPayment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Payment</DialogTitle>
                        <DialogDescription>
                            {editPayment?.receiptNumber} - {editPayment?.exhibitorName}
                        </DialogDescription>
                    </DialogHeader>
                    {editPayment && (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Payment Date</Label>
                                <Input
                                    type="date"
                                    value={format(new Date(editPayment.paymentDate), 'yyyy-MM-dd')}
                                    onChange={e => setEditPayment({ ...editPayment, paymentDate: new Date(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input
                                        type="number"
                                        value={editPayment.amount}
                                        onChange={e => setEditPayment({ ...editPayment, amount: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Method</Label>
                                    <Select
                                        value={editPayment.paymentMethod}
                                        onValueChange={v => setEditPayment({ ...editPayment, paymentMethod: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={editPayment.category}
                                    onValueChange={v => setEditPayment({ ...editPayment, category: v })}
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
                                    value={editPayment.notes || ''}
                                    onChange={e => setEditPayment({ ...editPayment, notes: e.target.value })}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditPayment(null)}>Cancel</Button>
                                <Button type="submit" disabled={loading === editPayment.id}>
                                    {loading === editPayment.id && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Payment?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete this payment record.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading === deleteId}>
                            {loading === deleteId && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
