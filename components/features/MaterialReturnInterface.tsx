'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Scan, RotateCcw, AlertCircle, CheckCircle, Package, User, Building, StickyNote, Trash2, ListPlus, Camera, X } from 'lucide-react';
import { getItemReturnDetails, returnBatchItems } from '@/app/allocation-actions';
import QRScanner from '@/components/shared/QRScanner';

interface ScanResult {
    item: any;
    allocation: any;
    exhibitor: any;
    otherAllocations?: any[];
}

export function MaterialReturnInterface() {
    const router = useRouter();
    const [scanCode, setScanCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showScanner, setShowScanner] = useState(false);

    // Queue State
    const [returnQueue, setReturnQueue] = useState<ScanResult[]>([]);

    // Selection state for ambiguous items
    const [multipleMatches, setMultipleMatches] = useState<ScanResult[]>([]);

    // Global remarks for the batch
    const [remarks, setRemarks] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Auto-focus input
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount and after actions
    useEffect(() => {
        if (multipleMatches.length === 0 && !showScanner) {
            inputRef.current?.focus();
        }
    }, [returnQueue, multipleMatches, successMsg, showScanner]);

    const handleCodeProcess = async (code: string) => {
        if (!code.trim()) return;

        // Check if already in queue
        const alreadyInQueue = returnQueue.some(r => r.item.uniqueCode === code.trim() || r.item.uniqueCode.endsWith(code.trim()));
        if (alreadyInQueue) {
            setError(`Item ${code} is likely already in the list.`);
            // If from scanner, we might want to just notify and continue?
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMsg('');
        setMultipleMatches([]);

        try {
            const res: any = await getItemReturnDetails(code.trim());
            if (res.success) {
                if (res.multipleMatches) {
                    setMultipleMatches(res.matches);
                    setScanCode('');
                    setShowScanner(false); // Close scanner on ambiguous match to allow selection
                } else {
                    addToQueue(res.data);
                    // If scanning with camera, we can keep scanner open? 
                    // But maybe user wants to see the success message.
                    // Let's close it for now to be safe, or show a toast.
                    // For flow: Scan -> Success -> Ready for next.
                    // If using camera, maybe keep it open.
                    // Let's keep it open if it was a camera scan, but give visual feedback.
                    if (showScanner) {
                        setSuccessMsg(`Added ${res.data.item.uniqueCode}`);
                        // Clear success msg after 2s
                        setTimeout(() => setSuccessMsg(''), 2000);
                    }
                }
            } else {
                setError(res.error || 'Item not found');
            }
        } catch (err: any) {
            setError('Failed to process scan');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleCodeProcess(scanCode);
    };

    const handleCameraScan = (decodedText: string) => {
        // Debounce or just call process
        handleCodeProcess(decodedText);
    };

    const addToQueue = (result: ScanResult) => {
        // Check duplicate by ID
        if (returnQueue.some(r => r.item.id === result.item.id)) {
            setError(`Item ${result.item.uniqueCode} is already in the list.`);
            setScanCode('');
            return;
        }

        setReturnQueue(prev => [result, ...prev]);
        setScanCode('');
        setMultipleMatches([]);
        setError('');
    };

    const handleSelectMatch = (match: ScanResult) => {
        addToQueue(match);
    };

    const removeFromQueue = (itemId: number) => {
        setReturnQueue(prev => prev.filter(r => r.item.id !== itemId));
    };

    const handleProcessBatch = async () => {
        if (returnQueue.length === 0) return;

        setLoading(true);
        try {
            const itemsToReturn = returnQueue.map(r => ({
                allocationId: r.allocation.id,
                itemId: r.item.id
            }));

            const res = await returnBatchItems({
                items: itemsToReturn,
                remarks: remarks
            });

            if (res.success) {
                setSuccessMsg(`Successfully returned ${returnQueue.length} items.`);
                setReturnQueue([]);
                setRemarks('');
            } else {
                setError(res.error || 'Failed to return items');
            }
        } catch (err) {
            setError('An error occurred during batch return');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelMatchSelection = () => {
        setMultipleMatches([]);
        inputRef.current?.focus();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">

            {/* 1. Header & Scan Input */}
            <Card className="border-2 border-blue-100 shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl text-blue-800">
                                <Scan className="h-8 w-8" />
                                Batch Return
                            </CardTitle>
                            <CardDescription>
                                Scan multiple items to create a return list, then process them all at once.
                            </CardDescription>
                        </div>
                        {returnQueue.length > 0 && (
                            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm">
                                {returnQueue.length} Pending
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Camera Toggle */}
                    {showScanner ? (
                        <div className="space-y-4 border rounded-xl p-4 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    <Camera className="h-5 w-5" />
                                    Scanning...
                                </h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)}>
                                    <X className="h-5 w-5 mr-1" /> Close Camera
                                </Button>
                            </div>
                            <QRScanner
                                onScanSuccess={handleCameraScan}
                                onScanFailure={(err) => console.log(err)}
                            />
                        </div>
                    ) : (
                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setShowScanner(true)}
                                className="flex items-center gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                            >
                                <Camera className="h-4 w-4" />
                                Use Camera
                            </Button>
                        </div>
                    )}

                    <form onSubmit={handleScan} className="space-y-4">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Scan className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <Input
                                    ref={inputRef}
                                    value={scanCode}
                                    onChange={(e) => setScanCode(e.target.value)}
                                    placeholder="Scan Item or Enter ID (e.g., ...001)"
                                    className="pl-10 h-12 text-lg"
                                    disabled={loading}
                                />
                            </div>
                            <Button type="submit" size="lg" disabled={loading} className="px-8 bg-blue-600 hover:bg-blue-700">
                                {loading ? 'Searching...' : 'Add to List'}
                            </Button>
                        </div>

                        {/* Messages */}
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5" />
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle className="h-5 w-5" />
                                {successMsg}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* 2. Multiple Matches Selection (Overlay/Card) */}
            {multipleMatches.length > 0 && (
                <Card className="border-2 border-orange-100 shadow-lg animate-in zoom-in-95">
                    <CardHeader className="bg-orange-50/50 pb-4">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-xl text-orange-800 flex items-center gap-2">
                                <AlertCircle className="h-6 w-6" />
                                Multiple Matches Found
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={handleCancelMatchSelection}>
                                <span className="text-2xl" aria-hidden="true">&times;</span>
                            </Button>
                        </div>
                        <CardDescription>
                            Please select the correct item from the list below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 grid gap-3">
                        {multipleMatches.map((match) => (
                            <div
                                key={match.item.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleSelectMatch(match)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{match.item.uniqueCode}</p>
                                        <p className="text-sm text-gray-500">{match.item.material.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900">{match.exhibitor.name}</p>
                                    <p className="text-xs text-gray-500">Stall: {match.exhibitor.stallNumber || 'N/A'}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 3. Queue List & Process Actions */}
            {returnQueue.length > 0 && (
                <div className="space-y-6">
                    <Card className="border shadow-md">
                        <CardHeader className="bg-gray-50 border-b py-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    <ListPlus className="h-5 w-5" />
                                    Items Pending Return
                                </h3>
                                <span className="text-sm text-gray-500">{returnQueue.length} items</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* List */}
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3">Item Code</th>
                                            <th className="px-4 py-3">Material</th>
                                            <th className="px-4 py-3">Exhibitor</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {returnQueue.map((entry) => (
                                            <tr key={entry.item.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-medium text-gray-900">
                                                    {entry.item.uniqueCode}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {entry.item.material.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">{entry.exhibitor.name}</div>
                                                    <div className="text-xs text-gray-500">Stall: {entry.exhibitor.stallNumber || '-'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                        onClick={() => removeFromQueue(entry.item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary / Actions Footer */}
                            <div className="p-4 border-t bg-gray-50 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="remarks" className="flex items-center gap-2 text-gray-700">
                                        <StickyNote className="h-4 w-4" />
                                        Remarks (Applied to all items)
                                    </Label>
                                    <Input
                                        id="remarks"
                                        placeholder="e.g. Bulk Return, Checked OK"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setReturnQueue([])}
                                        disabled={loading}
                                    >
                                        Clear List
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleProcessBatch}
                                        disabled={loading}
                                        className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
                                    >
                                        <RotateCcw className="h-5 w-5 mr-2" />
                                        {loading ? 'Processing...' : `Return ${returnQueue.length} Items`}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Exhibitor Overview (Latest) */}
                    {returnQueue.length > 0 && returnQueue[0].otherAllocations && returnQueue[0].otherAllocations.length > 0 && (
                        <Card className="border-t-4 border-t-indigo-500 shadow-sm animate-in slide-in-from-bottom-4">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg text-gray-800 flex items-center justify-between">
                                    <span>Current Exhibitor Overview</span>
                                    <span className="text-sm font-normal text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                        {returnQueue[0].exhibitor.name}
                                    </span>
                                </CardTitle>
                                <CardDescription>Outstanding materials for the most recently scanned exhibitor.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-gray-50 border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                                            <tr>
                                                <th className="px-4 py-2">Material</th>
                                                <th className="px-4 py-2 text-center">Allocated</th>
                                                <th className="px-4 py-2 text-center">Returned</th>
                                                <th className="px-4 py-2 text-center">Pending</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {returnQueue[0].otherAllocations.map((alloc) => (
                                                <tr key={alloc.id} className="hover:bg-white">
                                                    <td className="px-4 py-2 font-medium text-gray-900">
                                                        {alloc.material.name}
                                                        {alloc.items && alloc.items.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {alloc.items.map((item: any) => (
                                                                    <span key={item.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                                        ...{item.uniqueCode.slice(-3)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-gray-500">{alloc.quantity}</td>
                                                    <td className="px-4 py-2 text-center text-green-600 font-medium">
                                                        {alloc.returnedCount > 0 ? alloc.returnedCount : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-center font-bold text-orange-600">
                                                        {alloc.quantity - alloc.returnedCount}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Hint Box */}
            {returnQueue.length === 0 && multipleMatches.length === 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
                    <p className="font-semibold mb-1">💡 Scan Mode:</p>
                    <p>It's best to use a handheld barcode scanner for speed.</p>
                    <p>However, you can also use your device's camera by clicking "Use Camera" above.</p>
                </div>
            )}
        </div>
    );
}
