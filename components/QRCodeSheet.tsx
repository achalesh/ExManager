'use client';

import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface MaterialItem {
    id: number;
    uniqueCode: string;
    status: string;
}

interface Props {
    materialName: string;
    items: MaterialItem[];
}

export function QRCodeSheet({ materialName, items }: Props) {
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `QR Codes - ${materialName}`,
        pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    `,
    });

    if (items.length === 0) return null;

    return (
        <div>
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                Print QR Codes
            </Button>

            <div style={{ display: 'none' }}>
                <div ref={printRef} className="p-8 grid grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div key={item.id} className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center h-48 break-inside-avoid">
                            <div className="mb-2">
                                <QRCode value={item.uniqueCode} size={96} />
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-sm uppercase">{materialName}</div>
                                <div className="font-mono text-xs mt-1 text-gray-600">{item.uniqueCode}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
