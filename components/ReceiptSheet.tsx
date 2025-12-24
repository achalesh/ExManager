'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReactToPrint } from 'react-to-print';
import { Printer, CheckCircle } from 'lucide-react';

interface ReceiptSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: any; // Using any for simplicity in this rapid proto, ideally defined interface
}

export function ReceiptSheet({ open, onOpenChange, payment }: ReceiptSheetProps) {
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Receipt-${payment.receiptNumber}`,
        pageStyle: `
            @page { size: A5 landscape; margin: 10mm; } 
            @media print { 
                body { -webkit-print-color-adjust: exact; } 
            }
        `
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        Payment Recorded Successfully
                    </DialogTitle>
                    <DialogDescription>
                        A receipt has been generated. You can print it now.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[60vh]">
                    {/* Receipt Preview Area */}
                    <div
                        ref={printRef}
                        className="bg-white p-8 mx-auto shadow-sm text-sm"
                        style={{ width: '100%', maxWidth: '148mm', minHeight: '105mm', border: '1px solid #ddd' }}
                    >
                        {/* Header */}
                        <div className="text-center mb-6 border-b pb-4">
                            <h1 className="text-xl font-bold uppercase tracking-wide">Money Receipt</h1>
                            <p className="text-gray-500 text-xs mt-1">Event Management System</p>
                        </div>

                        {/* Meta */}
                        <div className="flex justify-between mb-6">
                            <div>
                                <p className="text-gray-500 text-xs">Receipt No:</p>
                                <p className="font-mono font-bold text-lg">{payment.receiptNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-500 text-xs">Date:</p>
                                <p className="font-medium">{new Date(payment.date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-4 mb-8">
                            <div className="flex border-b border-dotted pb-2">
                                <span className="w-32 text-gray-500">Received with thanks from:</span>
                                <span className="font-medium flex-1 italic decoration-dotted">
                                    Exhibitor ID: {payment.exhibitorId}
                                    {/* (Name would be better passed in props) */}
                                </span>
                            </div>
                            <div className="flex border-b border-dotted pb-2">
                                <span className="w-32 text-gray-500">The sum of Rupees:</span>
                                <span className="font-medium flex-1 capitalize">
                                    ₹{payment.amount.toLocaleString()}
                                    {/* Ideally convert number to words here */}
                                </span>
                            </div>
                            <div className="flex border-b border-dotted pb-2">
                                <span className="w-32 text-gray-500">On account of:</span>
                                <span className="font-medium flex-1">{payment.category} {payment.notes ? `(${payment.notes})` : ''}</span>
                            </div>
                            <div className="flex border-b border-dotted pb-2">
                                <span className="w-32 text-gray-500">By:</span>
                                <span className="font-medium flex-1">{payment.paymentMethod} {payment.referenceNumber ? `(Ref: ${payment.referenceNumber})` : ''}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-end mt-12">
                            <div className="text-center">
                                <div className="border font-bold text-lg px-4 py-2 rounded bg-gray-50">
                                    ₹ {payment.amount.toLocaleString()}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="border-t border-gray-400 w-32 mb-1"></div>
                                <p className="text-xs text-gray-500">Authorized Signatory</p>
                            </div>
                        </div>

                        <div className="text-center text-[10px] text-gray-400 mt-8">
                            Thank you for your business.
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={() => handlePrint && handlePrint()} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Print Receipt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
