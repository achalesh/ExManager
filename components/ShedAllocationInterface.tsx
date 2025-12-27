'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { Plus, Home, IndianRupee, Ruler, Printer } from 'lucide-react';
import { ShedReceipt } from './ShedReceipt';
import { allocateShed } from '@/app/allocation-actions';

interface ShedAllocationInterfaceProps {
    sheds: any[];
    allocations: any[];
    exhibitors: any[];
    eventId: number;
}

export function ShedAllocationInterface({ sheds, allocations, exhibitors, eventId }: ShedAllocationInterfaceProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState({
        exhibitorId: 0,
        shedId: 0,
    });
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any[]>([]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await allocateShed({
                ...formData,
                eventId
            });

            if (result.success) {
                setOpen(false);
                setFormData({
                    exhibitorId: 0,
                    shedId: 0,
                });
                if (result.data) {
                    setReceiptData(result.data);
                    setShowReceipt(true);
                }
                router.refresh();
            } else {
                setError(result.error || 'Failed to allocate shed');
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
                            Allocate Shed
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Allocate Shed</DialogTitle>
                            <DialogDescription>
                                Assign a shed to an exhibitor (one per exhibitor)
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
                                    <label className="block text-sm font-medium mb-2">Shed *</label>
                                    <Select
                                        value={formData.shedId.toString()}
                                        onValueChange={(value) => setFormData({ ...formData, shedId: parseInt(value) })}
                                        disabled={loading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select shed" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sheds.map((shed) => (
                                                <SelectItem key={shed.id} value={shed.id.toString()}>
                                                    {shed.name} - {shed.dimensions} - ₹{shed.price}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                <Button type="submit" disabled={loading || formData.exhibitorId === 0 || formData.shedId === 0}>
                                    {loading ? 'Allocating...' : 'Allocate'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {allocations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No allocations yet</h3>
                    <p className="text-gray-600">
                        Start allocating sheds to exhibitors
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
                                    Shed
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Dimensions
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Actions
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
                                        <div className="text-sm text-gray-900">{allocation.shed.name}</div>
                                        <div className="text-sm text-gray-500">{allocation.shed.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-600">
                                            <Ruler className="h-4 w-4 mr-1" />
                                            {allocation.shed.dimensions}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-900">
                                            <IndianRupee className="h-4 w-4 mr-1" />
                                            {allocation.price.toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(allocation.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setReceiptData([allocation]);
                                                setShowReceipt(true);
                                            }}
                                        >
                                            <Printer className="h-4 w-4 text-gray-400" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ShedReceipt
                open={showReceipt}
                onOpenChange={setShowReceipt}
                allocations={receiptData}
            />
        </div>
    );
}
