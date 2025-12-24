'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addTransaction } from '@/app/accounts-actions';
import { useRouter } from 'next/navigation';
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Labor/Wages', 'Material', 'Electrical', 'Shed', 'General', 'Refund'];
const INCOME_CATEGORIES = ['Scrap Sale', 'Stall Booking', 'Refund Received', 'General'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

export function AddTransactionDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('Expense');
    const [category, setCategory] = useState('');

    // We start with today's date formatted as YYYY-MM-DD for the input
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        // Manually set type in formData since we might use custom buttons
        formData.set('type', type);

        const result = await addTransaction(formData);

        if (result.success) {
            setOpen(false);
            setCategory('');
            router.refresh();
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Daily Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Type Selection */}
                    <div className="space-y-2">
                        <Label>Transaction Type</Label>
                        <div className="flex space-x-4">
                            <div
                                onClick={() => setType('Expense')}
                                className={`flex items-center justify-center space-x-2 border rounded-md p-3 cursor-pointer w-full transition-colors ${type === 'Expense' ? 'bg-red-50 border-red-500 text-red-700' : 'hover:bg-gray-50'}`}
                            >
                                <ArrowDownCircle className={`h-4 w-4 ${type === 'Expense' ? 'text-red-600' : 'text-gray-500'}`} />
                                <span className="font-medium">Expense</span>
                            </div>

                            <div
                                onClick={() => setType('Income')}
                                className={`flex items-center justify-center space-x-2 border rounded-md p-3 cursor-pointer w-full transition-colors ${type === 'Income' ? 'bg-green-50 border-green-500 text-green-700' : 'hover:bg-gray-50'}`}
                            >
                                <ArrowUpCircle className={`h-4 w-4 ${type === 'Income' ? 'text-green-600' : 'text-gray-500'}`} />
                                <span className="font-medium">Income</span>
                            </div>
                        </div>
                        <input type="hidden" name="type" value={type} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Transaction Date */}
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                name="transactionDate"
                                type="date"
                                required
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value)}
                            />
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                min="0.01"
                                step="any"
                                required
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select name="category" onValueChange={setCategory} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {(type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Fallback hidden input/custom logic if they want 'Other' but keeping simple for now */}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select name="paymentMethod" defaultValue="Cash" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Method" />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHODS.map(method => (
                                    <SelectItem key={method} value={method}>{method}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            name="description"
                            placeholder="Details about the transaction..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Transaction'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
