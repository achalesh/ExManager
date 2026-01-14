'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateInvoice } from '@/app/billing-actions';
import { Loader2, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PaymentDialog } from '../dialogs/PaymentDialog';

interface BillingControlsProps {
    exhibitorId: number;
    eventId: number;
    pendingAmount: number;
}

export function BillingControls({ exhibitorId, eventId, pendingAmount }: BillingControlsProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleGenerateInvoice() {
        if (!confirm("Are you sure you want to generate a new invoice based on current allocations?")) return;
        setLoading(true);
        try {
            const res = await generateInvoice(exhibitorId, eventId);
            if (res.success) {
                router.refresh();
            } else {
                alert("Failed: " + res.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error generating invoice");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex gap-2">
            <Button onClick={handleGenerateInvoice} disabled={loading} variant="outline">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                Generate Invoice
            </Button>

            <PaymentDialog
                exhibitorId={exhibitorId}
                eventId={eventId}
                suggestedAmount={pendingAmount > 0 ? pendingAmount : 0}
            />
        </div>
    );
}
