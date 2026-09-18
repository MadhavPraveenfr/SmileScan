'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { useCamera } from '@/lib/hooks/use-camera';
import {
    loadFaceLandmarker,
    detectFace,
    type FaceMetrics,
} from '@/lib/vision/face-detector';
import { SCAN_STEPS } from '@/lib/scan-steps';
import { useScanStore } from '@/lib/scan-store';
import { CameraView } from '@/components/scan/camera-view';
import { GuideOverlay } from '@/components/scan/guide-overlay';
import { ScanHeader } from '@/components/scan/scan-header';
import { FeedbackBanner, type FeedbackTone } from '@/components/scan/feedback-banner';
import { Button } from '@/components/ui/button';

// Framing thresholds — tune these if the guide feels too strict/lenient
const FACE_TOO_SMALL = 0.28;
const FACE_TOO_LARGE = 0.72;
const CENTER_TOLERANCE_X = 0.20;
const CENTER_TOLERANCE_Y = 0.22;

export default function ScanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const retakeStepId = searchParams.get('retake');

    const {
        videoRef,
        status,
        error,
        facingMode,
        start,
        stop,
        captureFrame,
    } = useCamera('user');

    const currentStepIndex = useScanStore((s) => s.currentStepIndex);
    const setCurrentStepIndex = useScanStore((s) => s.setCurrentStepIndex);
    const addPhoto = useScanStore((s) => s.addPhoto);
    const photos = useScanStore((s) => s.photos);

    const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
    const [landmarkerError, setLandmarkerError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<FaceMetrics | null>(null);
    const [framingReady, setFramingReady] = useState(false);
    const [feedback, setFeedback] = useState<{
        message: string;
        tone: FeedbackTone;
    }>({ message: 'Starting camera…', tone: 'loading' });
    const [flash, setFlash] = useState(false);

    const currentStep = SCAN_STEPS[currentStepIndex];
    const rafRef = useRef<number | null>(null);

    // -------- Start camera on mount --------
    useEffect(() => {
        start();
        return () => stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -------- If retaking a specific step, jump to it --------
    useEffect(() => {
        if (!retakeStepId) return;
        const idx = SCAN_STEPS.findIndex((s) => s.id === retakeStepId);
        if (idx >= 0) setCurrentStepIndex(idx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retakeStepId]);
    // -------- Load MediaPipe model once --------
    useEffect(() => {
        let cancelled = false;
        loadFaceLandmarker()
            .then((lm) => {
                if (!cancelled) setLandmarker(lm);
            })
            .catch((e) => {
                if (!cancelled) {
                    console.error('[scan] face landmarker failed:', e);
                    setLandmarkerError(
                        'Face detection unavailable. You can still capture photos manually.'
                    );
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // -------- Continuous detection loop (throttled) --------
    useEffect(() => {
        if (!landmarker || status !== 'ready') return;

        let running = true;
        let lastDetectionTime = 0;
        const DETECTION_INTERVAL_MS = 40; // ~25fps

        const loop = (now: number) => {
            if (!running) return;

            const video = videoRef.current;
            if (
                video &&
                video.readyState >= 2 &&
                now - lastDetectionTime > DETECTION_INTERVAL_MS
            ) {
                lastDetectionTime = now;
                try {
                    const m = detectFace(landmarker, video, 0);
                    setMetrics(m);
                    const { ready, message, tone } = computeGuidance(m, currentStep.id);
                    setFramingReady(ready);
                    setFeedback({ message, tone });
                } catch (e) {
                    console.error('[scan] detection error:', e);
                }
            }
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            running = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [landmarker, status, currentStep.id, videoRef]);

    // -------- Capture --------
    const handleCapture = useCallback(() => {
        const dataUrl = captureFrame(0.9);
        if (!dataUrl) return;

        setFlash(true);
        setTimeout(() => setFlash(false), 220);

        addPhoto({
            stepId: currentStep.id,
            dataUrl,
            capturedAt: Date.now(),
        });

        // If retaking a specific step, return to review immediately
        if (retakeStepId) {
            setTimeout(() => {
                stop();
                router.push('/review');
            }, 400);
            return;
        }

        if (currentStepIndex < SCAN_STEPS.length - 1) {
            setTimeout(() => setCurrentStepIndex(currentStepIndex + 1), 320);
        } else {
            setTimeout(() => {
                stop();
                router.push('/review');
            }, 400);
        }
    },
        [
            captureFrame,
            addPhoto,
            currentStep.id,
            currentStepIndex,
            setCurrentStepIndex,
            stop,
            router,
        ]);

    // -------- Hard error (permission denied / no camera) --------
    if (status === 'denied' || status === 'unavailable' || status === 'error') {
        return (
            <CameraError
                message={error ?? 'Something went wrong with the camera.'}
                onRetry={() => start()}
                onCancel={() => router.push('/prepare')}
            />
        );
    }

    const loadingModel = !landmarker && !landmarkerError;
    const starting = status !== 'ready';

    return (
        <main className="fixed inset-0 bg-black overflow-hidden">
            <ScanHeader
                currentStepIndex={currentStepIndex}
                onExit={() => {
                    stop();
                    router.push('/prepare');
                }}
            />

            {/* Camera preview */}
            <div className="absolute inset-0">
                <CameraView videoRef={videoRef} mirrored={facingMode === 'user'} />
                <GuideOverlay step={currentStep} framingReady={framingReady} />

                {flash && (
                    <div className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-200" />
                )}
            </div>

            {/* Bottom panel */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-7 pt-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                {/* Instruction */}
                <div className="text-center text-white mb-4">
                    <h2 className="text-lg font-semibold">{currentStep.title}</h2>
                    <p className="text-sm text-white/80 mt-1 max-w-sm mx-auto leading-relaxed">
                        {currentStep.instruction}
                    </p>
                </div>

                {/* Feedback pill */}
                <div className="flex justify-center mb-5">
                    {loadingModel ? (
                        <FeedbackBanner message="Loading face detection…" tone="loading" />
                    ) : starting ? (
                        <FeedbackBanner message="Starting camera…" tone="loading" />
                    ) : landmarkerError ? (
                        <FeedbackBanner message="Manual mode — tap to capture" tone="info" />
                    ) : (
                        <FeedbackBanner message={feedback.message} tone={feedback.tone} />
                    )}
                </div>

                {/* Shutter */}
                <div className="flex items-center justify-center">
                    <button
                        onClick={handleCapture}
                        disabled={loadingModel || starting}
                        aria-label="Capture photo"
                        className="relative rounded-full border-4 border-white/90 flex items-center justify-center disabled:opacity-40 transition-opacity"
                        style={{ width: 76, height: 76 }}
                    >
                        <div
                            className="rounded-full bg-white transition-all duration-200"
                            style={{
                                width: framingReady ? 56 : 46,
                                height: framingReady ? 56 : 46,
                            }}
                        />
                    </button>
                </div>

                {/* Progress text */}
                <p className="text-center text-xs text-white/60 mt-4">
                    {photos.length} of {SCAN_STEPS.length} captured
                </p>
            </div>
        </main>
    );
}

// -------- Guidance logic --------

function computeGuidance(
    m: FaceMetrics,
    stepId: string
): { ready: boolean; message: string; tone: FeedbackTone } {
    if (!m.faceDetected) {
        return { ready: false, message: 'Center your face in the frame', tone: 'info' };
    }

    if (m.faceWidth < FACE_TOO_SMALL) {
        return { ready: false, message: 'Move closer', tone: 'info' };
    }
    if (m.faceWidth > FACE_TOO_LARGE) {
        return { ready: false, message: 'Move a bit farther back', tone: 'info' };
    }

    const offX = Math.abs(m.mouthCenterX - 0.5);
    const offY = Math.abs(m.mouthCenterY - 0.52);
    if (offX > CENTER_TOLERANCE_X || offY > CENTER_TOLERANCE_Y) {
        return { ready: false, message: 'Center your mouth in the guide', tone: 'info' };
    }

    if (stepId === 'upper-arch' || stepId === 'lower-arch') {
        if (m.mouthOpenness < 0.14) {
            return { ready: false, message: 'Open your mouth wider', tone: 'warn' };
        }
    }

    return { ready: true, message: 'Looks good — hold still', tone: 'success' };
}

// -------- Error screen --------

function CameraError({
    message,
    onRetry,
    onCancel,
}: {
    message: string;
    onRetry: () => void;
    onCancel: () => void;
}) {
    return (
        <main className="min-h-screen bg-canvas flex items-center justify-center p-5">
            <div className="max-w-md w-full bg-white rounded-[var(--radius-card)] border border-border p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-coral-soft text-coral flex items-center justify-center mx-auto mb-4 text-2xl font-semibold">
                    !
                </div>
                <h1 className="text-xl font-semibold text-ink mb-2">
                    Camera unavailable
                </h1>
                <p className="text-sm text-muted mb-6">{message}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={onRetry} className="flex-1">
                        Try again
                    </Button>
                    <Button variant="secondary" onClick={onCancel} className="flex-1">
                        Go back
                    </Button>
                </div>
            </div>
        </main>
    );
}