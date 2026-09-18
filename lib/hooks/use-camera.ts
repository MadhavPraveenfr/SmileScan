'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus =
    | 'idle'
    | 'requesting'
    | 'ready'
    | 'denied'
    | 'unavailable'
    | 'error';

export interface UseCameraResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    status: CameraStatus;
    error: string | null;
    facingMode: 'user' | 'environment';
    start: () => Promise<void>;
    stop: () => void;
    switchCamera: () => void;
    captureFrame: (quality?: number) => string | null;
}

export function useCamera(
    initialFacing: 'user' | 'environment' = 'user'
): UseCameraResult {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<CameraStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
        initialFacing
    );

    const stop = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStatus('idle');
    }, []);

    const start = useCallback(async () => {
        setStatus('requesting');
        setError(null);

        // Kill any existing stream first
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus('unavailable');
            setError('Camera is not available in this browser.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch {
                    // Autoplay blocked — the element is muted, so this rarely fires
                }
            }

            setStatus('ready');
        } catch (e) {
            const err = e as DOMException;
            if (
                err.name === 'NotAllowedError' ||
                err.name === 'PermissionDeniedError'
            ) {
                setStatus('denied');
                setError(
                    'Camera permission was denied. Allow camera access and try again.'
                );
            } else if (err.name === 'NotFoundError') {
                setStatus('unavailable');
                setError('No camera found on this device.');
            } else {
                setStatus('error');
                setError(err.message || 'Failed to start camera.');
            }
        }
    }, [facingMode]);

    const switchCamera = useCallback(() => {
        setFacingMode((m) => (m === 'user' ? 'environment' : 'user'));
    }, []);

    // Restart the stream when facingMode changes — but only if we're already running
    useEffect(() => {
        if (status === 'ready' || status === 'requesting') {
            start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const captureFrame = useCallback(
        (quality = 0.9): string | null => {
            const video = videoRef.current;
            if (!video || !video.videoWidth) return null;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            // Front camera preview is mirrored on-screen — flip the capture too,
            // so the saved image matches what the user saw.
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            return canvas.toDataURL('image/jpeg', quality);
        },
        [facingMode]
    );

    return {
        videoRef,
        status,
        error,
        facingMode,
        start,
        stop,
        switchCamera,
        captureFrame,
    };
}