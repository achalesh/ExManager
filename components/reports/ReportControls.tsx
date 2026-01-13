'use client';

import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface ReportControlsProps {
    eventName: string;
    exhibitorReport: any[];
    allocationSummary: any;
}

export function ReportControls({ eventName, exhibitorReport, allocationSummary }: ReportControlsProps) {

    const handlePrint = () => {
        window.print();
    };

    const handleExportExhibitors = () => {
        const headers = ['Exhibitor Name', 'Phone', 'Email', 'Space Cost', 'Material Cost', 'Electrical Cost', 'Shed Cost', 'Total Cost', 'Advance Paid', 'Balance'];

        const rows = exhibitorReport.map(ex => [
            ex.name,
            ex.phone,
            ex.email,
            ex.totals.spaceTotal.toFixed(2),
            ex.totals.materialTotal.toFixed(2),
            ex.totals.electricalTotal.toFixed(2),
            ex.totals.shedTotal.toFixed(2),
            ex.totals.totalCost.toFixed(2),
            ex.totals.advancePaid.toFixed(2),
            ex.totals.balance.toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        downloadCSV(csvContent, `${eventName.replace(/\s+/g, '_')}_Exhibitor_Report.csv`);
    };

    const handleExportAllocations = () => {
        // We can combine summaries or do separate ones. Let's do a combined one for simplicity or logic to download multiple?
        // Let's download a combined allocation summary.

        const rows: string[] = [];
        rows.push('Type,Item Name,Quantity/Spec,Count,Total Cost');

        if (allocationSummary) {
            allocationSummary.materials.forEach((m: any) => {
                rows.push(`Material,${m.name},${m.totalQuantity} ${m.unit},${m.allocations},${m.totalCost.toFixed(2)}`);
            });
            allocationSummary.electrical.forEach((e: any) => {
                rows.push(`Electrical,${e.name},${e.totalQuantity} units (${e.totalWattage}W total),${e.allocations},${e.totalCost.toFixed(2)}`);
            });
            allocationSummary.sheds.forEach((s: any) => {
                rows.push(`Shed,${s.name},${s.dimensions},${s.allocations},${s.totalCost.toFixed(2)}`);
            });
        }

        const csvContent = rows.join('\n');
        downloadCSV(csvContent, `${eventName.replace(/\s+/g, '_')}_Allocation_Report.csv`);
    };

    const downloadCSV = (content: string, fileName: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handleExportExhibitors}>
                <Download className="h-4 w-4 mr-2" />
                Export Financials
            </Button>
            <Button variant="outline" onClick={handleExportAllocations}>
                <Download className="h-4 w-4 mr-2" />
                Export Allocations
            </Button>
            <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
            </Button>
        </div>
    );
}
