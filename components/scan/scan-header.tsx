'use client';

import { SCAN_STEPS } from '@/lib/scan-steps';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

interface ScanHeaderProps {
    currentStepIndex: number;
    onExit: () => void;
}

export function ScanHeader({ currentStepIndex, onExit }: ScanHeaderProps) {
    return (
        <header className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-6 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center justify-between text-white">
                <button
                    onClick={onExit}
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                    aria-label="Exit scan"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Progress dots */}
                <div className="flex gap-1.5">
                    {SCAN_STEPS.map((s, i) => (
                        <div
                            key={s.id}
                            className={cn(
                                'h-1.5 rounded-full transition-all duration-300',
                                i < currentStepIndex && 'w-6 bg-emerald',
                                i === currentStepIndex && 'w-8 bg-white',
                                i > currentStepIndex && 'w-6 bg-white/30'
                            )}
                        />
                    ))}
                </div>

                <div className="text-xs font-medium tabular-nums w-9 text-right">
                    {currentStepIndex + 1}/{SCAN_STEPS.length}
                </div>
            </div>
        </header>
    );
}