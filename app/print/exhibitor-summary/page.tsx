import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getEventReport, getExhibitorReport } from '@/app/report-actions';
import { PrintActions } from '@/components/printing/PrintActions';

export default async function PrintableExhibitorSummary() {
    const session = await getSession();

    if (!session || !session.activeEventId) {
        redirect('/dashboard');
    }

    const [eventReport, exhibitorReport] = await Promise.all([
        getEventReport(session.activeEventId),
        getExhibitorReport(session.activeEventId)
    ]);

    if (!eventReport) {
        return <div>Event not found</div>;
    }

    const { event } = eventReport;

    // Sorting Logic: P (Pavilion) -> S (Stall) -> O (Open/Others) -> Everything else by Space Label
    const sortedReport = [...exhibitorReport].sort((a, b) => {
        const getSortKey = (exhibitor: any) => {
            // Get the first allocated space name
            const spaceName = exhibitor.bookings[0]?.space?.label || '';
            if (!spaceName) return { priority: 999, num: 0, text: '' };

            // Regex to match Prefix + Number (e.g., P01, S12, O05)
            // Case insensitive match
            const match = spaceName.match(/^([a-zA-Z]+)(\d+)$/);

            if (match) {
                const prefix = match[1].toUpperCase();
                const num = parseInt(match[2], 10);

                let priority = 4; // Default for other prefixes
                if (prefix === 'P') priority = 1;
                else if (prefix === 'S') priority = 2;
                else if (prefix === 'O') priority = 3;

                return { priority, num, text: spaceName };
            }

            // Fallback for non-standard names
            return { priority: 5, num: 0, text: spaceName };
        };

        const keyA = getSortKey(a);
        const keyB = getSortKey(b);

        // 1. Sort by Priority (P < S < O < Others)
        if (keyA.priority !== keyB.priority) {
            return keyA.priority - keyB.priority;
        }

        // 2. Sort by Number (Numerically)
        if (keyA.num !== keyB.num) {
            return keyA.num - keyB.num;
        }

        // 3. Fallback: Alphanumeric
        return keyA.text.localeCompare(keyB.text, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
        <div className="min-h-screen bg-white p-8 font-sans text-gray-900">
            {/* No-Print Actions */}
            <PrintActions data={sortedReport} />

            {/* Print Header */}
            <div className="mb-8 text-center border-b pb-8">
                <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">{event.name}</h1>
                <p className="text-gray-600">
                    Exhibitor Financial Summary
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    generated on {new Date().toLocaleDateString()}
                </p>
            </div>

            {/* Print Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="py-3 text-left font-bold uppercase">Space No.</th>
                            <th className="py-3 text-left font-bold uppercase">Exhibitor (Facia)</th>
                            <th className="py-3 text-left font-bold uppercase">Size</th>
                            <th className="py-3 text-right font-bold uppercase">Rent (Space)</th>
                            <th className="py-3 text-right font-bold uppercase">Total Amount</th>
                            <th className="py-3 text-right font-bold uppercase">Paid</th>
                            <th className="py-3 text-right font-bold uppercase">Balance Due</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedReport.map((exhibitor: any) => (
                            <tr key={exhibitor.id} className="break-inside-avoid">
                                <td className="py-4 pr-4 align-top font-mono font-medium">
                                    {exhibitor.bookings.map((b: any) => b.space.label).join(', ')}
                                </td>
                                <td className="py-4 pr-4 align-top">
                                    <div className="font-bold text-base">
                                        {exhibitor.faciaName || exhibitor.name}
                                    </div>
                                    {exhibitor.faciaName && exhibitor.name !== exhibitor.faciaName && (
                                        <div className="text-xs text-gray-500 mt-1">{exhibitor.name}</div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">{exhibitor.phone}</div>
                                </td>
                                <td className="py-4 pr-4 align-top">
                                    {exhibitor.bookings.map((b: any) => b.space.category.dimensions).join(', ')}
                                </td>
                                <td className="py-4 pl-4 text-right align-top">
                                    ₹{exhibitor.totals.spaceTotal.toFixed(2)}
                                </td>
                                <td className="py-4 pl-4 text-right align-top font-semibold">
                                    ₹{exhibitor.totals.totalCost.toFixed(2)}
                                </td>
                                <td className="py-4 pl-4 text-right align-top text-green-700">
                                    ₹{exhibitor.totals.totalPaid.toFixed(2)}
                                </td>
                                <td className={`py-4 pl-4 text-right align-top font-bold ${exhibitor.totals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{exhibitor.totals.balance.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-800 font-bold bg-gray-50 print:bg-transparent">
                            <td className="py-4 uppercase">Totals</td>
                            <td></td>
                            <td></td>
                            <td className="py-4 pl-4 text-right">
                                ₹{exhibitorReport.reduce((sum: number, e: any) => sum + e.totals.spaceTotal, 0).toFixed(2)}
                            </td>
                            <td className="py-4 pl-4 text-right">
                                ₹{exhibitorReport.reduce((sum: number, e: any) => sum + e.totals.totalCost, 0).toFixed(2)}
                            </td>
                            <td className="py-4 pl-4 text-right">
                                ₹{exhibitorReport.reduce((sum: number, e: any) => sum + e.totals.totalPaid, 0).toFixed(2)}
                            </td>
                            <td className="py-4 pl-4 text-right">
                                ₹{exhibitorReport.reduce((sum: number, e: any) => sum + e.totals.balance, 0).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

        </div>
    );
}
