'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addBulkMaterialItems } from '@/app/inventory-actions';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';

interface Props {
    materialId: number;
    materialName: string;
    onSuccess?: () => void;
}

export function BulkAddMaterialDialog({ materialId, materialName, onSuccess }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [quantity, setQuantity] = useState(10);
    const [prefix, setPrefix] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await addBulkMaterialItems({
            materialId,
            quantity,
            prefix: prefix || undefined,
        });

        if (result.success) {
            setOpen(false);
            router.refresh();
            if (onSuccess) onSuccess();
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle className="h-4 w-4" />
                    Bulk Add
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Inventory: {materialName}</DialogTitle>
                    <DialogDescription>
                        Generate multiple unique items with QR codes.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity
                        </Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            max="100"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="prefix" className="text-right">
                            Prefix
                        </Label>
                        <Input
                            id="prefix"
                            placeholder={`e.g. MAT-${materialName.substring(0, 3).toUpperCase()}-`}
                            value={prefix}
                            onChange={(e) => setPrefix(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Generating...' : 'Generate Items'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
