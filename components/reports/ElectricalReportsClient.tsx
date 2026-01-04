'use client';

import { useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

interface ElectricalReportsClientProps {
    allocations: any[];
    financialSummary: any[];
    eventName: string;
    totalRevenue: number;
}

export function ElectricalReportsClient({
    allocations,
    financialSummary,
    eventName,
    totalRevenue
}: ElectricalReportsClientProps) {
    const [printMode, setPrintMode] = useState<'all' | 'detailed' | 'financial'>('all');

    // CSV Download Function
    const downloadCSV = (type: 'detailed' | 'financial') => {
        let headers = [];
        let rows: any[] = [];
        let filename = '';

        if (type === 'detailed') {
            headers = ['Exhibitor', 'Facia', 'Space', 'Item', 'Quantity', 'Cost'];
            filename = `Electrical_Allocation_Detailed_${eventName.replace(/\s+/g, '_')}.csv`;

            // Flatten the grouped data back to rows for CSV
            financialSummary.forEach((item: any) => {
                item.allocations.forEach((alloc: any) => {
                    rows.push([
                        `"${item.exhibitor.name}"`,
                        `"${item.exhibitor.faciaName || ''}"`,
                        `"${item.exhibitor.bookings?.[0]?.space?.label || ''}"`,
                        `"${alloc.electricalItem.name}"`,
                        alloc.quantity,
                        alloc.totalPrice.toFixed(2)
                    ]);
                });
            });

        } else {
            headers = ['Exhibitor', 'Facia', 'Space', 'Total Items', 'Total Cost'];
            filename = `Electrical_Payment_Summary_${eventName.replace(/\s+/g, '_')}.csv`;

            rows = financialSummary.map((item: any) => [
                `"${item.exhibitor.name}"`,
                `"${item.exhibitor.faciaName || ''}"`,
                `"${item.exhibitor.bookings?.[0]?.space?.label || ''}"`,
                item.totalItems,
                item.totalCost.toFixed(2)
            ]);
            // Add Total Row
            rows.push(['Grand Total', '', '', '', totalRevenue.toFixed(2)]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Print Handling
    const handlePrint = (mode: 'detailed' | 'financial') => {
        setPrintMode(mode);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    // reset print mode listener
    if (typeof window !== 'undefined') {
        window.onafterprint = () => setPrintMode('all');
    }

    return (
        <div className={`space-y-6 ${printMode === 'detailed' ? 'print-detailed-only' : ''} ${printMode === 'financial' ? 'print-financial-only' : ''}`}>

            <style jsx global>{`
                @media print {
                    .print-detailed-only .financial-section { display: none !important; }
                    .print-detailed-only .detailed-section { display: block !important; }
                    
                    .print-financial-only .detailed-section { display: none !important; }
                    .print-financial-only .financial-section { display: block !important; }

                    /* Hide all action buttons during print */
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="flex justify-between items-end border-b pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Electrical Allocation Report</h1>
                    <p className="text-gray-600 mt-1">{eventName}</p>
                    <p className="text-sm text-gray-500 mt-2">Generated on: {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600">Total Allocations</p>
                    <p className="text-2xl font-bold text-gray-900">{allocations.length}</p>
                </div>
            </div>

            {/* Section 1: Detailed Electrical Allocation List */}
            <div className="detailed-section mb-12 break-inside-avoid">
                <div className="flex items-center justify-between mb-4 bg-gray-100 p-2 rounded">
                    <h2 className="text-xl font-bold text-gray-800">
                        1. Detailed Electrical Allocation List
                    </h2>
                    <div className="flex gap-2 no-print">
                        <Button variant="outline" size="sm" onClick={() => downloadCSV('detailed')} className="gap-2 text-xs h-8">
                            <Download className="h-3 w-3" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint('detailed')} className="gap-2 text-xs h-8">
                            <Printer className="h-3 w-3" /> Print
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase border-r w-1/4">Exhibitor</th>
                                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase border-r w-1/6">Space</th>
                                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase border-r w-1/4">Item</th>
                                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase border-r">Qty</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-700 uppercase">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {financialSummary.map((item: any) => (
                                <Fragment key={item.exhibitor.id}>
                                    {item.allocations.map((alloc: any, idx: number) => (
                                        <tr key={alloc.id} className="hover:bg-gray-50">
                                            {idx === 0 && (
                                                <>
                                                    <td className="px-4 py-2 border-r align-top bg-gray-50/30" rowSpan={item.allocations.length}>
                                                        <div className="font-bold text-gray-900">{item.exhibitor.name}</div>
                                                        {item.exhibitor.faciaName && (
                                                            <div className="text-xs text-blue-600 font-medium">Facia: {item.exhibitor.faciaName}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 border-r align-top bg-gray-50/30" rowSpan={item.allocations.length}>
                                                        {item.exhibitor.bookings?.[0]?.space?.label || <span className="text-gray-400 italic">N/A</span>}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-4 py-2 border-r align-top">
                                                {alloc.electricalItem.name}
                                            </td>
                                            <td className="px-4 py-2 border-r text-center align-top font-medium">
                                                {alloc.quantity}
                                            </td>
                                            <td className="px-4 py-2 text-right align-top font-medium">
                                                ₹{alloc.totalPrice.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 2: Financial Summary */}
            <div className="financial-section break-before-page">
                <div className="flex items-center justify-between mb-4 bg-gray-100 p-2 rounded">
                    <h2 className="text-xl font-bold text-gray-800">
                        2. Payment Details of Allocated Electrical Items
                    </h2>
                    <div className="flex gap-2 no-print">
                        <Button variant="outline" size="sm" onClick={() => downloadCSV('financial')} className="gap-2 text-xs h-8">
                            <Download className="h-3 w-3" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint('financial')} className="gap-2 text-xs h-8">
                            <Printer className="h-3 w-3" /> Print
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase border-r">Exhibitor</th>
                                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase border-r">Space</th>
                                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase border-r">Total Items</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-700 uppercase">Total Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {financialSummary.map((item: any) => (
                                <tr key={item.exhibitor.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 border-r">
                                        <div className="font-bold text-gray-900">{item.exhibitor.name}</div>
                                        {item.exhibitor.faciaName && <div className="text-xs text-gray-500">Facia: {item.exhibitor.faciaName}</div>}
                                    </td>
                                    <td className="px-4 py-3 border-r text-gray-600">
                                        {item.exhibitor.bookings?.[0]?.space?.label || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 border-r text-center font-medium">
                                        {item.totalItems}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                        ₹{item.totalCost.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot className="bg-gray-100 font-bold">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right border-r text-gray-900">
                                    Grand Total Electrical Revenue
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900">
                                    ₹{totalRevenue.toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="text-center text-xs text-gray-400 mt-8 print:mt-auto">
                <p>End of Report</p>
            </div>
        </div>
    );
}
