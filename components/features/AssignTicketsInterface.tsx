'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { assignTicketStock } from '@/app/ticketing-actions';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface TicketType {
    id: number;
    name: string;
    category: string;
    price: number;
    batches: {
        id: number;
        currentNumber: number;
        endNumber: number;
        isActive: boolean;
    }[];
}

interface TicketInventory {
    id: number;
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    currentNumber: number;
    category: string;
    price: number;
    status: string;
}

export function AssignTicketsInterface({ items, inventory }: { items: TicketType[], inventory: TicketInventory[] }) {
    const [selectedItem, setSelectedItem] = useState<TicketType | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleAssignClick = (item: TicketType) => {
        setSelectedItem(item);
        setOpen(true);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const inventoryId = Number(formData.get('inventoryId'));
        const quantity = Number(formData.get('quantity'));

        if (!selectedItem) return;

        const res = await assignTicketStock({
            ticketTypeId: selectedItem.id,
            inventoryId,
            quantity
        });

        if (res.success) {
            setOpen(false);
            router.refresh();
        } else {
            setError((res as any).error || 'Failed to assign stock');
        }
        setLoading(false);
    };

    // Filter compatible stock
    const compatibleStock = selectedItem
        ? inventory.filter(inv =>
            inv.status === 'Available' &&
            inv.category === selectedItem.category &&
            inv.price === selectedItem.price
        )
        : [];

    return (
        <div className="space-y-4">
            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Active Series</TableHead>
                            <TableHead>Current Number</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const activeBatch = item.batches && item.batches.length > 0 ? item.batches[0] : null;
                            const remaining = activeBatch ? activeBatch.endNumber - activeBatch.currentNumber + 1 : 0;

                            return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{item.category}</Badge>
                                    </TableCell>
                                    <TableCell>₹{item.price}</TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {activeBatch ? (
                                            <>
                                                #{activeBatch.currentNumber} - #{activeBatch.endNumber}
                                            </>
                                        ) : (
                                            <span className="text-gray-400">No active batch</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {activeBatch ? (
                                            <span className="font-bold text-green-700">#{activeBatch.currentNumber}</span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {activeBatch ? (
                                            <Badge variant={remaining < 50 ? "destructive" : "secondary"}>
                                                {remaining}
                                            </Badge>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleAssignClick(item)}
                                            className="gap-2"
                                        >
                                            <ArrowRightLeft className="h-4 w-4" />
                                            Assign Stock
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No ticket items found. Create items first.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Stock to {selectedItem?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> {error}
                            </div>
                        )}

                        <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm mb-4">
                            Category: <strong>{selectedItem?.category}</strong>, Price: <strong>₹{selectedItem?.price}</strong>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Stock Bundle</Label>
                            {compatibleStock.length > 0 ? (
                                <Select name="inventoryId" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select available Series" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {compatibleStock.map(stock => {
                                            const avail = stock.endNumber - stock.currentNumber + 1;
                                            return (
                                                <SelectItem key={stock.id} value={stock.id.toString()}>
                                                    {stock.seriesLabel} (#{stock.currentNumber}-{stock.endNumber}) - Qty: {avail}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="text-red-500 text-sm border border-red-200 bg-red-50 p-2 rounded">
                                    No compatible stock available! Please add stock with same Category and Price.
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity to Assign</Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                min="1"
                                placeholder="e.g. 100"
                                required
                                disabled={compatibleStock.length === 0}
                            />
                            <p className="text-xs text-gray-500">
                                Enter the number of tickets to issue to the counter.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || compatibleStock.length === 0}>
                                {loading ? 'Assigning...' : 'Confirm Assignment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
