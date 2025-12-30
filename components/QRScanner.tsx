'use client';

import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card } from '@/components/ui/card';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize Scanner
        // Use a unique ID for the element
        const scannerId = 'reader';

        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                scannerId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true
                },
                /* verbose= */ false
            );

            scannerRef.current.render(
                (decodedText) => {
                    // Success callback
                    // Clear the scanner after successful scan to avoid multiple rapid fires
                    // scannerRef.current?.clear(); 
                    // Actually, for batch scanning, we might want to keep it open?
                    // But usually, we want to pause processing.
                    // For now, let's just trigger the callback. The parent can handle state.
                    onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Failure callback
                    if (onScanFailure) onScanFailure(errorMessage);
                }
            );
        }

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [onScanSuccess, onScanFailure]);

    return (
        <Card className="p-4 bg-black overflow-hidden rounded-xl border-gray-800">
            <div id="reader" className="w-full h-full text-white"></div>
            <style jsx global>{`
                #reader__scan_region {
                    background: transparent !important;
                }
                #reader__dashboard_section_csr button {
                    background: white;
                    color: black;
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid #ccc;
                    margin-top: 8px;
                }
                #reader__dashboard_section_swaplink { 
                    color: white !important;
                    text-decoration: underline;
                }
             `}</style>
        </Card>
    );
}
