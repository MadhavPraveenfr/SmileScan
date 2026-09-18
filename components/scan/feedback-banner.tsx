'use client';

import { cn } from '@/lib/cn';
import { AlertCircle, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';

export type FeedbackTone = 'info' | 'success' | 'warn' | 'loading';

interface FeedbackBannerProps {
    message: string;
    tone: FeedbackTone;
    className?: string;
}

export function FeedbackBanner({
    message,
    tone,
    className,
}: FeedbackBannerProps) {
    const Icon =
        tone === 'success'
            ? CheckCircle2
            : tone === 'warn'
                ? AlertCircle
                : tone === 'loading'
                    ? Loader2
                    : Lightbulb;

    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-md text-sm font-medium transition-all duration-200',
                tone === 'success' && 'bg-emerald/95 text-white',
                tone === 'warn' && 'bg-coral/95 text-white',
                tone === 'info' && 'bg-white/95 text-ink',
                tone === 'loading' && 'bg-white/95 text-ink',
                className
            )}
            role="status"
            aria-live="polite"
        >
            <Icon
                className={cn(
                    'w-4 h-4 shrink-0',
                    tone === 'loading' && 'animate-spin'
                )}
            />
            {message}
        </div>
    );
}