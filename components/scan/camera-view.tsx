'use client';

import type { RefObject } from 'react';
import { cn } from '@/lib/cn';

interface CameraViewProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    mirrored?: boolean;
    className?: string;
}

export function CameraView({
    videoRef,
    mirrored,
    className,
}: CameraViewProps) {
    return (
        <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn(
                'absolute inset-0 w-full h-full object-cover',
                mirrored && '-scale-x-100',
                className
            )}
        />
    );
}