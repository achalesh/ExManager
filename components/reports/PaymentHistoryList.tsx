'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deletePayment, updatePayment } from "@/app/payment-actions";
import { Edit2, Trash2, Loader2, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReceiptSheet } from '../printing/ReceiptSheet';

interface Payment {
    id: number;
    amount: number;
    paymentMethod: string;
    receiptNumber: string;
    category: string;
    notes?: string;
    paymentDate: string | Date;
    collectedBy?: string;
}

interface PaymentHistoryListProps {
    payments: Payment[];
    onRefresh: () => void;
    event?: any;
    exhibitor?: any;
}

export function PaymentHistoryList({ payments, onRefresh, event, exhibitor }: PaymentHistoryListProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<number | null>(null);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

    // Receipt State
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    // Edit Form State
    const [editForm, setEditForm] = useState({
        amount: '',
        paymentMethod: '',
        category: '',
        notes: ''
    });

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this payment?")) return;
        setLoading(id);
        const res = await deletePayment(id);
        setLoading(null);
        if (res.success) {
            onRefresh();
        } else {
            alert((res as any).error);
        }
    };

    const startEdit = (p: Payment) => {
        setEditingPayment(p);
        setEditForm({
            amount: p.amount.toString(),
            paymentMethod: p.paymentMethod,
            category: p.category,
            notes: p.notes || ''
        });
    };

    const handleUpdate = async () => {
        if (!editingPayment) return;
        setLoading(editingPayment.id);

        const res = await updatePayment(editingPayment.id, {
            amount: parseFloat(editForm.amount),
            paymentMethod: editForm.paymentMethod,
            category: editForm.category,
            notes: editForm.notes
        });

        setLoading(null);
        if (res.success) {
            setEditingPayment(null);
            onRefresh();
        } else {
            alert((res as any).error);
        }
    };

    const handlePrint = (payment: Payment) => {
        setReceiptData({
            ...payment,
            event,
            exhibitor
        });
        setShowReceipt(true);
    };

    if (!payments || payments.length === 0) {
        return <div className="text-center p-4 text-gray-500 text-sm">No payment history found.</div>;
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">Payment History</h3>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Receipt</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[140px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="text-xs">
                                    {new Date(p.paymentDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                                <TableCell className="text-xs">{p.category}</TableCell>
                                <TableCell className="text-xs">{p.paymentMethod}</TableCell>
                                <TableCell className="text-right font-bold">₹{p.amount.toLocaleString()}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handlePrint(p)}
                                            title="Print Receipt"
                                        >
                                            <Printer className="h-4 w-4 text-gray-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => startEdit(p)}
                                            disabled={loading === p.id}
                                            title="Edit"
                                        >
                                            <Edit2 className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleDelete(p.id)}
                                            disabled={loading === p.id}
                                            title="Delete"
                                        >
                                            {loading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                value={editForm.amount}
                                onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Method</Label>
                            <Select
                                value={editForm.paymentMethod}
                                onValueChange={v => setEditForm({ ...editForm, paymentMethod: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={editForm.category}
                                onValueChange={v => setEditForm({ ...editForm, category: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Rent">Rent / Space</SelectItem>
                                    <SelectItem value="Material">Material</SelectItem>
                                    <SelectItem value="Electrical">Electrical</SelectItem>
                                    <SelectItem value="Shed">Shed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                value={editForm.notes}
                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={loading !== null}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Sheet */}
            {showReceipt && receiptData && (
                <ReceiptSheet
                    open={showReceipt}
                    onOpenChange={setShowReceipt}
                    payment={receiptData}
                />
            )}
        </div>
    );
}
