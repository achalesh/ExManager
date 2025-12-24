'use client';

import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface TicketingReportControlsProps {
    data: any;
    filename: string;
}

export function TicketingReportControls({ data, filename }: TicketingReportControlsProps) {

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        // Flatten data for CSV
        // This depends on the structure of 'data' (the report object)
        // Let's assume we want to export the recent transactions or category summary.
        // For now, let's just export the breakdown by category and type.

        const rows: string[] = [];
        rows.push('Category,Revenue,Count');
        Object.entries(data.byCategory as Record<string, any>).forEach(([cat, stats]) => {
            rows.push(`${cat},${stats.revenue},${stats.count}`);
        });

        rows.push('');
        rows.push('Type,Revenue,Count');
        Object.entries(data.byType as Record<string, any>).forEach(([type, stats]) => {
            rows.push(`${type},${stats.revenue},${stats.count}`);
        });

        rows.push('');
        rows.push('Transactions');
        rows.push('ID,Date,Amount,Count,Type');
        data.recentTransactions.forEach((tx: any) => {
            rows.push(`${tx.id},${tx.date},${tx.amount},${tx.count},${tx.type}`);
        });

        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
            </Button>
            <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
            </Button>
        </div>
    );
}
