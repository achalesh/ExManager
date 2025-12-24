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
import { addInventory } from '@/app/inventory-actions';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export function AddInventoryDialog({ eventId }: { eventId: number }) {
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
            eventId,
            seriesLabel: formData.get('seriesLabel') as string,
            startNumber: Number(formData.get('startNumber')),
            endNumber: Number(formData.get('endNumber')),
            price: Number(formData.get('price')),
            category: formData.get('category') as string,
        };

        const result = await addInventory(data);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            setError(result.error || 'Failed to add inventory');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stock Bundle
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Ticket Bundle to Inventory</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="seriesLabel">Series Label</Label>
                        <Input
                            id="seriesLabel"
                            name="seriesLabel"
                            placeholder="e.g. Box 1, Series A"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startNumber">Start Number</Label>
                            <Input
                                id="startNumber"
                                name="startNumber"
                                type="number"
                                min="1"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endNumber">End Number</Label>
                            <Input
                                id="endNumber"
                                name="endNumber"
                                type="number"
                                min="1"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="price">Ticket Rate (Rs.)</Label>
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            name="category"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            required
                        >
                            <option value="General">General</option>
                            <option value="Entrance">Entrance</option>
                            <option value="Amusement">Amusement</option>
                            <option value="Parking">Parking</option>
                            <option value="Food Court">Food Court</option>
                        </select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Stock'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
