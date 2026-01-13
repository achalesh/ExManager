'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDaybook, addTransaction, updateTransaction, deleteTransaction, closeDaybook, getRecentParticulars, DaybookData } from '@/app/daybook-actions';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Lock, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DaybookInterface({ eventId }: { eventId: number }) {
    const [date, setDate] = useState<Date>(new Date());
    const [data, setData] = useState<DaybookData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Transaction Form
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [transType, setTransType] = useState<'Expense' | 'Income'>('Expense');
    const [formData, setFormData] = useState({
        particulars: '',
        amount: '',
        category: '',
        paymentMethod: 'Cash'
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1); // -1 means none selected
    const particularsRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getRecentParticulars(eventId).then(setSuggestions);
    }, [eventId]);

    // Focus on open
    useEffect(() => {
        if (isAddOpen) {
            setTimeout(() => particularsRef.current?.focus(), 100);
        }
    }, [isAddOpen]);

    // Keyboard Navigation Handler
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === 'Enter') {
                return;
            }
            return;
        }

        const filtered = suggestions.filter(s => s.toLowerCase().includes(formData.particulars.toLowerCase()));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < filtered.length) {
                e.preventDefault();
                setFormData({ ...formData, particulars: filtered[activeIndex] });
                setShowSuggestions(false);
                setActiveIndex(-1);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getDaybook(eventId, date.toISOString());
            setData(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [date, eventId]);

    const handleSaveTransaction = async () => {
        if (!formData.particulars || !formData.amount) return;

        const payload = {
            eventId,
            date: date.toISOString(),
            particulars: formData.particulars,
            amount: parseFloat(formData.amount),
            category: formData.category,
            paymentMethod: formData.paymentMethod || 'Cash'
        };

        if (editingId) {
            await updateTransaction(editingId, payload);
            setEditingId(null);
            setIsAddOpen(false); // Close on edit success
        } else {
            await addTransaction(payload, transType);
        }

        if (!editingId) {
            // Only clear/keep open if adding new
            setFormData({ particulars: '', amount: '', category: '', paymentMethod: 'Cash' });
            // Re-focus for next entry
            setTimeout(() => particularsRef.current?.focus(), 50);
        } else {
            setFormData({ particulars: '', amount: '', category: '', paymentMethod: 'Cash' });
        }

        fetchData();
    };

    const handleEdit = (entry: any) => {
        setEditingId(parseInt(entry.id.split('-')[1]));
        setFormData({
            particulars: entry.particulars,
            amount: (entry.receiptAmount > 0 ? entry.receiptAmount : entry.paymentAmount).toString(),
            category: entry.category,
            paymentMethod: 'Cash'
        });
        setTransType(entry.type);
        setIsAddOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this entry?")) return;
        if (id.startsWith('tx-')) {
            await deleteTransaction(parseInt(id.split('-')[1]));
            fetchData();
        }
    };

    const handleCloseDay = async () => {
        if (!data) return;
        if (!confirm("Are you sure you want to close this day? This will lock the balances.")) return;

        await closeDaybook({
            eventId,
            date: date.toISOString(),
            closingBalance: data.closingBalance,
            totalIncome: data.totalReceipts,
            totalExpense: data.totalPayments,
            remarks: "Closed by user"
        });
        fetchData();
    };

    const changeDate = (days: number) => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        setDate(newDate);
    };

    const onOpenChange = (open: boolean) => {
        setIsAddOpen(open);
        if (!open) {
            setEditingId(null);
            setFormData({ particulars: '', amount: '', category: '', paymentMethod: 'Cash' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => changeDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="flex flex-col items-center">
                        <div className="text-sm text-gray-500">Daybook Date</div>
                        <Input
                            type="date"
                            value={format(date, 'yyyy-MM-dd')}
                            onChange={(e) => e.target.valueAsDate && setDate(e.target.valueAsDate)}
                            className="w-auto min-w-[150px] text-center font-bold text-lg border-none shadow-none focus-visible:ring-0 h-auto cursor-pointer bg-transparent"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => changeDate(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>

                <div className="flex gap-4 items-center">
                    {data?.isClosed ? (
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                            <Lock className="h-3 w-3" /> Day Closed
                        </div>
                    ) : (
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                            Open
                        </div>
                    )}
                    <Button onClick={() => setIsAddOpen(true)} disabled={data?.isClosed}>
                        <Plus className="mr-2 h-4 w-4" /> Add Entry
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : data ? (
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 bg-slate-50 border-b p-3 font-semibold text-slate-700">
                        <div className="col-span-8">Opening Balance b/d</div>
                        <div className={`col-span-2 text-right ${data.openingBalance < 0 ? 'text-red-700' : 'text-green-700'}`}>₹{data.openingBalance.toLocaleString()}</div>
                        <div className="col-span-2"></div>
                    </div>

                    <div className="grid grid-cols-12 bg-gray-100 border-b p-3 text-xs font-bold uppercase text-gray-500">
                        <div className="col-span-6">Particulars</div>
                        <div className="col-span-2 text-right">Receipt (In)</div>
                        <div className="col-span-2 text-right">Payment (Out)</div>
                        <div className="col-span-2 text-center">Actions</div>
                    </div>

                    <div className="divide-y max-h-[600px] overflow-y-auto">
                        {data.entries.length === 0 && (
                            <div className="p-8 text-center text-gray-400">No entries for this day.</div>
                        )}
                        {data.entries.map((entry) => (
                            <div key={entry.id} className="grid grid-cols-12 p-3 hover:bg-slate-50 items-center text-sm">
                                <div className="col-span-6">
                                    <div className="font-medium text-gray-900">{entry.particulars}</div>
                                </div>
                                <div className="col-span-2 text-right font-mono text-green-600">
                                    {entry.receiptAmount > 0 ? `₹${entry.receiptAmount.toLocaleString()}` : '-'}
                                </div>
                                <div className="col-span-2 text-right font-mono text-red-600">
                                    {entry.paymentAmount > 0 ? `₹${entry.paymentAmount.toLocaleString()}` : '-'}
                                </div>
                                <div className="col-span-2 text-center flex justify-center gap-1">
                                    {!entry.isAuto && !data.isClosed && (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 hover:text-blue-700" onClick={() => handleEdit(entry)}>
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-700" onClick={() => handleDelete(entry.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 border-t p-4 space-y-2">
                        <div className="grid grid-cols-12 text-sm font-semibold text-gray-500">
                            <div className="col-span-6 text-right pr-4">Totals:</div>
                            <div className="col-span-2 text-right border-t border-gray-300 pt-1">₹{data.totalReceipts.toLocaleString()}</div>
                            <div className="col-span-2 text-right border-t border-gray-300 pt-1">₹{data.totalPayments.toLocaleString()}</div>
                        </div>
                        <div className="grid grid-cols-12 text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <div className="col-span-6 text-right pr-4">Closing Balance c/d:</div>
                            <div className={`col-span-4 text-right px-2 rounded ${data.closingBalance < 0 ? 'text-red-700 bg-red-50' : 'text-indigo-700 bg-indigo-50'}`}>
                                ₹{data.closingBalance.toLocaleString()}
                            </div>
                        </div>

                        {!data.isClosed && (
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleCloseDay} className="bg-indigo-600 hover:bg-indigo-700">
                                    <Lock className="mr-2 h-4 w-4" /> Close Day Book
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            <Dialog open={isAddOpen} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Entry' : 'Add Daybook Entry'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-4">
                            <Button
                                variant={transType === 'Expense' ? 'default' : 'outline'}
                                onClick={() => setTransType('Expense')}
                                className="flex-1"
                            >
                                Expense (Payment)
                            </Button>
                            <Button
                                variant={transType === 'Income' ? 'default' : 'outline'}
                                onClick={() => setTransType('Income')}
                                className="flex-1"
                            >
                                Income (Receipt)
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label>Particulars / Description</Label>
                            <div className="relative">
                                <Input
                                    ref={particularsRef}
                                    value={formData.particulars}
                                    onChange={e => {
                                        setFormData({ ...formData, particulars: e.target.value });
                                        setActiveIndex(-1);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="e.g. Tea Expenses, Cash from HQ..."
                                    className="peer"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                        {suggestions
                                            .filter(s => s.toLowerCase().includes(formData.particulars.toLowerCase()))
                                            .map((s, i) => (
                                                <div
                                                    key={i}
                                                    className={`px-3 py-2 cursor-pointer text-sm ${i === activeIndex ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'}`}
                                                    onClick={() => {
                                                        setFormData({ ...formData, particulars: s });
                                                        setShowSuggestions(false);
                                                    }}
                                                    onMouseEnter={() => setActiveIndex(i)}
                                                >
                                                    {s}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleSaveTransaction()}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select
                                value={formData.paymentMethod || 'Cash'}
                                onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleSaveTransaction} className="w-full">
                            {editingId ? 'Update Entry' : 'Save Entry'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
