'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assignStockToStaff } from '@/app/staff-ticketing-actions';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

interface Props {
    staffList: any[];
    inventoryList: any[];
    ticketTypes: any[];
    defaultStaffId?: number;
    trigger?: React.ReactNode;
}

export function AssignStockDialog({ staffList, inventoryList, ticketTypes, defaultStaffId, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [quantity, setQuantity] = useState<string>('');
    const [assignedDate, setAssignedDate] = useState<string>('');
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');

    const router = useRouter();

    useEffect(() => {
        setAssignedDate(new Date().toISOString().split('T')[0]);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await assignStockToStaff(formData);

        if (result.success) {
            setOpen(false);
            setQuantity('');
            router.refresh();
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    const handleInventoryChange = (value: string) => {
        const inv = inventoryList.find(i => i.id.toString() === value);
        if (inv) {
            const available = inv.endNumber - inv.currentNumber + 1;
            setQuantity(available.toString());
        }
    };

    const filteredInventory = inventoryList.filter(inv => {
        // Basic availability check
        if (inv.status !== 'Available' || inv.currentNumber > inv.endNumber) return false;

        // Filter by Ticket Type if selected
        if (selectedTypeId) {
            const type = ticketTypes.find(t => t.id.toString() === selectedTypeId);
            if (type) {
                if (type) {
                    // Match exact Price only
                    // Note: We ignore category because Inventory categories are hardcoded (General, etc.)
                    // whereas Ticket Types are dynamic. Matching by Price is sufficient for now.
                    return inv.price === type.price;
                }
            }
        }
        return true;
    }).sort((a, b) => {
        // Priority: Open (Used) OR Returned stock
        const aIsRet = a.seriesLabel.includes('(Ret)');
        const bIsRet = b.seriesLabel.includes('(Ret)');
        const aIsOpen = a.currentNumber > a.startNumber;
        const bIsOpen = b.currentNumber > b.startNumber;

        const aPriority = aIsRet || aIsOpen;
        const bPriority = bIsRet || bIsOpen;

        if (aPriority && !bPriority) return -1;
        if (!aPriority && bPriority) return 1;

        // Secondary sort by label
        return a.seriesLabel.localeCompare(b.seriesLabel);
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Allocate Tickets
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Allocate Tickets</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="assignedDate">Allocation Date</Label>
                        <Input
                            id="assignedDate"
                            name="assignedDate"
                            type="date"
                            value={assignedDate}
                            onChange={(e) => setAssignedDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="staffId">Staff Member</Label>
                        <Select name="staffId" required defaultValue={defaultStaffId?.toString()}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Staff" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffList.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id.toString()}>
                                        {staff.name} ({staff.department})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ticketTypeId">Ticket Type</Label>
                        <Select
                            name="ticketTypeId"
                            required
                            onValueChange={(val) => {
                                setSelectedTypeId(val);
                                // Reset quantity if needed, or clear inventory selection if it becomes invalid?
                                // Ideally we clear inventory selection but the Select component controls that state loosely here.
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Ticket Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {ticketTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                        {type.name} - ₹{type.price}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ticketInventoryId">Stock Bundle</Label>
                        <Select name="ticketInventoryId" onValueChange={handleInventoryChange} required disabled={!selectedTypeId}>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedTypeId ? "Select Ticket Type first" : "Select Bundle"} />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredInventory.length === 0 ? (
                                    <div className="p-2 text-sm text-gray-500 text-center">No matching stock found</div>
                                ) : (
                                    filteredInventory.map((inv) => (
                                        <SelectItem key={inv.id} value={inv.id.toString()}>
                                            {inv.seriesLabel} | {inv.category} | #{inv.currentNumber}-{inv.endNumber} | ₹{inv.price} {inv.currentNumber > inv.startNumber ? '(Open)' : ''}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity to Assign</Label>
                        <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                            placeholder="e.g., 100"
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Allocating...' : 'Allocate Tickets'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
