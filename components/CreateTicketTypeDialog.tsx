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
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function CreateTicketTypeDialog({ eventId }: { eventId: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('Entrance');
    const [owners, setOwners] = useState<any[]>([]);
    const [ownersLoading, setOwnersLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadOwners();
        }
    }, [open]);

    async function loadOwners() {
        setOwnersLoading(true);
        const res = await getAmusementOwners();
        if (res.success && res.data) {
            setOwners(res.data);
        }
        setOwnersLoading(false);
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const data = {
            eventId: eventId,
            name: formData.get('name') as string,
            category: formData.get('category') as 'Entrance' | 'Amusement',
            price: Number(formData.get('price')),
            amusementOwnerId: formData.get('amusementOwnerId') ? Number(formData.get('amusementOwnerId')) : undefined,
            ownerSharePercentage: formData.get('ownerSharePercentage') ? Number(formData.get('ownerSharePercentage')) : undefined,
        };

        const result = await createTicketType(data);

        if (result.success) {
            setOpen(false);
            router.refresh();
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Ticket Type</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select name="category" required value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Entrance">Entrance</SelectItem>
                                <SelectItem value="Amusement">Amusement</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {category === 'Amusement' && (
                        <div className="p-4 bg-gray-50 rounded-md border text-sm space-y-4">
                            <h4 className="font-semibold text-gray-700">Revenue Sharing (Optional)</h4>
                            <div className="space-y-2">
                                <Label htmlFor="amusementOwnerId">Amusement Owner</Label>
                                <Select name="amusementOwnerId">
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
                                    name="ownerSharePercentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    placeholder="e.g. 30"
                                />
                            </div>
                        </div>
                    )}
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
