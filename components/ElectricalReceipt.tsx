import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, MessageCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';

interface ElectricalReceiptProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allocations: any[];
}

export function ElectricalReceipt({ open, onOpenChange, allocations }: ElectricalReceiptProps) {
    if (!allocations || allocations.length === 0) return null;

    const exhibitor = allocations[0].exhibitor;
    const event = allocations[0].event;
    const spaceName = exhibitor?.bookings?.[0]?.space?.label || 'N/A';
    const date = new Date().toLocaleString();
    const grandTotal = allocations.reduce((sum, a) => sum + (a.totalPrice || 0), 0);

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        if (!exhibitor) return;

        const handleWhatsAppShare = () => {
            if (!exhibitor) return;

            let message = `Event: ${event?.name || 'N/A'}\n`;
            message += `${event?.location || ''}\n`;
            message += `*Receipt of Electrical*\n`;
            message += `Date: ${date}\n\n`;

            message += `*Exhibitor:* ${exhibitor.name}\n`;
            if (exhibitor.faciaName) message += `Facia: ${exhibitor.faciaName}\n`;
            message += `Space: ${spaceName}\n\n`;

            message += `*Allocated Items:*\n`;

            allocations.forEach(alloc => {
                message += `- ${alloc.electricalItem.name} x ${alloc.quantity}`;
                message += ` - ₹${alloc.totalPrice.toFixed(2)}`;
                message += `\n`;
            });

            message += `*Total: ₹${grandTotal.toFixed(2)}*\n\n`;
            message += `Please contact office for any changes`;

            const encodedMessage = encodeURIComponent(message);
            const phone = exhibitor.phone ? exhibitor.phone.replace(/\D/g, '') : '';
            const url = phone
                ? `https://wa.me/${phone}?text=${encodedMessage}`
                : `https://wa.me/?text=${encodedMessage}`;

            window.open(url, '_blank');
        };

        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px] print:shadow-none print:border-none print:max-w-full print:w-full print:h-screen">
                    <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-content, .print-content * {
                            visibility: visible;
                        }
                        .print-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%; /* Or auto */
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        /* Hide dialog overlay/close buttons during print */
                        [role="dialog"] > button {
                            display: none;
                        }
                    }
                `}</style>

                    <div className="print-content bg-white p-4 rounded-lg">
                        {/* Header */}
                        <div className="text-center border-b pb-4 mb-4">
                            {event && (
                                <>
                                    <h3 className="text-2xl font-bold uppercase tracking-wide text-center">{event.name}</h3>
                                    <p className="text-sm text-gray-600 mb-2">{event.location}</p>
                                </>
                            )}
                            <DialogTitle className="text-xl font-semibold uppercase tracking-wide text-center border-t pt-2 mt-2">Electrical Receipt</DialogTitle>
                            <p className="text-sm text-gray-500 mt-1">{date}</p>
                        </div>

                        {/* Exhibitor Info */}
                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase">Exhibitor</h3>
                                <p className="text-lg font-medium">{exhibitor?.name}</p>
                                <p className="text-sm text-gray-600">ID: {exhibitor?.id}</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase">Details</h3>
                                <p className="text-sm"><span className="font-semibold">Facia:</span> {exhibitor?.faciaName || 'N/A'}</p>
                                <p className="text-sm"><span className="font-semibold">Space:</span> {spaceName}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-100">
                                        <th className="text-left py-2">Item</th>
                                        <th className="text-center py-2">Qty</th>
                                        <th className="text-right py-2">Wattage</th>
                                        <th className="text-right py-2">Price</th>
                                        <th className="text-right py-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allocations.map((alloc) => (
                                        <tr key={alloc.id}>
                                            <td className="py-3">
                                                <div className="font-medium">{alloc.electricalItem.name}</div>
                                                <div className="text-xs text-gray-500">{alloc.electricalItem.wattage}W each</div>
                                            </td>
                                            <td className="text-center py-3">{alloc.quantity}</td>
                                            <td className="text-right py-3 text-orange-600">{alloc.totalWattage}W</td>
                                            <td className="text-right py-3">
                                                {alloc.electricalItem.price.toFixed(2)}
                                            </td>
                                            <td className="text-right py-3 font-medium">
                                                {alloc.totalPrice.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-100 font-semibold">
                                    <tr>
                                        <td colSpan={4} className="pt-4 text-right pr-4">Grand Total</td>
                                        <td className="pt-4 text-right">₹{grandTotal.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="border-t pt-4 text-center text-xs text-gray-400 mt-8">
                            <p>Thank you for your request.</p>
                            <p>Authorized Signature</p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 mt-4 no-print">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button variant="outline" onClick={handleWhatsAppShare} className="gap-2 border-green-600 text-green-600 hover:bg-green-50">
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                        </Button>
                        <Button onClick={handlePrint} className="gap-2">
                            <Printer className="h-4 w-4" />
                            Print Receipt
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }
