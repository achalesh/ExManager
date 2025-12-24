'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteTicketBatch } from '@/app/ticketing-actions';
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

export function DeleteBatchButton({ id }: { id: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteTicketBatch(id);

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
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Deactivate/Remove Batch</DialogTitle>
                    <DialogDescription>
                        This will remove the current active stock series.
                        You can only delete it if NO tickets have been sold from it.
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
