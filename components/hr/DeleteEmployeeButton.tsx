'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteEmployee } from '@/app/hr-actions';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeleteEmployeeButtonProps {
    id: number;
    name: string;
}

export function DeleteEmployeeButton({ id, name }: DeleteEmployeeButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteEmployee(id);
        if (result.success) {
            router.refresh();
        } else {
            alert('Failed to delete employee');
            setLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
                        Associated attendance and payroll records may also be affected or restricted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        {loading ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
