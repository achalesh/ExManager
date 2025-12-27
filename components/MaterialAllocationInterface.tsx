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
import { Plus, Package, IndianRupee } from 'lucide-react';
import { allocateMaterial, allocateScannedItems, allocateMaterialItems, deleteMaterialAllocation, updateMaterialAllocation, allocateBatchMaterials, deleteExhibitorMaterialAllocations, updateExhibitorMaterialBillNumber } from '@/app/allocation-actions';
import { Scan, X, Trash2, Pencil, Printer } from 'lucide-react';
import { MaterialReceipt } from './MaterialReceipt';

interface MaterialAllocationInterfaceProps {
    materials: any[];
    allocations: any[];
    exhibitors: any[];
    eventId: number;
}

export function MaterialAllocationInterface({ materials, allocations, exhibitors, eventId }: MaterialAllocationInterfaceProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [scanMode, setScanMode] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        exhibitorId: 0,
        materialId: 0,
        quantity: 1,
        focQuantity: 0, // Split allocation
        isFOC: false,
    });

    const [trackItems, setTrackItems] = useState(true);
    const [itemSuffixes, setItemSuffixes] = useState<string[]>([]);
    const [suffixInput, setSuffixInput] = useState('');


    const addSuffixesFromInput = (input: string) => {
        if (input.toLowerCase() === 'na') {
            setTrackItems(false);
            setItemSuffixes([]);
            setSuffixInput('');
            return;
        }

        const parts = input.split(',').map(s => s.trim()).filter(s => s !== '');
        const newSuffixes = parts.filter(p => !itemSuffixes.includes(p));

        if (newSuffixes.length > 0) {
            setItemSuffixes(prev => [...prev, ...newSuffixes]);
        }
        setSuffixInput('');
    };

    const handleSuffixKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSuffixesFromInput(e.currentTarget.value);
        }
    };

    // We don't need parseSuffix or distinct addSuffix anymore if we use the above.
    // Let's replace the whole block from 39 to 60.

    // Original removeSuffix is fine.

    const removeSuffix = (val: string) => {
        setItemSuffixes(itemSuffixes.filter(s => s !== val));
    };

    const [editMode, setEditMode] = useState(false);
    const [editAllocationId, setEditAllocationId] = useState<number | null>(null);

    const handleEdit = (allocation: any) => {
        setFormData({
            exhibitorId: allocation.exhibitorId,
            materialId: allocation.materialId,
            quantity: allocation.quantity,
            focQuantity: 0, // Edit mode doesn't support split edit yet
            isFOC: allocation.isFOC
        });

        // Handle tracked items
        if (allocation.items && allocation.items.length > 0) {
            setTrackItems(true);
            const suffixes = allocation.items.map((i: any) => i.uniqueCode.split('-').pop());
            // Assumption: suffix is last part. Or safely use full code? 
            // The allocate function expects suffixes if we want to match, but here we might want to display the full code or just the ID part.
            // If the code is "MAT-CHAIR-001", suffix is "001".
            // The allocation action finds items where uniqueCode endsWith suffix.
            // So extracting suffix is correct.
            setItemSuffixes(suffixes);
        } else {
            setTrackItems(false);
            setItemSuffixes([]);
        }

        setEditMode(true);
        setEditAllocationId(allocation.id);
        setOpen(true);
    };

    // Reset form when dialog closes (if not submitting logic handles it)
    useEffect(() => {
        if (!open) {
            setEditMode(false);
            setEditAllocationId(null);
            setFormData({
                exhibitorId: 0,
                materialId: 0,
                quantity: 1,
                focQuantity: 0,
                isFOC: false,
                billNumber: '',
            });
            setTrackItems(true);
            setItemSuffixes([]);
            setError(''); // Clear any previous errors
            setScanMode(false); // Reset scan mode
        }
    }, [open]);


    // Batch Allocation State
    const [batchItems, setBatchItems] = useState<any[]>([]);

    // Receipt State
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

        const res = await updateExhibitorMaterialBillNumber(bulkEditExhibitor.id, eventId, bulkBillNumber);
        if (res.success) {
            setIsBulkEditDialogOpen(false);
            setBulkEditExhibitor(null);
            setBulkBillNumber('');
        } else {
            alert(res.error);
        }
    };

    const addToBatch = () => {
        // Validate current form
        if (formData.materialId === 0) {
            setError('Please select a material');
            return;
        }
        if (formData.quantity < 1 && !trackItems) {
            setError('Quantity must be at least 1');
            return;
        }
        if (trackItems && itemSuffixes.length === 0) {
            setError('Please add at least one Item ID');
            return;
        }
        if (trackItems && itemSuffixes.length !== formData.quantity && formData.quantity !== 1) {
            // If manual quantity input vs suffixes mismatch?
            // Actually, usually in track mode, quantity is derived from suffixes.
            // But let's strictly check if they match or just override quantity.
            // For now, if tracked, quantity is derived from suffixes.
        }

        const material = materials.find(m => m.id === formData.materialId);
        if (!material) {
            setError('Selected material not found.');
            return;
        }

        // Add to list
        const newItem = {
            id: Date.now(), // temp id
            materialName: material.name,
            materialId: formData.materialId,
            quantity: trackItems ? itemSuffixes.length : formData.quantity,
            focQuantity: formData.focQuantity,
            suffixes: trackItems ? [...itemSuffixes] : [],
            isTracked: trackItems,
            billNumber: formData.billNumber
        };

        setBatchItems([...batchItems, newItem]);

        // Reset inputs but keep Exhibitor
        setFormData(prev => ({
            ...prev,
            materialId: 0,
            quantity: 1,
            focQuantity: 0,
            quantity: 1,
            focQuantity: 0,
            isFOC: false,
            billNumber: ''
        }));
        setTrackItems(true);
        setItemSuffixes([]);
        setError('');
        setScanMode(false);
    };

    const removeFromBatch = (id: number) => {
        setBatchItems(batchItems.filter(i => i.id !== id));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let result;

            // If Edit Mode -> Single Item Update (Legacy path for editing)
            if (editMode && editAllocationId) {
                result = await updateMaterialAllocation({
                    allocationId: editAllocationId,
                    exhibitorId: formData.exhibitorId,
                    materialId: formData.materialId,
                    quantity: formData.quantity,
                    suffixes: trackItems ? itemSuffixes : undefined,
                    eventId,
                    isFOC: formData.isFOC,
                    billNumber: formData.billNumber
                });
            } else {
                // Batch Allocation
                // If user has pending item in form, warn them or auto-add?
                // Let's require them to "Add" first, OR if list is empty, submit current form as single item.

                let finalItems = [...batchItems];

                // If list is empty, try to use current form data (Single Allocation behavior preserved)
                if (finalItems.length === 0) {
                    if (formData.materialId === 0) {
                        setError("Please select a material or add items to the list");
                        setLoading(false);
                        return;
                    }
                    // Add current form data as one item
                    finalItems.push({
                        materialId: formData.materialId,
                        quantity: trackItems ? itemSuffixes.length : formData.quantity,
                        focQuantity: formData.focQuantity,
                        suffixes: trackItems ? itemSuffixes : undefined,
                        billNumber: formData.billNumber
                    });
                }

                // If user has items in list AND filled out form but didn't click add?
                // UX: Just ignore form or ask?
                // Simplest: only submit what's in list if list > 0.
                if (batchItems.length > 0 && formData.materialId !== 0) {
                    // warn or just ignore?
                    // Let's implicit add if valid? No, too risky.
                }

                // Construct payload
                const payload = {
                    exhibitorId: formData.exhibitorId,
                    eventId,
                    items: finalItems.map(i => ({
                        materialId: i.materialId,
                        quantity: i.quantity,
                        focQuantity: i.focQuantity,
                        suffixes: i.suffixes && i.suffixes.length > 0 ? i.suffixes : undefined,
                        billNumber: i.billNumber
                    }))
                };

                result = await allocateBatchMaterials(payload);
            }

            if (result.success) {
                setOpen(false);
                setBatchItems([]);
                setFormData({
                    exhibitorId: 0,
                    materialId: 0,
                    quantity: 1,
                    focQuantity: 0,
                    isFOC: false,
                });
                // Open Receipt if data returned
                if (result.data) {
                    setReceiptData(result.data);
                    setShowReceipt(true);
                }
                router.refresh();
            } else {
                setError(result.error || 'Failed to process request');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Allocation History</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Allocate Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editMode ? 'Edit Allocation' : 'Allocate Material'}</DialogTitle>
                            <DialogDescription>
                                {editMode ? 'Update existing allocation' : 'Assign materials to an exhibitor'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex border-b mb-4">
                            <button
                                className={`px-4 py-2 font-medium text-sm ${!scanMode ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setScanMode(false)}
                            >
                                Manual Selection
                            </button>
                            <button
                                className={`px-4 py-2 font-medium text-sm ${scanMode ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setScanMode(true)}
                            >
                                Scan QR Code
                            </button>
                        </div>

                        {!scanMode ? (
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-4 py-4">
                                    {/* Exhibitor Selection - Always Visible */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Exhibitor *</label>
                                        <Select
                                            value={formData.exhibitorId.toString()}
                                            onValueChange={(value) => setFormData({ ...formData, exhibitorId: parseInt(value) })}
                                            disabled={loading || batchItems.length > 0} // Lock exhibitor if items added
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select exhibitor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {exhibitors.map((ex) => (
                                                    <SelectItem key={ex.id} value={ex.id.toString()}>
                                                        {ex.name} {ex.faciaName ? `(Facia: ${ex.faciaName})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Batch List Display */}
                                    {!editMode && batchItems.length > 0 && (
                                        <div className="bg-gray-50 rounded-md p-3 border">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Items to Allocate:</h4>
                                            <div className="space-y-2">
                                                {batchItems.map((item, idx) => (
                                                    <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                                        <div>
                                                            <span className="font-semibold">{item.materialName}</span>
                                                            <span className="mx-2 text-gray-400">|</span>
                                                            <span>Qty: {item.quantity} (FOC: {item.focQuantity})</span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeFromBatch(item.id)}
                                                            className="text-red-500 h-6 w-6 p-0 hover:bg-red-50"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t my-2 pt-4">
                                        <h4 className="text-sm font-semibold mb-3 text-gray-600">
                                            {editMode ? 'Edit Item' : 'Add Item'}
                                        </h4>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Material *</label>
                                            <Select
                                                value={formData.materialId.toString()}
                                                onValueChange={(value) => {
                                                    setFormData({ ...formData, materialId: parseInt(value), quantity: 1 });
                                                    setTrackItems(true);
                                                    setItemSuffixes([]);
                                                }}
                                                disabled={loading}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select material" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {materials.map((mat) => (
                                                        <SelectItem key={mat.id} value={mat.id.toString()}>
                                                            {mat.name} - ₹{mat.price}/{mat.unit}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="mt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium">
                                                    {trackItems ? 'Item IDs (Last 3+ digits) *' : 'Quantity *'}
                                                </label>
                                                {!trackItems && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTrackItems(true)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                    >
                                                        Switch to Tracked
                                                    </button>
                                                )}
                                            </div>

                                            {trackItems ? (
                                                <>
                                                    <div className="border rounded-md p-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 ring-offset-2">
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {itemSuffixes.map((tag, idx) => (
                                                                <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                                                    {tag}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeSuffix(tag)}
                                                                        className="ml-1 text-blue-600 hover:text-blue-900"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <Input
                                                            value={suffixInput}
                                                            onChange={(e) => setSuffixInput(e.target.value)}
                                                            onKeyDown={handleSuffixKeyDown}
                                                            placeholder="Type suffix & Enter (or 'na' for bulk)"
                                                            className="border-none shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
                                                            disabled={loading}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Matched quantity: {itemSuffixes.length}
                                                    </p>
                                                </>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={formData.quantity}
                                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                                    className="bg-white"
                                                    disabled={loading}
                                                />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 mt-4 bg-gray-50 p-3 rounded-md">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium mb-1">FOC Quantity (Free)</label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={trackItems ? itemSuffixes.length : formData.quantity}
                                                    value={formData.focQuantity ?? 0}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        setFormData({ ...formData, focQuantity: isNaN(val) ? 0 : val });
                                                    }}
                                                    disabled={loading}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="flex-1 pt-6 text-sm text-gray-600">
                                                <p>Paid: {Math.max(0, (trackItems ? itemSuffixes.length : formData.quantity) - formData.focQuantity)}</p>
                                                <p>Free: {formData.focQuantity}</p>
                                            </div>
                                        </div>

                                        {/* Add Button */}
                                        <div className="mt-4 flex justify-end">
                                            {!editMode && (
                                                <Button type="button" variant="secondary" onClick={addToBatch} disabled={formData.materialId === 0}>
                                                    Add to List
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                            {error}
                                        </div>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                                        Cancel
                                    </Button>
                                    {/* Submit Button logic: 
                                        If Edit Mode: Update
                                        If Batch Mode: 
                                            If items in list -> "Allocate All (N)"
                                            If no items -> "Allocate" (Single)
                                    */}
                                    <Button type="submit" disabled={loading || formData.exhibitorId === 0 || (batchItems.length === 0 && formData.materialId === 0)}>
                                        {loading ?
                                            (editMode ? 'Updating...' : 'Allocating...') :
                                            (editMode ? 'Update' : (batchItems.length > 0 ? `Allocate All (${batchItems.length})` : 'Allocate'))
                                        }
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <ScanAllocationForm
                                exhibitors={exhibitors}
                                eventId={eventId}
                                onSuccess={() => {
                                    setOpen(false);
                                    router.refresh();
                                }}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {allocations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No allocations yet</h3>
                    <p className="text-gray-600">
                        Start allocating materials to exhibitors
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
                                    Allocated Material Details
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
                                                            {allocation.material.name}
                                                            <span className="ml-2 text-gray-500 font-normal">
                                                                (Qty: {allocation.quantity})
                                                            </span>
                                                            {allocation.isFOC && (
                                                                <span className="ml-2 bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">FOC</span>
                                                            )}
                                                        </div>
                                                        {allocation.items && allocation.items.length > 0 && (
                                                            <div className="text-xs text-blue-600 mt-0.5">
                                                                IDs: {allocation.items.map((i: any) => i.uniqueCode.split('-').pop()).join(', ')}
                                                            </div>
                                                        )}
                                                        {allocation.billNumber && (
                                                            <div className="text-xs text-green-600 mt-0.5 font-medium">
                                                                Bill No: {allocation.billNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-4">
                                                        <span className="text-gray-600 font-medium whitespace-nowrap">
                                                            ₹{allocation.totalPrice.toFixed(2)}
                                                        </span>
                                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                                                onClick={() => handleEdit(allocation)}
                                                                title="Edit Item"
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                                                onClick={async () => {
                                                                    if (confirm(`Delete ${allocation.quantity} x ${allocation.material.name}?`)) {
                                                                        const res = await deleteMaterialAllocation(allocation.id);
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
                                                    if (confirm(`Are you sure you want to delete ALL material allocations for ${group.exhibitor.name}? This cannot be undone.`)) {
                                                        const res = await deleteExhibitorMaterialAllocations(group.exhibitor.id, eventId);
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
            )}

            <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Common Bill Number</DialogTitle>
                        <DialogDescription>
                            Enter a bill number to apply to ALL material allocations for {bulkEditExhibitor?.name}.
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

            <MaterialReceipt
                open={showReceipt}
                onOpenChange={setShowReceipt}
                allocations={receiptData}
            />
        </div>
    );

}

import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

function ScanAllocationForm({ exhibitors, eventId, onSuccess }: { exhibitors: any[], eventId: number, onSuccess: () => void }) {
    const [codes, setCodes] = useState<string[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [exhibitorId, setExhibitorId] = useState(0);
    const [isFOC, setIsFOC] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCamera, setShowCamera] = useState(false);

    // Camera Scanner logic
    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        if (showCamera) {
            scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render((decodedText) => {
                if (decodedText) {
                    setCodes(prev => {
                        if (prev.includes(decodedText)) return prev;
                        return [...prev, decodedText];
                    });
                    // Optional: Close camera after successful scan? 
                    // No, continuous scanning is better for bulk.
                    // Just show a visual feedback maybe, but list updates automatically.
                }
            }, (error) => {
                // simple ignore
            });
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(error => console.error("Failed to clear html5-qrcode scanner. ", error));
            }
        };
    }, [showCamera]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.currentTarget.value;
            if (val.trim()) {
                if (codes.includes(val.trim())) {
                    setCurrentInput('');
                    return;
                }
                setCodes(prev => [...prev, val.trim()]);
                setCurrentInput('');
            }
        }
    };

    const handleRemove = (code: string) => {
        setCodes(codes.filter(c => c !== code));
    };

    const handleSubmit = async () => {
        if (exhibitorId === 0 || codes.length === 0) return;
        setLoading(true);
        setError('');

        const result = await allocateScannedItems({
            exhibitorId,
            eventId,
            codes,
            isFOC
        });

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error || 'Failed.');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">Exhibitor *</label>
                <Select
                    value={exhibitorId.toString()}
                    onValueChange={(value) => setExhibitorId(parseInt(value))}
                    disabled={loading}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select exhibitor" />
                    </SelectTrigger>
                    <SelectContent>
                        {exhibitors.map((ex) => (
                            <SelectItem key={ex.id} value={ex.id.toString()}>
                                {ex.name} {ex.faciaName ? `(Facia: ${ex.faciaName})` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="p-4 bg-gray-50 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium flex items-center gap-2">
                        <Scan className="h-4 w-4" />
                        Scan QR Code
                    </label>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCamera(!showCamera)}
                        className="gap-2"
                    >
                        {showCamera ? (
                            <>
                                <CameraOff className="h-4 w-4" />
                                Stop Camera
                            </>
                        ) : (
                            <>
                                <Camera className="h-4 w-4" />
                                Use Camera
                            </>
                        )}
                    </Button>
                </div>

                {showCamera && (
                    <div className="mb-4">
                        <div id="reader" className="w-full"></div>
                        <p className="text-xs text-center text-gray-500 mt-1">Point your camera at a QR code</p>
                    </div>
                )}

                <div className="mb-2">
                    <Input
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={showCamera ? "Or type/scan manual code..." : "Focus here and scan using USB scanner..."}
                        autoFocus={!showCamera}
                        disabled={loading}
                    />
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1">
                    {codes.map((code, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                            <span className="font-mono">{code}</span>
                            <button onClick={() => handleRemove(code)} className="text-red-500 hover:text-red-700">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {codes.length === 0 && (
                        <p className="text-gray-400 text-xs italic">Scanned items will appear here</p>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="scan-foc"
                    checked={isFOC}
                    onChange={(e) => setIsFOC(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                />
                <label
                    htmlFor="scan-foc"
                    className="text-sm font-medium leading-none"
                >
                    Free of Cost (FOC)
                </label>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                </div>
            )}

            <DialogFooter>
                <div className="flex-1 flex justify-between items-center">
                    <span className="text-sm text-gray-500">{codes.length} items scanned</span>
                    <Button onClick={handleSubmit} disabled={loading || exhibitorId === 0 || codes.length === 0}>
                        {loading ? 'Processing...' : 'Allocate Scanned Items'}
                    </Button>
                </div>
            </DialogFooter>
        </div>
    );
}
