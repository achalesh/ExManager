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
import { useRouter } from 'next/navigation';
import { Edit, Loader2 } from 'lucide-react';

interface TicketType {
    id: number;
    name: string;
    category: string;
    price: number;
    amusementOwner?: { id: number, name: string };
    ownerSharePercentage?: number;
}

export function UpdateTicketTypeDialog({ ticketType }: { ticketType: TicketType }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [owners, setOwners] = useState<any[]>([]);
    const [category, setCategory] = useState(ticketType.category);

    // Initial values
    const [name, setName] = useState(ticketType.name);
    const [price, setPrice] = useState(ticketType.price);
    const [ownerId, setOwnerId] = useState(ticketType.amusementOwner?.id?.toString() || '0');
    const [share, setShare] = useState(ticketType.ownerSharePercentage?.toString() || '');

    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadOwners();
        }
    }, [open]);

    async function loadOwners() {
        const res = await getAmusementOwners();
        if (res.success && res.data) {
            setOwners(res.data);
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const data = {
            name,
            price: Number(price),
            category: category as 'Entrance' | 'Amusement',
            amusementOwnerId: ownerId && ownerId !== '0' ? Number(ownerId) : undefined,
            ownerSharePercentage: share ? Number(share) : undefined,
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Ticket Type</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Entrance">Entrance</SelectItem>
                                <SelectItem value="Amusement">Amusement</SelectItem>
                            </SelectContent>
                        </Select>
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

                    {category === 'Amusement' && (
                        <div className="p-4 bg-gray-50 rounded-md border text-sm space-y-4">
                            <h4 className="font-semibold text-gray-700">Revenue Sharing (Optional)</h4>
                            <div className="space-y-2">
                                <Label htmlFor="amusementOwnerId">Amusement Owner</Label>
                                <Select value={ownerId} onValueChange={setOwnerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Owner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">None</SelectItem>
                                        {owners.map(owner => (
                                            <SelectItem key={owner.id} value={owner.id.toString()}>
                                                {owner.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ownerSharePercentage">Owner Share (%)</Label>
                                <Input
                                    id="ownerSharePercentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={share}
                                    onChange={(e) => setShare(e.target.value)}
                                    placeholder="e.g. 30"
                                />
                            </div>
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
