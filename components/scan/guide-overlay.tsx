'use client';

import type { ScanStep } from '@/lib/scan-steps';
import { cn } from '@/lib/cn';

interface GuideOverlayProps {
    step: ScanStep;
    framingReady: boolean;
    className?: string;
}

export function GuideOverlay({
    step,
    framingReady,
    className,
}: GuideOverlayProps) {
    const stroke = framingReady ? '#12A67A' : '#1B3D2F';
    const strokeOpacity = framingReady ? 1 : 0.55;

    return (
        <svg
            className={cn(
                'absolute inset-0 w-full h-full pointer-events-none',
                className
            )}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
        >
            {/* Mask: dims everything outside the guide shape */}
            <defs>
                <mask id="scan-guide-mask">
                    <rect width="100" height="100" fill="white" />
                    <Shape step={step} fill="black" />
                </mask>
            </defs>
            <rect
                width="100"
                height="100"
                fill="rgba(0,0,0,0.35)"
                mask="url(#scan-guide-mask)"
            />

            {/* Guide outline */}
            <Shape
                step={step}
                fill="none"
                stroke={stroke}
                strokeWidth="0.6"
                strokeOpacity={strokeOpacity}
                strokeDasharray="2 1.5"
            />
        </svg>
    );
}

function Shape({
    step,
    fill,
    stroke,
    strokeWidth,
    strokeOpacity,
    strokeDasharray,
}: {
    step: ScanStep;
    fill: string;
    stroke?: string;
    strokeWidth?: string;
    strokeOpacity?: number;
    strokeDasharray?: string;
}) {
    const common = { fill, stroke, strokeWidth, strokeOpacity, strokeDasharray };

    switch (step.overlayShape) {
        case 'wide-oval':
            return <ellipse cx="50" cy="52" rx="32" ry="22" {...common} />;
        case 'top-rect':
            return (
                <rect x="22" y="10" width="56" height="44" rx="12" {...common} />
            );
        case 'bottom-rect':
            return (
                <rect x="22" y="46" width="56" height="44" rx="12" {...common} />
            );
        case 'side-oval':
            return step.overlaySide === 'left' ? (
                <ellipse cx="34" cy="50" rx="24" ry="32" {...common} />
            ) : (
                <ellipse cx="66" cy="50" rx="24" ry="32" {...common} />
            );
        default:
            return <ellipse cx="50" cy="50" rx="32" ry="25" {...common} />;
    }
}