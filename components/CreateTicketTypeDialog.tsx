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
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export function CreateTicketTypeDialog({ eventId }: { eventId: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

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
                        <Select name="category" required defaultValue="Entrance">
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
                            {loading ? 'Creating...' : 'Create Ticket Type'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
