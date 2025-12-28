'use client';

import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

interface PrintActionsProps {
    backLink?: string;
    data?: any[];
}

export function PrintActions({ backLink = "/dashboard/reports", data = [] }: PrintActionsProps) {

    const handleDownloadCSV = () => {
        if (!data || data.length === 0) return;

        // Define Headers
        const headers = [
            'Space No.',
            'Exhibitor (Facia)',
            'Exhibitor Name',
            'Phone',
            'Size',
            'Rent (Space)',
            'Total Amount',
            'Paid',
            'Balance Due'
        ];

        // Format Rows
        const rows = data.map(item => {
            const spaceNo = item.bookings?.map((b: any) => b.space.label).join(', ') || '';
            const facia = item.faciaName || item.name;
            const size = item.bookings?.map((b: any) => b.space.category.dimensions).join(', ') || '';

            return [
                spaceNo,
                `"${facia}"`, // Quote to handle commas
                `"${item.name}"`,
                item.phone,
                size,
                item.totals.spaceTotal.toFixed(2),
                item.totals.totalCost.toFixed(2),
                item.totals.totalPaid.toFixed(2),
                item.totals.balance.toFixed(2)
            ].join(',');
        });

        // Combine
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Create Blob and Link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `exhibitor_summary_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="print:hidden mb-8 flex items-center justify-between">
            <Link href={backLink}>
                <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
            </Link>
            <div className="flex gap-2">
                {data.length > 0 && (
                    <Button onClick={handleDownloadCSV} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download CSV
                    </Button>
                )}
                <Button onClick={() => window.print()} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print / Download PDF
                </Button>
            </div>
        </div>
    );
}
