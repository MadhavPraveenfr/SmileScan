'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ScanPageInner } from './scan-inner';

export default function ScanPage() {
    return (
        <Suspense
            fallback={
                <main className="fixed inset-0 bg-black flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </main>
            }
        >
            <ScanPageInner />
        </Suspense>
    );
}