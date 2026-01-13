'use client';

import { DndContext, DndContextProps } from '@dnd-kit/core';
import { useState, useEffect } from 'react';

export function ClientDndContext(props: DndContextProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return <DndContext {...props} />;
}
