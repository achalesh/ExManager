'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Zap, IndianRupee } from 'lucide-react';
import { allocateElectrical } from '@/app/allocation-actions';

interface ElectricalAllocationInterfaceProps {
    items: any[];
    allocations: any[];
    exhibitors: any[];
    eventId: number;
}

export function ElectricalAllocationInterface({ items, allocations, exhibitors, eventId }: ElectricalAllocationInterfaceProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState({
        exhibitorId: 0,
        electricalItemId: 0,
        quantity: 1,
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await allocateElectrical({
                ...formData,
                eventId
            });

            if (result.success) {
                setOpen(false);
                setFormData({
                    exhibitorId: 0,
                    electricalItemId: 0,
                    quantity: 1,
                });
                router.refresh();
            } else {
                setError(result.error || 'Failed to allocate electrical item');
            }
        } catch (err) {
            setError('An error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Allocation History</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Allocate Electrical
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Allocate Electrical Item</DialogTitle>
                            <DialogDescription>
                                Assign electrical items to an exhibitor
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Exhibitor *</label>
                                    <Select
                                        value={formData.exhibitorId.toString()}
                                        onValueChange={(value) => setFormData({ ...formData, exhibitorId: parseInt(value) })}
                                        disabled={loading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select exhibitor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {exhibitors.map((ex) => (
                                                <SelectItem key={ex.id} value={ex.id.toString()}>
                                                    {ex.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Electrical Item *</label>
                                    <Select
                                        value={formData.electricalItemId.toString()}
                                        onValueChange={(value) => setFormData({ ...formData, electricalItemId: parseInt(value) })}
                                        disabled={loading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {items.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name} - ₹{item.price} ({item.wattage}W)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Quantity *</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        disabled={loading}
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading || formData.exhibitorId === 0 || formData.electricalItemId === 0}>
                                    {loading ? 'Allocating...' : 'Allocate'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {allocations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No allocations yet</h3>
                    <p className="text-gray-600">
                        Start allocating electrical items to exhibitors
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Exhibitor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Item
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Quantity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Total Wattage
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Total Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {allocations.map((allocation) => (
                                <tr key={allocation.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {allocation.exhibitor.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{allocation.electricalItem.name}</div>
                                        <div className="text-sm text-gray-500">{allocation.electricalItem.wattage}W each</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-orange-600 font-semibold">
                                            <Zap className="h-4 w-4 mr-1" />
                                            {allocation.totalWattage}W
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-900">
                                            <IndianRupee className="h-4 w-4 mr-1" />
                                            {allocation.totalPrice.toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(allocation.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
