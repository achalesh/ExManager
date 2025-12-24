'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteTransaction } from '@/app/accounts-actions';
import { useRouter } from 'next/navigation';

export function DeleteTransactionButton({ id, source }: { id: number, source?: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Settlements are < -100000.  Payments are -1 to -99999. Manual are > 0.
    // We want to allow deleting Manual AND Payments.
    if (id <= -100000) return null; // Hide only for Settlements

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        setLoading(true);
        try {
            const result = await deleteTransaction(id);
            if (result.success) {
                router.refresh();
            } else {
                alert(result.error);
            }
        } catch (error) {
            alert('Failed to delete transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={loading}
            className="text-gray-500 hover:text-red-600 h-8 w-8"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
    );
}
