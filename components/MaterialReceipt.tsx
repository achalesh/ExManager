import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X, MessageCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaterialReceiptProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allocations: any[]; // Using any for simplicity, effectively MaterialAllocation with relations
}

export function MaterialReceipt({ open, onOpenChange, allocations }: MaterialReceiptProps) {
    if (!allocations || allocations.length === 0) return null;

    const exhibitor = allocations[0].exhibitor;
    const event = allocations[0].event;
    const spaceName = exhibitor?.bookings?.[0]?.space?.label || 'N/A';
    const date = new Date().toLocaleString();
    const grandTotal = allocations.reduce((sum, a) => sum + (a.totalPrice || 0), 0);

    const [receiptNumber, setReceiptNumber] = React.useState('');

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        if (!exhibitor) return;

        let message = `Event: ${event?.name || 'N/A'}\n`;
        message += `${event?.location || ''}\n`;
        message += `*Receipt of Material*\n`;
        if (receiptNumber) message += `Receipt No: ${receiptNumber}\n`;
        message += `Date: ${date}\n\n`;

        message += `*Exhibitor:* ${exhibitor.name}\n`;
        if (exhibitor.faciaName) message += `Facia: ${exhibitor.faciaName}\n`;
        message += `Space: ${spaceName}\n\n`;

        message += `*Allocated Items:*\n`;

        allocations.forEach(alloc => {
            message += `- ${alloc.material.name} x ${alloc.quantity}`;
            if (alloc.isFOC) message += ` (FOC)`;
            else message += ` - ₹${alloc.totalPrice.toFixed(2)}`;
            message += `\n`;
        });

        message += `*Total: ₹${grandTotal.toFixed(2)}*\n\n`;
        message += `Please contact office for any changes`;

        const encodedMessage = encodeURIComponent(message);

        // Prioritize exhibitor phone if available
        const phone = exhibitor.phone ? exhibitor.phone.replace(/\D/g, '') : '';
        const url = phone
            ? `https://wa.me/${phone}?text=${encodedMessage}`
            : `https://wa.me/?text=${encodedMessage}`;

        window.open(url, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-fit max-h-[85vh] flex flex-col p-0 gap-0 print:shadow-none print:border-none print:max-w-full print:w-full print:h-screen">
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

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    <div className="print-content bg-white p-4 rounded-lg">
                        {/* Header */}
                        <div className="text-center border-b pb-4 mb-4">
                            {event && (
                                <>
                                    {event.logo && (
                                        <div className="flex justify-center mb-2">
                                            <img
                                                src={event.logo}
                                                alt="Event Logo"
                                                className="h-16 object-contain"
                                            />
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold uppercase tracking-wide text-center">{event.name}</h3>
                                    <p className="text-xs text-gray-600 mb-2">{event.location}</p>
                                </>
                            )}
                            <DialogTitle className="text-lg font-semibold uppercase tracking-wide text-center border-t pt-2 mt-2">Material Receipt</DialogTitle>
                            {receiptNumber && <p className="text-sm font-semibold mt-1">Receipt No: {receiptNumber}</p>}
                            <p className="text-xs text-gray-500 mt-1">{date}</p>
                        </div>

                        {/* Receipt Number Input - Hidden in Print */}
                        <div className="mb-4 no-print flex items-center gap-2 justify-center">
                            <Label htmlFor="receiptNo" className="text-xs font-semibold whitespace-nowrap">Receipt No:</Label>
                            <Input
                                id="receiptNo"
                                value={receiptNumber}
                                onChange={(e) => setReceiptNumber(e.target.value)}
                                className="h-7 w-32 text-xs"
                                placeholder="Enter No."
                            />
                        </div>

                        {/* Exhibitor Info */}
                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase">Exhibitor</h3>
                                <p className="text-sm font-medium">{exhibitor?.name}</p>
                                <p className="text-xs text-gray-600">ID: {exhibitor?.id}</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase">Details</h3>
                                <p className="text-xs"><span className="font-semibold">Facia:</span> {exhibitor?.faciaName || 'N/A'}</p>
                                <p className="text-xs"><span className="font-semibold">Space:</span> {spaceName}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-4">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b-2 border-gray-100">
                                        <th className="text-left py-2">Item</th>
                                        <th className="text-center py-2">Qty</th>
                                        <th className="text-right py-2">Price</th>
                                        <th className="text-right py-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allocations.map((alloc) => (
                                        <tr key={alloc.id}>
                                            <td className="py-2">
                                                <div className="font-medium">{alloc.material.name}</div>
                                                {alloc.isFOC && (
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">FOC</span>
                                                )}
                                                {alloc.items && alloc.items.length > 0 && (
                                                    <div className="text-[10px] text-gray-500 mt-0.5 break-word w-full max-w-[200px]">
                                                        IDs: {alloc.items.map((i: any) => i.uniqueCode.split('-').pop()).join(', ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-center py-2">{alloc.quantity}</td>
                                            <td className="text-right py-2">
                                                {alloc.isFOC ? '0.00' : alloc.material.price.toFixed(2)}
                                            </td>
                                            <td className="text-right py-2 font-medium">
                                                {alloc.totalPrice.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-100 font-semibold">
                                    <tr>
                                        <td colSpan={3} className="pt-2 text-right pr-4">Grand Total</td>
                                        <td className="pt-2 text-right">₹{grandTotal.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="border-t pt-2 text-center text-[10px] text-gray-400 mt-4">
                            <p>Thank you for your request.</p>
                            <p>Authorized Signature</p>
                        </div>
                    </div>
                </div>

                {/* Sticky Footer Actions */}
                <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2 no-print shrink-0 rounded-b-lg">
                    <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
                        Close
                    </Button>
                    <Button variant="outline" onClick={handleWhatsAppShare} size="sm" className="gap-2 border-green-600 text-green-600 hover:bg-green-50">
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                    </Button>
                    <Button onClick={handlePrint} size="sm" className="gap-2">
                        <Printer className="h-3.5 w-3.5" />
                        Print
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
