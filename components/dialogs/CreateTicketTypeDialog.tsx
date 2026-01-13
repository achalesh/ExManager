'use client';

import { useState } from 'react';
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
import { createTicketType } from '@/app/ticketing-actions';
import { getAmusementOwners } from '@/app/amusement-actions';
import { getUPIMachines } from '@/app/upi-actions';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function CreateTicketTypeDialog({ eventId }: { eventId: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('Entrance');
    const [owners, setOwners] = useState<any[]>([]);
    const [machines, setMachines] = useState<any[]>([]);
    const [ownersLoading, setOwnersLoading] = useState(false);
    const [upiMachineId, setUpiMachineId] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadDependencies();
        }
    }, [open]);

    async function loadDependencies() {
        setOwnersLoading(true);
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
        setOwnersLoading(false);
    }

    const [shares, setShares] = useState<{ ownerId: string, share: string }[]>([{ ownerId: '', share: '' }]);

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

        const formData = new FormData(e.currentTarget);

        // Filter out empty shares
        const validShares = shares.filter(s => s.ownerId && s.share).map(s => ({
            amusementOwnerId: parseInt(s.ownerId),
            sharePercentage: parseFloat(s.share)
        }));

        const data: any = {
            eventId: eventId,
            name: formData.get('name') as string,
            category: formData.get('category') as 'Entrance' | 'Amusement',
            price: Number(formData.get('price')),
            ownerShares: validShares.length > 0 ? validShares : undefined,
            upiMachineId: upiMachineId ? parseInt(upiMachineId) : undefined,
            ticketsPerBooklet: Number(formData.get('ticketsPerBooklet')) || 100
        };

        const result = await createTicketType(data);

        if (result.success) {
            setOpen(false);
            router.refresh();
            // Reset state
            setShares([{ ownerId: '', share: '' }]);
            setCategory('Entrance');
            setUpiMachineId('');
        } else {
            setError(result.error || 'Failed to create ticket type');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Ticket Type
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Ticket Type</DialogTitle>
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
                            <Select name="category" required value={category} onValueChange={setCategory}>
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
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ticketsPerBooklet">Tickets per Bundle (Default)</Label>
                        <Input
                            id="ticketsPerBooklet"
                            name="ticketsPerBooklet"
                            type="number"
                            min="1"
                            defaultValue="100"
                            placeholder="e.g. 100"
                        />
                        <p className="text-xs text-gray-500">Used wnen adding stock.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Ticket Name</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g. Adult Entry, Giant Wheel"
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
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Ticket Type'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
