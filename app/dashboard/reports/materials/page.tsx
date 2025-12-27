import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMaterialAllocations } from '@/app/allocation-actions';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';
import { MaterialReportsClient } from '@/components/reports/MaterialReportsClient';
import { Fragment } from 'react';

export const revalidate = 0;

export default async function AllocatedMaterialsReportPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.activeEventId) {
        redirect('/dashboard');
    }

    const allocations = await getMaterialAllocations(session.activeEventId);

    // Group by Exhibitor for Financial Report
    const financialSummary = Object.values(allocations.reduce((acc: any, curr: any) => {
        const exhId = curr.exhibitorId;
        if (!acc[exhId]) {
            acc[exhId] = {
                exhibitor: curr.exhibitor,
                totalItems: 0,
                totalCost: 0,
                allocations: []
            };
        }
        acc[exhId].totalItems += curr.quantity;
        acc[exhId].totalCost += curr.totalPrice;
        acc[exhId].allocations.push(curr);
        return acc;
    }, {})).sort((a: any, b: any) => a.exhibitor.name.localeCompare(b.exhibitor.name));

    const totalRevenue = allocations.reduce((sum, a) => sum + a.totalPrice, 0);

    return (
        <div className="max-w-7xl mx-auto p-8 bg-white min-h-screen">
            <div className="flex justify-between items-start mb-8 print:hidden">
                <Link href="/dashboard/reports">
                    <Button variant="ghost" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Reports
                    </Button>
                </Link>
                {/* Print All Button */}
                <PrintButton />
            </div>

            <MaterialReportsClient
                allocations={allocations}
                financialSummary={financialSummary}
                eventName={session.activeEventName || 'Event'}
                totalRevenue={totalRevenue}
            />
        </div>
    );
}
