'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { undoReconciliation } from '@/app/staff-ticketing-actions';
import { useRouter } from 'next/navigation';

export function UndoReconcileButton({ id }: { id: number }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUndo = async () => {
        if (!confirm('Are you sure you want to undo this reconciliation? This will remove the sales record and returned stock.')) return;

        setLoading(true);
        const result = await undoReconciliation(id);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={loading}
            className="text-gray-500 hover:text-red-600"
            title="Undo Reconciliation"
        >
            <Undo2 className="h-4 w-4" />
        </Button>
    );
}
