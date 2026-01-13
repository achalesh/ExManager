'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordPayment, getNextReceiptNumber } from '@/app/payment-actions';
import { PlusCircle } from 'lucide-react';
import { ReceiptSheet } from './ReceiptSheet'; // We will create this next

interface PaymentDialogProps {
    exhibitorId: number;
    eventId: number;
    suggestedAmount?: number;
    onSuccess?: () => void;
    children?: React.ReactNode;
}

export function PaymentDialog({ exhibitorId, eventId, suggestedAmount = 0, onSuccess, children }: PaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [error, setError] = useState('');

    // Receipt Printing State
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastPaymentData, setLastPaymentData] = useState<any>(null);

    const [formData, setFormData] = useState({
        amount: suggestedAmount.toString(),
        receiptNumber: '',
        category: 'General',
        paymentMethod: 'Cash',
        referenceNumber: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (open) {
            setReceiptLoading(true);
            getNextReceiptNumber().then(num => {
                setFormData(prev => ({ ...prev, receiptNumber: num }));
                setReceiptLoading(false);
            });
        }
    }, [open]);

    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid amount');
            setLoading(false);
            return;
        }

        const res = await recordPayment({
            exhibitorId,
            eventId,
            amount,
            receiptNumber: formData.receiptNumber,
            category: formData.category,
            paymentMethod: formData.paymentMethod,
            referenceNumber: formData.referenceNumber,
            notes: formData.notes,
            date: formData.date
        });

        if (res.success) {
            setLastPaymentData({
                ...formData,
                amount,
                exhibitorId, // In a real app we might fetch the full Exhibitor name here or pass it in props
                id: Date.now() // Temp ID for print view if needed
            });
            setShowReceipt(true);
            setOpen(false);
            router.refresh();
            if (onSuccess) onSuccess();
        } else {
            setError(res.error || 'Failed to record payment');
        }
        setLoading(false);
    }

    if (showReceipt && lastPaymentData) {
        return (
            <ReceiptSheet
                open={showReceipt}
                onOpenChange={setShowReceipt}
                payment={lastPaymentData}
            />
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Record Payment
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Enter payment details and receipt number.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Receipt Number</Label>
                            <Input
                                value={formData.receiptNumber}
                                onChange={e => setFormData({ ...formData, receiptNumber: e.target.value })}
                                disabled={receiptLoading || loading}
                                placeholder="Loading..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                            value={formData.category}
                            onValueChange={v => setFormData({ ...formData, category: v })}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
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
                        <Label>Amount (₹)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select
                                value={formData.paymentMethod}
                                onValueChange={v => setFormData({ ...formData, paymentMethod: v })}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
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
                            <Label>Reference No. (Optional)</Label>
                            <Input
                                value={formData.referenceNumber}
                                onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                                disabled={loading}
                                placeholder="Ref / Cheque #"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Input
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading || receiptLoading}>Save & Print Receipt</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
