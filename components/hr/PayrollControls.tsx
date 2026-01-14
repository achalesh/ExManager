'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generatePayroll } from '@/app/hr-actions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface PayrollControlsProps {
    eventId: number;
    month: number;
    year: number;
}

export function PayrollControls({ eventId, month, year }: PayrollControlsProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGenerate = async () => {
        setLoading(true);
        const result = await generatePayroll(eventId, month, year);
        if (result.success) {
            router.refresh();
        } else {
            alert('Failed to generate payroll: ' + result.error);
        }
        setLoading(false);
    };

    const handleGenerateWeekly = async () => {
        setLoading(true);
        // Determine current week scope - logic handled in backend or here?
        // Let's explicitly pass the current week based on "Today" or selected range?
        // User wanted Monday-Sunday.
        // Let's generate for the 'Last Week' relative to today, or just trigger for the 'Selected Month'.
        // Actually, if we are viewing a specific month, we likely want to generate weeks WITHIN that month?
        // Complication: Weeks span months.
        // Let's keep it simple: "Generate This Week's Payroll" (Mon-Sun ending today or future).
        // Or "Generate Last Week".
        // The prompt said "from Monday to Sunday".
        // Let's just pass a generic "Generate Weekly" which calculates for the *current* active week of the date context?
        // Let's default to generating for the currently selected Month/Year context, iterating all weeks? 
        // No, simpler: Just a button to "Generate Weekly Payroll for Booking Staff".
        // It should probably ask "For which week?" or just do it for the current week containing Today.

        // Implementation: Let's pick the Monday of the current week.
        const today = new Date();
        const day = today.getDay(); // 0 is Sunday
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(today.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startStr = monday.toISOString().split('T')[0];
        const endStr = sunday.toISOString().split('T')[0];

        const { generateWeeklyPayroll } = await import('@/app/hr-actions');
        const result = await generateWeeklyPayroll(eventId, startStr, endStr);

        if (result.success) {
            router.refresh();
            alert(`Generated weekly payroll for ${result.count} staff.`);
        } else {
            alert('Failed: ' + result.error);
        }
        setLoading(false);
    }

    return (
        <div className="flex gap-2">
            <Button onClick={handleGenerateWeekly} disabled={loading} variant="outline">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gen. Weekly (Booking)
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Monthly
            </Button>
        </div>
    );
}
