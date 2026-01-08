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
import { addInventory } from '@/app/inventory-actions';
import { getTicketTypes } from '@/app/ticketing-actions';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';

export function AddInventoryDialog({ eventId }: { eventId: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Amusement');
    const [customCategory, setCustomCategory] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [startNumber, setStartNumber] = useState<string>('');
    const [endNumber, setEndNumber] = useState<string>('');
    const [splitSize, setSplitSize] = useState<string>('100'); // Default 100
    const router = useRouter();

    // Auto-fill logic
    const [ticketTypes, setTicketTypes] = useState<any[]>([]);
    const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>('');

    useEffect(() => {
        if (open) {
            getTicketTypes(eventId).then(types => setTicketTypes(types));
        }
    }, [open, eventId]);

    const handleTicketTypeChange = (id: string) => {
        setSelectedTicketTypeId(id);
        const type = ticketTypes.find(t => t.id.toString() === id);
        if (type) {
            setSelectedCategory(type.category);
            setPrice(type.price.toString());
            const newSize = type.ticketsPerBooklet ? type.ticketsPerBooklet.toString() : '100';
            setSplitSize(newSize);

            // If start number exists, recalc end number
            if (startNumber && newSize) {
                // If we want to add just ONE bundle by default? Or let user type End Number?
                // Usually "Add Stock" implies a batch.
                // If I set End Number = Start + Split - 1, it implies 1 bundle.
                // But user might want 1-5000.
                // Let's NOT touch End Number if it's already set, unless it's empty?
                // Or maybe just let them set End Number.
                // Recalculating End Number might be annoying if they already typed 5000.
                // But previously I WAS recalculating it. 
                // Let's only set End Number if it's empty to be safe, or just leave it.
                // Actually, the previous logic was: setEndNumber(end.toString());
                // I'll keep it simple: Don't change End Number automatically on type change if it's unrelated.
                // But wait, the previous logic was helping them add ONE bundle.
                // Now we encourage BATCHES.
                // So let's NOT auto-limit End Number. Let them type "5000".
            }
        }
    };

    const handleStartNumberChange = (val: string) => {
        setStartNumber(val);
        // Only auto-fill End Number if it's empty? 
        // Or if they want a single bundle?
        // Let's auto-fill End Number to Start + Split - 1 IF End Number is empty.
        if (!endNumber && splitSize && val) {
            const end = Number(val) + Number(splitSize) - 1;
            setEndNumber(end.toString());
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);

        let finalCategory = selectedCategory;
        if (selectedCategory === 'Other') {
            if (!customCategory.trim()) {
                setError('Please enter a category name');
                setLoading(false);
                return;
            }
            finalCategory = customCategory.trim();
        }

        const data = {
            eventId,
            seriesLabel: formData.get('seriesLabel') as string,
            startNumber: Number(startNumber),
            endNumber: Number(endNumber),
            price: Number(price),
            category: finalCategory,
            splitSize: Number(splitSize),
        };

        const result = await addInventory(data);

        if (result.success) {
            setOpen(false);
            router.refresh();
            // Reset fields
            setStartNumber('');
            setEndNumber('');
            setPrice('');
            setSelectedTicketTypeId('');
            setSplitSize('100');
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

                    <div className="space-y-2 p-3 bg-blue-50 rounded-md border border-blue-100">
                        <Label className="text-blue-700">Link to Ticket Type (Optional)</Label>
                        <Select value={selectedTicketTypeId} onValueChange={handleTicketTypeChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a Ticket Type to auto-fill..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- None (Manual Entry) --</SelectItem>
                                {ticketTypes.map(t => (
                                    <SelectItem key={t.id} value={t.id.toString()}>
                                        {t.name} (₹{t.price}) - {t.category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-blue-600">Selecting a ticket type will auto-set Category, Price, and Bundle Size.</p>
                    </div>

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
                                value={startNumber}
                                onChange={(e) => handleStartNumberChange(e.target.value)}
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
                                value={endNumber}
                                onChange={(e) => setEndNumber(e.target.value)}
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
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            required
                        >
                            <option value="Amusement">Amusement</option>
                            <option value="Entrance">Entrance</option>
                            <option value="Other">Add new category...</option>
                        </select>
                        {selectedCategory === 'Other' && (
                            <div className="pt-2">
                                <Input
                                    placeholder="Enter Category Name"
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    required={selectedCategory === 'Other'}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="splitSize">Bundle Size (Split)</Label>
                        <Input
                            id="splitSize"
                            name="splitSize"
                            type="number"
                            min="1"
                            value={splitSize}
                            onChange={(e) => setSplitSize(e.target.value)}
                            required
                            placeholder="e.g. 100"
                        />
                        <p className="text-xs text-gray-500">Stock will be split into bundles of this size.</p>
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
