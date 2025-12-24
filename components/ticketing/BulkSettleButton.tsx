'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { bulkSettleAccounts } from '@/app/staff-ticketing-actions';
import { useRouter } from 'next/navigation';
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
} from "@/components/ui/alert-dialog";

interface BulkSettleButtonProps {
    ids: number[];
    totalDifference: number;
}

export function BulkSettleButton({ ids, totalDifference }: BulkSettleButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (ids.length === 0) return null;

    const handleBulkSettle = async () => {
        setLoading(true);
        try {
            const result = await bulkSettleAccounts(ids);
            if (result.success) {
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            alert(error.message || "Failed to settle accounts");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Settle All ({ids.length})
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Settlement</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to settle <strong>{ids.length}</strong> pending accounts.
                        <br />
                        Total Net Difference: <span className={totalDifference < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                            ₹{totalDifference}
                        </span>
                        <br /><br />
                        This action will mark all selected transactions as complete.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkSettle} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Settlement
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
