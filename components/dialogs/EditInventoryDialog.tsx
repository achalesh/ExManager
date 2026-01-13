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
import { updateInventory } from '@/app/inventory-actions';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';

interface InventoryItem {
    id: number;
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    price?: number;
    category?: string;
}

export function EditInventoryDialog({ item }: { item: InventoryItem }) {
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
            seriesLabel: formData.get('seriesLabel') as string,
            startNumber: Number(formData.get('startNumber')),
            endNumber: Number(formData.get('endNumber')),
            price: Number(formData.get('price')),
            category: formData.get('category') as string,
        };

        const result = await updateInventory(item.id, data);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            setError(result.error || 'Failed to update inventory');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Inventory Bundle</DialogTitle>
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
                            defaultValue={item.seriesLabel}
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
                                defaultValue={item.startNumber}
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
                                defaultValue={item.endNumber}
                                min="1"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price">Ticket Rate (Rs.)</Label>
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={item.price || 0}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            name="category"
                            defaultValue={item.category || 'General'}
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
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
