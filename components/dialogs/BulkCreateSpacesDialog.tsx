'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Layers } from 'lucide-react';
import { bulkCreateSpaces } from '@/app/space-actions';

interface BulkCreateSpacesDialogProps {
    categories: { id: number; name: string }[];
    eventId: number;
}

export function BulkCreateSpacesDialog({ categories, eventId }: BulkCreateSpacesDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState({
        prefix: 'A',
        startNumber: 1,
        count: 10,
        categoryId: 0,
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await bulkCreateSpaces({
                ...formData,
                eventId
            });

            if (result.success) {
                setOpen(false);
                setFormData({
                    prefix: 'A',
                    startNumber: 1,
                    count: 10,
                    categoryId: 0,
                });
                router.refresh();
            } else {
                setError(result.error || 'Failed to create spaces');
            }
        } catch (err) {
            setError('An error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Layers className="mr-2 h-4 w-4" />
                    Bulk Create
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Create Spaces</DialogTitle>
                    <DialogDescription>
                        Create multiple spaces at once with sequential numbering
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Space Category *</Label>
                            <Select
                                value={formData.categoryId.toString()}
                                onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="prefix">Prefix *</Label>
                                <Input
                                    id="prefix"
                                    value={formData.prefix}
                                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                                    placeholder="A"
                                    required
                                    disabled={loading}
                                    maxLength={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="start">Start #</Label>
                                <Input
                                    id="start"
                                    type="number"
                                    value={formData.startNumber}
                                    onChange={(e) => setFormData({ ...formData, startNumber: parseInt(e.target.value) || 1 })}
                                    min={1}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="count">Count</Label>
                                <Input
                                    id="count"
                                    type="number"
                                    value={formData.count}
                                    onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                                    min={1}
                                    max={100}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-900">
                                <strong>Preview:</strong> {formData.prefix}{formData.startNumber.toString().padStart(2, '0')}
                                {' → '}
                                {formData.prefix}{(formData.startNumber + formData.count - 1).toString().padStart(2, '0')}
                                {' '}({formData.count} spaces)
                            </p>
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
                        <Button type="submit" disabled={loading || formData.categoryId === 0}>
                            {loading ? 'Creating...' : `Create ${formData.count} Spaces`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
