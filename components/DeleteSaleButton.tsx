'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteTicketSale } from '@/app/ticketing-actions';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';

export function DeleteSaleButton({ id }: { id: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteTicketSale(id);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 h-8 border-red-200">
                    <Trash2 className="w-4 h-4 mr-1" />
                    <span className="sr-only sm:not-sr-only sm:inline-block text-xs">Delete</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Void/Delete Transaction</DialogTitle>
                    <DialogDescription>
                        This will remove the revenue from your reports.
                        <br /><br />
                        <strong>Stock Restoration:</strong> If these were the <em>most recently sold</em> tickets, they will be added back to stock automatically.
                        <br />
                        Otherwise, the ticket numbers will remain marked as "used" to prevent gaps.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
                        {loading ? 'Processing...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
