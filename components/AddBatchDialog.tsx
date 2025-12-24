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
import { createTicketBatch } from '@/app/ticketing-actions';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
// Removing missing Tabs/Select imports to avoid build errors. Using native elements where possible or simple state.

interface InventoryItem {
    id: number;
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    currentNumber: number;
}

export function AddBatchDialog({
    ticketTypeId,
    ticketName,
    inventoryOptions = []
}: {
    ticketTypeId: number,
    ticketName: string,
    inventoryOptions?: InventoryItem[]
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<string>('inventory');
    const router = useRouter();

    const availableInventory = inventoryOptions.filter(i => i.currentNumber <= i.endNumber);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const data: any = {
            ticketTypeId,
            mode,
        };

        if (mode === 'inventory') {
            const items = inventoryOptions || [];
            const invId = Number(formData.get('inventoryId'));
            const selectedInv = items.find(i => i.id === invId);

            data.inventoryId = invId;
            data.quantity = selectedInv ? (selectedInv.endNumber - selectedInv.currentNumber + 1) : 0;
        } else {
            data.startNumber = Number(formData.get('startNumber'));
            data.endNumber = Number(formData.get('endNumber'));
        }

        const result = await createTicketBatch(data);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            setError(result.error || 'Failed to add batch');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stock
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Stock for {ticketName}</DialogTitle>
                </DialogHeader>

                <div className="w-full">
                    <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setMode('inventory')}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'inventory' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            From Inventory
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'manual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Manual Entry
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div className={mode === 'inventory' ? 'block' : 'hidden'}>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Bundle</Label>
                                    <select
                                        name="inventoryId"
                                        required={mode === 'inventory'}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Choose a stock bundle...</option>
                                        {availableInventory.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.seriesLabel} ({item.currentNumber} - {item.endNumber})
                                            </option>
                                        ))}
                                        {availableInventory.length === 0 && (
                                            <option value="" disabled>No available bundles</option>
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">
                                        This will add the entire remaining stock from the selected bundle.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={mode === 'manual' ? 'block' : 'hidden'}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startNumber">Start Number</Label>
                                    <Input
                                        id="startNumber"
                                        name="startNumber"
                                        type="number"
                                        min="1"
                                        required={mode === 'manual'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endNumber">End Number</Label>
                                    <Input
                                        id="endNumber"
                                        name="endNumber"
                                        type="number"
                                        min="1"
                                        required={mode === 'manual'}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Adding...' : 'Add Stock Series'}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
