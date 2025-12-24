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
import { Plus, Package, IndianRupee } from 'lucide-react';
import { allocateMaterial, allocateScannedItems } from '@/app/allocation-actions';
import { Scan, X } from 'lucide-react';

interface MaterialAllocationInterfaceProps {
    materials: any[];
    allocations: any[];
    exhibitors: any[];
    eventId: number;
}

export function MaterialAllocationInterface({ materials, allocations, exhibitors, eventId }: MaterialAllocationInterfaceProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [scanMode, setScanMode] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        exhibitorId: 0,
        materialId: 0,
        quantity: 1,
        isFOC: false,
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await allocateMaterial({
                ...formData,
                eventId
            });

            if (result.success) {
                setOpen(false);
                setFormData({
                    exhibitorId: 0,
                    materialId: 0,
                    quantity: 1,
                    isFOC: false,
                });
                router.refresh();
            } else {
                setError(result.error || 'Failed to allocate material');
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
                            Allocate Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Allocate Material</DialogTitle>
                            <DialogDescription>
                                Assign materials to an exhibitor
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex border-b mb-4">
                            <button
                                className={`px-4 py-2 font-medium text-sm ${!scanMode ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setScanMode(false)}
                            >
                                Manual Selection
                            </button>
                            <button
                                className={`px-4 py-2 font-medium text-sm ${scanMode ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setScanMode(true)}
                            >
                                Scan QR Code
                            </button>
                        </div>

                        {!scanMode ? (
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
                                        <label className="block text-sm font-medium mb-2">Material *</label>
                                        <Select
                                            value={formData.materialId.toString()}
                                            onValueChange={(value) => setFormData({ ...formData, materialId: parseInt(value) })}
                                            disabled={loading}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select material" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {materials.map((mat) => (
                                                    <SelectItem key={mat.id} value={mat.id.toString()}>
                                                        {mat.name} - ₹{mat.price}/{mat.unit}
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

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="foc"
                                            checked={formData.isFOC}
                                            onChange={(e) => setFormData({ ...formData, isFOC: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            disabled={loading}
                                        />
                                        <label
                                            htmlFor="foc"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Free of Cost (FOC)
                                        </label>
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
                                    <Button type="submit" disabled={loading || formData.exhibitorId === 0 || formData.materialId === 0}>
                                        {loading ? 'Allocating...' : 'Allocate'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <ScanAllocationForm
                                exhibitors={exhibitors}
                                eventId={eventId}
                                onSuccess={() => {
                                    setOpen(false);
                                    router.refresh();
                                }}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {allocations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No allocations yet</h3>
                    <p className="text-gray-600">
                        Start allocating materials to exhibitors
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
                                    Material
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Quantity
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
                                        <div className="text-sm text-gray-900">{allocation.material.name}</div>
                                        <div className="text-sm text-gray-500">{allocation.material.unit}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-900">
                                            {allocation.isFOC || allocation.totalPrice === 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    FOC
                                                </span>
                                            ) : (
                                                <>
                                                    <IndianRupee className="h-4 w-4 mr-1" />
                                                    {allocation.totalPrice.toFixed(2)}
                                                </>
                                            )}
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

function ScanAllocationForm({ exhibitors, eventId, onSuccess }: { exhibitors: any[], eventId: number, onSuccess: () => void }) {
    const [codes, setCodes] = useState<string[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [exhibitorId, setExhibitorId] = useState(0);
    const [isFOC, setIsFOC] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentInput.trim()) {
                if (codes.includes(currentInput.trim())) {
                    setCurrentInput('');
                    return;
                }
                setCodes([...codes, currentInput.trim()]);
                setCurrentInput('');
            }
        }
    };

    const handleRemove = (code: string) => {
        setCodes(codes.filter(c => c !== code));
    };

    const handleSubmit = async () => {
        if (exhibitorId === 0 || codes.length === 0) return;
        setLoading(true);
        setError('');

        const result = await allocateScannedItems({
            exhibitorId,
            eventId,
            codes,
            isFOC
        });

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error || 'Failed.');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">Exhibitor *</label>
                <Select
                    value={exhibitorId.toString()}
                    onValueChange={(value) => setExhibitorId(parseInt(value))}
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

            <div className="p-4 bg-gray-50 border rounded-md">
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    Scan QR Code (Press Enter)
                </label>
                <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Focus here and scan..."
                    autoFocus
                    disabled={loading}
                    className="mb-2"
                />

                <div className="max-h-32 overflow-y-auto space-y-1">
                    {codes.map((code, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                            <span className="font-mono">{code}</span>
                            <button onClick={() => handleRemove(code)} className="text-red-500 hover:text-red-700">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {codes.length === 0 && (
                        <p className="text-gray-400 text-xs italic">Scanned items will appear here</p>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="scan-foc"
                    checked={isFOC}
                    onChange={(e) => setIsFOC(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                />
                <label
                    htmlFor="scan-foc"
                    className="text-sm font-medium leading-none"
                >
                    Free of Cost (FOC)
                </label>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                </div>
            )}

            <DialogFooter>
                <div className="flex-1 flex justify-between items-center">
                    <span className="text-sm text-gray-500">{codes.length} items scanned</span>
                    <Button onClick={handleSubmit} disabled={loading || exhibitorId === 0 || codes.length === 0}>
                        {loading ? 'Processing...' : 'Allocate Scanned Items'}
                    </Button>
                </div>
            </DialogFooter>
        </div>
    );
}
