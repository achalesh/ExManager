'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { settleAccount } from '@/app/staff-ticketing-actions';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export function SettleAccountButton({ id }: { id: number }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSettle = async () => {
        if (!confirm('Are you sure you want to settle this account? This confirms the cash has been collected/returned.')) return;

        setLoading(true);
        const result = await settleAccount(id);

        if (result.success) {
            router.refresh();
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSettle}
            disabled={loading}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
            <CheckCircle className="w-4 h-4 mr-1" />
            {loading ? 'Settling...' : 'Settle'}
        </Button>
    );
}
