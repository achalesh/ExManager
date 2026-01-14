'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getNextReceiptNumber as fetchNextReceipt, recordPayment as savePaymentAction } from '@/app/payment-actions';
import { getExhibitorBillingDetails as fetchExhibitorDetails } from '@/app/billing-actions';
import { ReceiptSheet } from '../printing/ReceiptSheet';
import { Check, ChevronsUpDown, Loader2, Printer, Wallet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { PaymentHistoryList } from '../reports/PaymentHistoryList';

interface ExhibitorSummary {
    id: number;
    name: string;
    stallName?: string;
}

interface PaymentCollectionInterfaceProps {
    exhibitors: ExhibitorSummary[];
    eventId: number;
}

export function PaymentCollectionInterface({ exhibitors, eventId }: PaymentCollectionInterfaceProps) {
    const [selectedExhibitorId, setSelectedExhibitorId] = useState<number | null>(null);
    const [fetchedDetails, setFetchedDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);

    // Form State
    const [loading, setLoading] = useState(false);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        receiptNumber: '',
        category: 'General', // Default
        paymentMethod: 'Cash',
        referenceNumber: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Receipt State
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastPaymentData, setLastPaymentData] = useState<any>(null);
    const router = useRouter();

    const emptyDetails = {
        costs: { space: 0, material: 0, electrical: 0, shed: 0, total: 0 },
        paid: { space: 0, material: 0, electrical: 0, shed: 0, general: 0, total: 0 }
    };
    const details = fetchedDetails || emptyDetails;

    // Fetch Details when exhibitor changes
    useEffect(() => {
        if (selectedExhibitorId) {
            setLoadingDetails(true);
            fetchExhibitorDetails(selectedExhibitorId, eventId).then(data => {
                setFetchedDetails(data);
                setLoadingDetails(false);
            });
        } else {
            setFetchedDetails(null);
        }
    }, [selectedExhibitorId, eventId]);

    // Fetch Next Receipt Number on mount or after save
    const refreshReceiptNumber = () => {
        setReceiptLoading(true);
        fetchNextReceipt().then(num => {
            setFormData(prev => ({ ...prev, receiptNumber: num }));
            setReceiptLoading(false);
        });
    };

    useEffect(() => {
        refreshReceiptNumber();
    }, []);

    const [splits, setSplits] = useState<{ amount: string, method: string }[]>([
        { amount: '', method: 'Cash' },
        { amount: '', method: 'UPI' }
    ]);

    // Force Split logic always
    const totalAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    const handleSave = async (print: boolean) => {
        if (!selectedExhibitorId) return alert("Select an exhibitor");
        if (totalAmount <= 0) return alert("Total amount must be valid");

        setLoading(true);
        try {
            const paymentsToSave = [];

            // Create valid splits info
            const validSplits = splits.filter(s => parseFloat(s.amount) > 0);
            if (validSplits.length === 0) throw new Error("No valid amounts entered");

            for (const split of validSplits) {
                paymentsToSave.push({
                    exhibitorId: selectedExhibitorId,
                    eventId,
                    amount: parseFloat(split.amount),
                    paymentMethod: split.method,
                    // Use same receipt number for all splits
                    receiptNumber: formData.receiptNumber,
                    category: formData.category,
                    notes: formData.notes,
                    date: formData.date
                });
            }

            // Execute Saves
            const results = await Promise.all(paymentsToSave.map(p => savePaymentAction(p)));

            // Check results
            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                alert(`Some payments failed: ${failures.map(f => f.error).join(', ')}`);
            } else {
                // Success logic
                // Extract event/exhibitor from the first successful result
                const firstResultData = results[0].data;

                const paymentDataForReceipt = {
                    ...paymentsToSave[0],
                    receiptNumber: formData.receiptNumber, // No suffix, just the base number
                    amount: totalAmount,
                    paymentMethod: validSplits.length > 1 ? 'Split' : validSplits[0].method,
                    id: Date.now(),
                    event: firstResultData?.event,
                    exhibitor: firstResultData?.exhibitor
                };

                if (print) {
                    setLastPaymentData(paymentDataForReceipt);
                    setShowReceipt(true);
                }

                // Clear form
                setFormData(prev => ({ ...prev, notes: '' })); // Only clear notes
                setSplits([{ amount: '', method: 'Cash' }, { amount: '', method: 'UPI' }]);
                refreshReceiptNumber();

                // UX: Reset selection and focus search for next entry
                if (!print) {
                    // Only if not printing (because print opens a sheet, we don't want to lose context behind it immediately)
                    setSelectedExhibitorId(null);
                    // Small timeout to allow UI to reset before opening
                    setTimeout(() => setOpenCombobox(true), 100);
                } else {
                    // If printing, we keep context so they can see what they printed, 
                    // but maybe we can offer a "Next" button in the receipt sheet or just let them close it.
                    // For now, let's just refresh the details as before.
                    const updated = await fetchExhibitorDetails(selectedExhibitorId, eventId);
                    setFetchedDetails(updated);
                }

                router.refresh();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

        } catch (e: any) {
            console.error(e);
            alert("Failed to save: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-focus on mount
    useEffect(() => {
        // slight delay to ensure hydration
        const timer = setTimeout(() => setOpenCombobox(true), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="space-y-6">
            {/* Exhibitor Selection */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Select Exhibitor</CardTitle>
                </CardHeader>
                <CardContent>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className="w-full justify-between"
                            >
                                {selectedExhibitorId
                                    ? exhibitors.find((ex) => ex.id === selectedExhibitorId)?.name
                                    : "Search exhibitor..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                            <Command>
                                <CommandInput placeholder="Search exhibitor..." />
                                <CommandList>
                                    <CommandEmpty>No exhibitor found.</CommandEmpty>
                                    <CommandGroup>
                                        {exhibitors.map((ex) => (
                                            <CommandItem
                                                key={ex.id}
                                                value={ex.name}
                                                onSelect={() => {
                                                    setSelectedExhibitorId(ex.id);
                                                    setOpenCombobox(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedExhibitorId === ex.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span>{ex.name}</span>
                                                    <span className="text-xs text-gray-500">{ex.stallName}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            {/* Financial Cards - Now Always Visible */}
            {loadingDetails ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Space */}
                    <SummaryCard
                        title="Space / Rent"
                        cost={details.costs.space}
                        paid={details.paid.space}
                        onClick={() => setFormData(p => ({ ...p, category: 'Rent' }))}
                        active={formData.category === 'Rent'}
                    />
                    {/* Material */}
                    <SummaryCard
                        title="Material"
                        cost={details.costs.material}
                        paid={details.paid.material}
                        onClick={() => setFormData(p => ({ ...p, category: 'Material' }))}
                        active={formData.category === 'Material'}
                    />
                    {/* Electrical */}
                    <SummaryCard
                        title="Electrical"
                        cost={details.costs.electrical}
                        paid={details.paid.electrical}
                        onClick={() => setFormData(p => ({ ...p, category: 'Electrical' }))}
                        active={formData.category === 'Electrical'}
                    />
                    {/* Shed */}
                    <SummaryCard
                        title="Shed"
                        cost={details.costs.shed}
                        paid={details.paid.shed}
                        onClick={() => setFormData(p => ({ ...p, category: 'Shed' }))}
                        active={formData.category === 'Shed'}
                    />
                    {/* Total */}
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-gray-500 uppercase">Net Balance</CardTitle></CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className={`text-xl font-bold ${details.costs.total - details.paid.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ₹{(details.costs.total - details.paid.total).toLocaleString()}
                                {/* Payment History */}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                Total: ₹{details.costs.total.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Payment Form - Always Visible */}
            <Card>
                <CardHeader>
                    <CardTitle>Record Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={v => setFormData({ ...formData, category: v })}
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
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Receipt Number (Base)</Label>
                            <Input
                                value={formData.receiptNumber}
                                onChange={e => setFormData({ ...formData, receiptNumber: e.target.value })}
                                disabled={receiptLoading}
                                placeholder="RCP-..."
                            />
                        </div>
                    </div>

                    {/* Split Breakdown - Always Shown */}
                    <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                        <Label>Payment Breakdown</Label>
                        {splits.map((split, idx) => (
                            <div key={idx} className="flex gap-4 items-end">
                                <div className="w-1/3">
                                    <Label className="text-xs">Amount</Label>
                                    <Input
                                        type="number"
                                        value={split.amount}
                                        onChange={e => {
                                            const newSplits = [...splits];
                                            newSplits[idx].amount = e.target.value;
                                            setSplits(newSplits);
                                        }}
                                        placeholder="0.00"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSave(false);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-xs">Method</Label>
                                    <div className="flex flex-wrap gap-1">
                                        {['Cash', 'UPI'].map(m => (
                                            <div
                                                key={m}
                                                onClick={() => {
                                                    const newSplits = [...splits];
                                                    newSplits[idx].method = m;
                                                    setSplits(newSplits);
                                                }}
                                                className={`px-2 py-1 text-xs border rounded cursor-pointer ${split.method === m ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                                            >
                                                {m}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSplits(splits.filter((_, i) => i !== idx))}
                                    className="text-red-500"
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2">
                            <Button variant="outline" size="sm" onClick={() => setSplits([...splits, { amount: '', method: 'Cash' }])}>
                                + Add Payment Line
                            </Button>
                            <div className="text-lg font-bold">Total: ₹{totalAmount.toLocaleString()}</div>
                        </div>
                        <div className="pt-2">
                            <Label>Reference / Notes</Label>
                            <Input
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Optional notes for this transaction"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleSave(true)}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 h-4 w-4" />}
                            Save & Print Receipt
                        </Button>
                        <Button
                            className="flex-1"
                            variant="secondary"
                            onClick={() => handleSave(false)}
                            disabled={loading}
                        >
                            <Wallet className="mr-2 h-4 w-4" />
                            Save Only
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {showReceipt && lastPaymentData && (
                <ReceiptSheet
                    open={showReceipt}
                    onOpenChange={setShowReceipt}
                    payment={lastPaymentData}
                />
            )}

            {/* Payment History Section */}
            {selectedExhibitorId && details && details.payments && (
                <Card>
                    <CardContent className="pt-6">
                        <PaymentHistoryList
                            payments={details.payments}
                            onRefresh={async () => {
                                if (selectedExhibitorId) {
                                    const updated = await fetchExhibitorDetails(selectedExhibitorId, eventId);
                                    setFetchedDetails(updated);
                                    router.refresh();
                                }
                            }}
                            event={details.event}
                            exhibitor={details}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function SummaryCard({ title, cost, paid, onClick, active }: { title: string, cost: number, paid: number, onClick: () => void, active: boolean }) {
    const balance = cost - paid;
    return (
        <Card
            className={`cursor-pointer transition-all hover:border-indigo-400 ${active ? 'border-2 border-indigo-600 bg-indigo-50' : ''}`}
            onClick={onClick}
        >
            <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-gray-500 uppercase">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-gray-400">Due</span>
                    <span className="font-semibold text-sm">₹{cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs text-gray-400">Paid</span>
                    <span className="text-green-600 text-sm">₹{paid.toLocaleString()}</span>
                </div>
                <div className={`text-lg font-bold border-t pt-1 ${balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    ₹{balance.toLocaleString()}
                </div>
            </CardContent>
        </Card>
    );
}
