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
import { updateExhibitor } from '@/app/exhibitor-actions';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

type Exhibitor = {
    id: number;
    name: string;
    faciaName: string;
    productCategory: string;
    idProof: string;
    contact: string;
    phone: string;
    secondaryPhone: string;
    address: string;
    email: string;
};

export function EditExhibitorDialog({ exhibitor }: { exhibitor: Exhibitor }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        formData.append('id', exhibitor.id.toString());

        const result = await updateExhibitor(formData);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            setError(result.error || 'Failed to update exhibitor');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Exhibitor Details</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Company Name</Label>
                        <Input id="name" name="name" defaultValue={exhibitor.name} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="faciaName">Facia Name</Label>
                            <Input id="faciaName" name="faciaName" defaultValue={exhibitor.faciaName} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="productCategory">Category</Label>
                            <Input id="productCategory" name="productCategory" defaultValue={exhibitor.productCategory} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact">Contact Person</Label>
                            <Input id="contact" name="contact" defaultValue={exhibitor.contact} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" defaultValue={exhibitor.email} required />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" defaultValue={exhibitor.phone} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                            <Input id="secondaryPhone" name="secondaryPhone" defaultValue={exhibitor.secondaryPhone} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="idProof">ID Proof / GST</Label>
                        <Input id="idProof" name="idProof" defaultValue={exhibitor.idProof} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" name="address" defaultValue={exhibitor.address} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
