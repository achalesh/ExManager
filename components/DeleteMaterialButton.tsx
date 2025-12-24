'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { deleteMaterial } from '@/app/resource-actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function DeleteMaterialButton({ id, name }: { id: number, name: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'confirming' | 'loading' | 'success'>('idle');

    useEffect(() => {
        if (status === 'confirming') {
            const timer = setTimeout(() => setStatus('idle'), 3000); // Reset after 3s if not confirmed
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (status === 'idle') {
            setStatus('confirming');
            return;
        }

        if (status === 'confirming') {
            setStatus('loading');
            try {
                console.log(`Attempting DELETE for material ${id}`);
                const result = await deleteMaterial(id);
                console.log('Delete result:', result);

                if (result.success) {
                    setStatus('success');
                    router.refresh(); // Refresh data
                    // Keep success state briefly or unmount
                } else {
                    alert(`Error: ${result.error}`);
                    setStatus('idle');
                }
            } catch (err: any) {
                console.error(err);
                alert(`Exception: ${err.message}`);
                setStatus('idle');
            }
        }
    };

    if (status === 'success') {
        return <div className="text-green-600 flex items-center"><CheckCircle2 className="h-4 w-4 mr-1" /> Deleted</div>;
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                "flex items-center gap-1 px-3 py-2 rounded-md transition-all duration-200 border text-sm font-medium shadow-sm",
                status === 'idle'
                    ? "text-red-600 bg-white border-gray-200 hover:bg-red-50 hover:border-red-200"
                    : "",
                status === 'confirming'
                    ? "bg-red-600 text-white border-red-700 hover:bg-red-700 w-full justify-center"
                    : "",
                status === 'loading'
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : ""
            )}
            disabled={status === 'loading'}
            title="Delete Material"
        >
            {status === 'idle' && (
                <>
                    <Trash2 className="h-4 w-4" />
                </>
            )}
            {status === 'confirming' && (
                <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>Confirm?</span>
                </>
            )}
            {status === 'loading' && (
                <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            )}
        </button>
    );
}
