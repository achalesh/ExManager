'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateTicketType } from '@/app/ticketing-actions';
import { getAmusementOwners } from '@/app/amusement-actions';
import { getUPIMachines } from '@/app/upi-actions';
import { useRouter } from 'next/navigation';
import { Edit, Loader2, Plus } from 'lucide-react';

interface TicketType {
    id: number;
    name: string;
    category: string;
    price: number;
    amusementOwner?: { id: number, name: string } | null;
    ownerSharePercentage?: number;
    ownerShares?: {
        amusementOwner: { id: number, name: string };
        sharePercentage: number;
        amusementOwnerId: number;
    }[];
    upiMachineId?: number | null;
    upiMachine?: { id: number, name: string };
}

export function UpdateTicketTypeDialog({ ticketType }: { ticketType: TicketType }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [owners, setOwners] = useState<any[]>([]);
    const [machines, setMachines] = useState<any[]>([]);

    // Form States
    const [name, setName] = useState(ticketType.name);
    const [price, setPrice] = useState(ticketType.price);
    const [category, setCategory] = useState(ticketType.category);
    const [upiMachineId, setUpiMachineId] = useState<string>('');

    // Multi-owner State
    const [shares, setShares] = useState<{ ownerId: string, share: string }[]>([]);

    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadDependencies();
            initializeShares();
            if (ticketType.upiMachineId) {
                setUpiMachineId(ticketType.upiMachineId.toString());
            } else {
                setUpiMachineId('');
            }
        }
    }, [open, ticketType]);

    const initializeShares = () => {
        if (ticketType.ownerShares && ticketType.ownerShares.length > 0) {
            setShares(ticketType.ownerShares.map(s => ({
                ownerId: s.amusementOwner.id.toString(),
                share: s.sharePercentage.toString()
            })));
        } else if (ticketType.amusementOwner) {
            // Fallback for legacy
            setShares([{
                ownerId: ticketType.amusementOwner.id.toString(),
                share: ticketType.ownerSharePercentage?.toString() || '0'
            }]);
        } else {
            setShares([{ ownerId: '', share: '' }]);
        }
    };

    async function loadDependencies() {
        const [ownersRes, machinesRes] = await Promise.all([
            getAmusementOwners(),
            getUPIMachines()
        ]);

        if (ownersRes.success && ownersRes.data) {
            setOwners(ownersRes.data);
        }
        if (machinesRes.success && machinesRes.data) {
            setMachines(machinesRes.data);
        }
    }

    const addShareRow = () => {
        setShares([...shares, { ownerId: '', share: '' }]);
    };

    const removeShareRow = (index: number) => {
        const newShares = [...shares];
        newShares.splice(index, 1);
        setShares(newShares);
    };

    const updateShare = (index: number, field: 'ownerId' | 'share', value: string) => {
        const newShares = [...shares];
        // @ts-ignore
        newShares[index][field] = value;
        setShares(newShares);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Filter out empty shares
        const validShares = shares.filter(s => s.ownerId && s.share).map(s => ({
            amusementOwnerId: parseInt(s.ownerId),
            sharePercentage: parseFloat(s.share)
        }));

        const data: any = {
            name,
            price: Number(price),
            category: category as 'Entrance' | 'Amusement',
            ownerShares: validShares,
            upiMachineId: upiMachineId ? parseInt(upiMachineId) : undefined
        };

        const result = await updateTicketType(ticketType.id, data);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            setError(result.error || 'Failed to update ticket type');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Ticket Type</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Entrance">Entrance</SelectItem>
                                    <SelectItem value="Amusement">Amusement</SelectItem>
                                    <SelectItem value="Office">Office</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Ticket Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Adult Entry"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Default UPI Machine (Optional)</Label>
                        <Select value={upiMachineId} onValueChange={setUpiMachineId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select UPI Machine" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">None</SelectItem>
                                {machines.map(m => (
                                    <SelectItem key={m.id} value={m.id.toString()}>
                                        {m.name} {m.isCompanyOwned ? '(Company)' : `(${m.amusementOwner?.name})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {category === 'Amusement' && (
                        <div className="p-4 bg-gray-50 rounded-md border text-sm space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-gray-700">Revenue Sharing</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={addShareRow} className="h-8 text-xs">
                                    <Plus className="h-3 w-3 mr-1" /> Add Owner
                                </Button>
                            </div>

                            {shares.map((share, idx) => (
                                <div key={idx} className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Owner</Label>
                                        <Select
                                            value={share.ownerId}
                                            onValueChange={(val) => updateShare(idx, 'ownerId', val)}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Select Owner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {owners.map(owner => (
                                                    <SelectItem key={owner.id} value={owner.id.toString()}>
                                                        {owner.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs">Share (%)</Label>
                                        <Input
                                            value={share.share}
                                            onChange={(e) => updateShare(idx, 'share', e.target.value)}
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            className="h-8"
                                            placeholder="%"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500"
                                        onClick={() => removeShareRow(idx)}
                                        disabled={shares.length === 1 && !share.ownerId && !share.share}
                                    >
                                        <span className="sr-only">Remove</span>
                                        &times;
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Ticket'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
