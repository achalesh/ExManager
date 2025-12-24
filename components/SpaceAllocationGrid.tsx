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
} from '@/components/ui/dialog';
import { MapPin, IndianRupee, Trash2 } from 'lucide-react';
import { allocateSpace, deleteAllocation } from '@/app/allocation-actions';

interface SpaceAllocationGridProps {
    availableSpaces: any[];
    bookings: any[];
    exhibitors: any[];
    eventId: number;
}

export function SpaceAllocationGrid({ availableSpaces, bookings, exhibitors, eventId }: SpaceAllocationGridProps) {
    const [selectedSpace, setSelectedSpace] = useState<any>(null);
    const [selectedExhibitor, setSelectedExhibitor] = useState<number>(0);
    const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleAllocate() {
        if (!selectedSpace || !selectedExhibitor) return;

        setError('');
        setLoading(true);

        try {
            const result = await allocateSpace({
                spaceId: selectedSpace.id,
                exhibitorId: selectedExhibitor,
                eventId
            });

            if (result.success) {
                setSelectedSpace(null);
                setSelectedExhibitor(0);
                router.refresh();
            } else {
                setError(result.error || 'Failed to allocate space');
            }
        } catch (err) {
            setError('An error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function handleDelete(bookingId: number) {
        setDeleteConfirmation(bookingId);
    }

    async function confirmDelete() {
        if (!deleteConfirmation) return;

        setLoading(true);
        try {
            const result = await deleteAllocation(deleteConfirmation);
            if (result.success) {
                setDeleteConfirmation(null);
                router.refresh();
            } else {
                setError(result.error || 'Failed to delete allocation');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to delete allocation');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {/* Available Spaces Grid */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Spaces</h2>
                {availableSpaces.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No available spaces</h3>
                        <p className="text-gray-600">
                            All spaces have been allocated or no spaces have been created yet
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {availableSpaces.map((space) => (
                            <button
                                key={space.id}
                                onClick={() => setSelectedSpace(space)}
                                className="bg-white border-2 border-green-200 rounded-lg p-4 hover:border-green-500 hover:shadow-md transition-all text-center"
                            >
                                <div className="text-2xl font-bold text-gray-900 mb-1">
                                    {space.label}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                    {space.category.name}
                                </div>
                                <div className="text-sm font-semibold text-green-600">
                                    ₹{space.category.price}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Booked Spaces */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Booked Spaces</h2>
                {bookings.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <p className="text-gray-500">No bookings yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {bookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="bg-white border-2 border-blue-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all relative group"
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(booking.id)}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-900 hover:bg-red-50"
                                        disabled={loading}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="text-2xl font-bold text-gray-900 mb-2 text-center">
                                    {booking.space.label}
                                </div>

                                <div className="mb-2 text-center">
                                    <div className="text-sm font-semibold text-gray-900 truncate" title={booking.exhibitor.name}>
                                        {booking.exhibitor.name}
                                    </div>
                                    {booking.exhibitor.faciaName && (
                                        <div className="text-xs text-blue-600 truncate font-medium" title={booking.exhibitor.faciaName}>
                                            ({booking.exhibitor.faciaName})
                                        </div>
                                    )}
                                </div>

                                <div className="text-center pt-2 border-t border-gray-100">
                                    <div className="text-xs text-gray-500">
                                        {booking.space.category.name}
                                    </div>
                                    <div className="text-sm font-semibold text-gray-700">
                                        ₹{booking.totalAmount.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Allocation Dialog */}
            <Dialog open={!!selectedSpace} onOpenChange={() => setSelectedSpace(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Allocate Space {selectedSpace?.label}</DialogTitle>
                        <DialogDescription>
                            Select an exhibitor to allocate this space
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSpace && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Category</p>
                                        <p className="font-medium">{selectedSpace.category.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Dimensions</p>
                                        <p className="font-medium">{selectedSpace.category.dimensions}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Price</p>
                                        <p className="font-medium text-green-600">
                                            ₹{selectedSpace.category.price.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Shape</p>
                                        <p className="font-medium">{selectedSpace.category.shape}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Exhibitor *
                                </label>
                                <Select
                                    value={selectedExhibitor.toString()}
                                    onValueChange={(value) => setSelectedExhibitor(parseInt(value))}
                                    disabled={loading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose exhibitor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exhibitors.map((exhibitor) => (
                                            <SelectItem key={exhibitor.id} value={exhibitor.id.toString()}>
                                                {exhibitor.name} {exhibitor.faciaName ? `(${exhibitor.faciaName})` : ''} - {exhibitor.phone}
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
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSpace(null)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleAllocate} disabled={loading || selectedExhibitor === 0}>
                            {loading ? 'Allocating...' : 'Allocate Space'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove this allocation? This will free up the space and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmation(null)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
                            {loading ? 'Removing...' : 'Remove Allocation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
