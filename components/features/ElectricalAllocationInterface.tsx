'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Zap, IndianRupee, Printer, Trash2, Pencil } from 'lucide-react';
import { ElectricalReceipt } from '../printing/ElectricalReceipt';
import { allocateElectrical, allocateBatchElectrical, deleteElectricalAllocation, updateElectricalAllocation, deleteExhibitorElectricalAllocations, updateExhibitorElectricalBillNumber } from '@/app/allocation-actions';

interface ElectricalAllocationInterfaceProps {
    items: any[];
    allocations: any[];
    exhibitors: any[];
    eventId: number;
}

export function ElectricalAllocationInterface({ items, allocations, exhibitors, eventId }: ElectricalAllocationInterfaceProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState({
        exhibitorId: 0,
        electricalItemId: 0,
        quantity: 1,
        billNumber: '',
    });
    const [pendingItems, setPendingItems] = useState<{ electricalItemId: number, quantity: number, billNumber?: string }[]>([]);

    const [editMode, setEditMode] = useState(false);
    const [editAllocationId, setEditAllocationId] = useState<number | null>(null);

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any[]>([]);

    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
    const [bulkEditExhibitor, setBulkEditExhibitor] = useState<any>(null);
    const [bulkBillNumber, setBulkBillNumber] = useState('');

    const handleBulkEdit = (group: any) => {
        setBulkEditExhibitor(group.exhibitor);
        setBulkBillNumber('');
        setIsBulkEditDialogOpen(true);
    };

    const submitBulkEdit = async () => {
        if (!bulkEditExhibitor) return;

        const res = await updateExhibitorElectricalBillNumber(bulkEditExhibitor.id, eventId, bulkBillNumber);
        if (res.success) {
            setIsBulkEditDialogOpen(false);
            setBulkEditExhibitor(null);
            setBulkBillNumber('');
        } else {
            alert(res.error);
        }
    };

    // Reset edit mode when dialog closes
    useEffect(() => {
        if (!open) {
            setEditMode(false);
            setEditAllocationId(null);
            setFormData({
                exhibitorId: 0,
                electricalItemId: 0,
                quantity: 1,
                billNumber: '',
            });
            setPendingItems([]);
            setError('');
        }
    }, [open]);

    const handleEdit = (allocation: any) => {
        setFormData({
            exhibitorId: allocation.exhibitorId,
            electricalItemId: allocation.electricalItemId,
            quantity: allocation.quantity,
            billNumber: allocation.billNumber || '',
        });
        setEditAllocationId(allocation.id);
        setEditMode(true);
        setOpen(true);
    };

    const handleAddItem = () => {
        if (formData.electricalItemId > 0 && formData.quantity > 0) {
            setPendingItems([...pendingItems, {
                electricalItemId: formData.electricalItemId,
                quantity: formData.quantity,
                billNumber: formData.billNumber
            }]);
            // Reset item selection but keep exhibitor
            setFormData({ ...formData, electricalItemId: 0, quantity: 1, billNumber: '' });
        }
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...pendingItems];
        newItems.splice(index, 1);
        setPendingItems(newItems);
    };

    async function handleSubmit() {
        setError('');
        setLoading(true);

        try {
            if (editMode && editAllocationId) {
                // Edit existing allocation
                const result = await updateElectricalAllocation({
                    allocationId: editAllocationId,
                    exhibitorId: formData.exhibitorId,
                    electricalItemId: formData.electricalItemId,
                    quantity: formData.quantity,
                    eventId,
                    billNumber: formData.billNumber
                });

                if (result.success) {
                    setOpen(false);
                    router.refresh();
                } else {
                    setError(result.error || 'Failed to update allocation');
                }
            } else {
                // Batch Allocation
                if (pendingItems.length === 0) {
                    // Start: Allow single item direct allocation if list is empty (for better UX)
                    if (formData.electricalItemId > 0) {
                        const result = await allocateBatchElectrical({
                            exhibitorId: formData.exhibitorId,
                            eventId,
                            items: [{
                                electricalItemId: formData.electricalItemId,
                                quantity: formData.quantity,
                                billNumber: formData.billNumber || undefined
                            }]
                        });
                        if (result.success) {
                            setOpen(false);
                            if (result.data) {
                                setReceiptData(result.data);
                                setShowReceipt(true);
                            }
                            router.refresh();
                            return;
                        } else {
                            setLoading(false);
                            return;
                        }
                    }
                    // End
                    setError("Please add items to allocate");
                    setLoading(false);
                    return;
                }

                const result = await allocateBatchElectrical({
                    exhibitorId: formData.exhibitorId,
                    eventId,
                    items: pendingItems
                });

                if (result.success) {
                    setOpen(false);
                    if (result.data) {
                        setReceiptData(result.data);
                        setShowReceipt(true);
                    }
                    router.refresh();
                } else {
                    setError(result.error || 'Failed to allocate electrical items');
                }
            }
        } catch (err) {
            setError('An error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Filter existing allocations for the selected exhibitor (outside the edit mode usually, but useful there too)
    const exhibitorCurrentAllocations = formData.exhibitorId
        ? allocations.filter(a => a.exhibitorId === formData.exhibitorId)
        : [];

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Allocation History</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Allocate Electrical
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editMode ? 'Edit Allocation' : 'Allocate Electrical Items'}</DialogTitle>
                            <DialogDescription>
                                {editMode ? 'Update existing allocation' : 'Assign electrical items to an exhibitor'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-md border space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Exhibitor *</label>
                                    <Select
                                        value={formData.exhibitorId.toString()}
                                        onValueChange={(value) => setFormData({ ...formData, exhibitorId: parseInt(value) })}
                                        disabled={loading || pendingItems.length > 0}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select exhibitor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {exhibitors.map((ex) => (
                                                <SelectItem key={ex.id} value={ex.id.toString()}>
                                                    {ex.name} {ex.faciaName ? `(${ex.faciaName})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Show Existing Allocations */}
                                {exhibitorCurrentAllocations.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm">
                                        <div className="font-semibold text-blue-800 mb-2 flex items-center justify-between">
                                            <span>Existing Allocations</span>
                                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                                                Total: ₹{exhibitorCurrentAllocations.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {exhibitorCurrentAllocations.map(item => (
                                                <div key={item.id} className="flex justify-between text-blue-700">
                                                    <span>{item.electricalItem.name} x {item.quantity}</span>
                                                    <span>₹{item.totalPrice}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-2">Electrical Item</label>
                                        <Select
                                            value={formData.electricalItemId.toString()}
                                            onValueChange={(value) => setFormData({ ...formData, electricalItemId: parseInt(value) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select item" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {items.map((item) => (
                                                    <SelectItem key={item.id} value={item.id.toString()}>
                                                        {item.name} - ₹{item.price} ({item.wattage}W)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Quantity</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Bill No (Optional)</label>
                                        <Input
                                            value={formData.billNumber || ''}
                                            onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                                            placeholder="e.g. BILL-001"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                {!editMode && (
                                    <Button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={formData.electricalItemId === 0}
                                        className="w-full"
                                        variant="secondary"
                                    >
                                        Add to List
                                    </Button>
                                )}
                            </div>

                            {/* Pending Items List - Only show in Create Mode */}
                            {!editMode && pendingItems.length > 0 && (
                                <div className="border rounded-md overflow-hidden">
                                    <div className="bg-gray-100 px-4 py-2 font-medium text-sm flex justify-between items-center">
                                        <span>Items to Allocate</span>
                                        <span className="text-xs text-gray-500">{pendingItems.length} items</span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto divide-y">
                                        {pendingItems.map((item, index) => {
                                            const originalItem = items.find(i => i.id === item.electricalItemId);
                                            return (
                                                <div key={index} className="px-4 py-2 flex justify-between items-center text-sm">
                                                    <div>
                                                        <span className="font-medium">{originalItem?.name}</span>
                                                        <span className="text-gray-500 ml-2">x {item.quantity}</span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 h-6 w-6 p-0 hover:bg-red-50"
                                                        onClick={() => handleRemoveItem(index)}
                                                    >
                                                        &times;
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                    {error}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSubmit} disabled={loading || (pendingItems.length === 0 && !editMode && formData.electricalItemId === 0) || formData.exhibitorId === 0}>
                                {loading ? 'Processing...' : (editMode ? 'Update Allocation' : `Allocate All`)}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {
                allocations.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No allocations yet</h3>
                        <p className="text-gray-600">
                            Start allocating electrical items to exhibitors
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
                                        Exhibitor
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/2">
                                        Allocated Items
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Total Price
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Object.values(allocations.reduce((acc: any, curr: any) => {
                                    const exhId = curr.exhibitorId;
                                    if (!acc[exhId]) {
                                        acc[exhId] = {
                                            exhibitor: curr.exhibitor,
                                            items: [],
                                            totalPrice: 0,
                                            latestDate: curr.createdAt
                                        };
                                    }
                                    acc[exhId].items.push(curr);
                                    acc[exhId].totalPrice += curr.totalPrice;
                                    if (new Date(curr.createdAt) > new Date(acc[exhId].latestDate)) {
                                        acc[exhId].latestDate = curr.createdAt;
                                    }
                                    return acc;
                                }, {})).map((group: any) => (
                                    <tr key={group.exhibitor.id} className="hover:bg-gray-50 align-top">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {group.exhibitor.name}
                                                {(() => {
                                                    const bills = Array.from(new Set(group.items.map((i: any) => i.billNumber).filter(Boolean)));
                                                    return bills.length > 0 ? (
                                                        <span className="ml-2 text-green-600 text-xs font-semibold">
                                                            (Bill: {bills.join(', ')})
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </div>
                                            {group.exhibitor.faciaName && (
                                                <div className="text-xs text-gray-600 font-medium">
                                                    ({group.exhibitor.faciaName})
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                                Last Updated: {new Date(group.latestDate).toLocaleDateString('en-GB')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-3">
                                                {group.items.map((allocation: any) => (
                                                    <div key={allocation.id} className="group flex items-start justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {allocation.electricalItem.name}
                                                                <span className="ml-2 text-gray-500 font-normal">
                                                                    (Qty: {allocation.quantity})
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {allocation.electricalItem.wattage}W each
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-4">
                                                            <div className="text-orange-600 font-semibold text-xs flex items-center">
                                                                <Zap className="h-3 w-3 mr-0.5" />
                                                                {allocation.totalWattage}W
                                                            </div>
                                                            <span className="text-gray-600 font-medium whitespace-nowrap ml-2">
                                                                ₹{allocation.totalPrice.toFixed(2)}
                                                            </span>
                                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 ml-2"
                                                                    onClick={() => handleEdit(allocation)}
                                                                    title="Edit Item"
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 ml-1"
                                                                    onClick={async () => {
                                                                        if (confirm(`Delete ${allocation.quantity} x ${allocation.electricalItem.name}?`)) {
                                                                            const res = await deleteElectricalAllocation(allocation.id);
                                                                            if (!res.success) alert(res.error);
                                                                        }
                                                                    }}
                                                                    title="Delete Item"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="text-base font-bold text-gray-900">
                                                <IndianRupee className="h-4 w-4 inline mr-0.5" />
                                                {group.totalPrice.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex flex-col gap-2 items-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setReceiptData(group.items);
                                                        setShowReceipt(true);
                                                    }}
                                                    className="text-xs w-full"
                                                >
                                                    <Printer className="h-3 w-3 mr-1" />
                                                    Print Bill
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleBulkEdit(group)}
                                                    className="text-xs w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                                >
                                                    <Pencil className="h-3 w-3 mr-1" />
                                                    Edit Bill No
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={async () => {
                                                        if (confirm(`Are you sure you want to delete ALL electrical allocations for ${group.exhibitor.name}? This cannot be undone.`)) {
                                                            const res = await deleteExhibitorElectricalAllocations(group.exhibitor.id, eventId);
                                                            if (!res.success) alert(res.error);
                                                        }
                                                    }}
                                                    className="text-xs w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Delete All
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Common Bill Number</DialogTitle>
                        <DialogDescription>
                            Enter a bill number to apply to ALL electrical allocations for {bulkEditExhibitor?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bulk-billNumber" className="text-right">
                                Bill Number
                            </Label>
                            <Input
                                id="bulk-billNumber"
                                value={bulkBillNumber}
                                onChange={(e) => setBulkBillNumber(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter Bill No."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={submitBulkEdit}>Update All</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ElectricalReceipt
                open={showReceipt}
                onOpenChange={setShowReceipt}
                allocations={receiptData}
            />
        </div >
    );
}
