'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteAssignment } from '@/app/staff-ticketing-actions';
import { useRouter } from 'next/navigation';
// AlertDialog imported removed as it is not present in ui library

// Since generic AlertDialog might be missing, using Dialog like before
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';

export function DeleteAssignmentButton({ id }: { id: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteAssignment(id);

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
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Assignment</DialogTitle>
                    <DialogDescription>
                        This will revert the stock to the inventory.
                        Only the most recent assignment can be deleted to ensure stock continuity.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
