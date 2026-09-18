'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScanStore, type Report } from '@/lib/scan-store';
import { SCAN_STEPS } from '@/lib/scan-steps';
import { Button } from '@/components/ui/button';
import { FeedbackBanner } from '@/components/scan/feedback-banner';
import {
    ArrowLeft,
    RefreshCcw,
    Check,
    ShieldCheck,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type SubmitState = 'idle' | 'submitting' | 'error';

export default function ReviewPage() {
    const router = useRouter();
    const photos = useScanStore((s) => s.photos);
    const setCurrentStepIndex = useScanStore((s) => s.setCurrentStepIndex);
    const setReport = useScanStore((s) => s.setReport);
    const reset = useScanStore((s) => s.reset);

    const [submitState, setSubmitState] = useState<SubmitState>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [email, setEmail] = useState('');

    // Map stepId → photo, so we can render in the canonical order
    const photosByStep = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of photos) map.set(p.stepId, p.dataUrl);
        return map;
    }, [photos]);

    const missing = SCAN_STEPS.filter((s) => !photosByStep.has(s.id));
    const canSubmit = missing.length === 0;

    // Redirect back to scan if nothing captured
    useEffect(() => {
        if (photos.length === 0) {
            router.replace('/scan');
        }
    }, [photos.length, router]);

    const handleRetake = (stepId: string) => {
        const idx = SCAN_STEPS.findIndex((s) => s.id === stepId);
        if (idx >= 0) setCurrentStepIndex(idx);
        router.push(`/scan?retake=${stepId}`);
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitState('submitting');
        setErrorMsg(null);

        try {
            const formData = new FormData();

            // Convert each dataUrl to a File and append with the correct field name
            for (const step of SCAN_STEPS) {
                const dataUrl = photosByStep.get(step.id);
                if (!dataUrl) continue;
                const file = await dataUrlToFile(dataUrl, `${step.id}.jpg`);
                formData.append(step.id, file);
            }

            if (email.trim()) {
                formData.append('email', email.trim());
            }

            const res = await fetch('/api/screen', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || `Request failed (${res.status})`);
            }

            // Shape the response into our store's Report type
            const report: Report = {
                assessmentId: data.assessmentId,
                triageLevel: data.triageLevel,
                summary: data.summary,
                findings: data.findings,
                alert: data.alert,
                disclaimer: data.disclaimer,
                imagesAnalyzed: data.imagesAnalyzed,
                imagesSkipped: data.imagesSkipped,
                skippedAngles: data.skippedAngles,
            };

            setReport(report);

            // Navigate to report page (which reads from the store or refetches)
            router.push(`/report/${data.assessmentId}`);
        } catch (e) {
            const err = e as Error;
            console.error('[review] submit failed:', err);
            setErrorMsg(err.message || 'Something went wrong. Please try again.');
            setSubmitState('error');
        }
    };

    // Once submitting, show a full-screen analyzing overlay
    if (submitState === 'submitting') {
        return <AnalyzingOverlay />;
    }

    return (
        <main className="min-h-screen bg-canvas pb-24">
            {/* Header */}
            <header className="border-b border-border bg-white sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/scan')}
                        className="flex items-center gap-2 text-sm text-muted hover:text-ink"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <span className="text-sm font-medium text-ink">Review photos</span>
                    <div className="w-16" />
                </div>
            </header>

            {/* Content */}
            <section className="max-w-3xl mx-auto px-5 py-8">
                <h1 className="text-2xl font-semibold text-ink">
                    Does everything look right?
                </h1>
                <p className="text-muted mt-2">
                    Check each photo. Tap any you want to retake — a clear photo gives a
                    better report.
                </p>

                {/* Thumbnail grid */}
                <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SCAN_STEPS.map((step) => {
                        const dataUrl = photosByStep.get(step.id);
                        return (
                            <PhotoTile
                                key={step.id}
                                step={step}
                                dataUrl={dataUrl}
                                onRetake={() => handleRetake(step.id)}
                            />
                        );
                    })}
                </div>

                {/* Warning if any missing */}
                {!canSubmit && (
                    <div className="mt-6 rounded-[var(--radius-card)] bg-amber-soft border border-amber/20 p-4 text-sm text-ink">
                        <strong className="font-medium">Missing:</strong>{' '}
                        {missing.map((s) => s.label).join(', ')}. Tap the empty tile to
                        capture.
                    </div>
                )}

                {/* Optional email */}
                <div className="mt-8">
                    <label className="block text-sm font-medium text-ink mb-2">
                        Email (optional)
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-11 px-4 rounded-[var(--radius-input)] border border-border bg-white text-sm focus:outline-none focus:border-regal focus:ring-2 focus:ring-regal/10"
                    />
                    <p className="text-xs text-muted mt-2">
                        We&apos;ll send a copy of your report to this address.
                    </p>
                </div>

                {/* Privacy note */}
                <div className="mt-6 flex items-start gap-3 text-xs text-muted">
                    <ShieldCheck className="w-4 h-4 text-emerald shrink-0 mt-0.5" />
                    <p>
                        Your photos are used only to generate your report. They are not
                        shared with anyone unless you request a consultation.
                    </p>
                </div>

                {/* Error message */}
                {submitState === 'error' && errorMsg && (
                    <div className="mt-5 rounded-[var(--radius-card)] bg-coral-soft border border-coral/20 p-4 text-sm text-coral">
                        {errorMsg}
                    </div>
                )}

                {/* Submit button (fixed at bottom) */}
                <div className="mt-8">
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="w-full"
                    >
                        Generate my report
                    </Button>
                    <p className="text-xs text-muted mt-3 text-center">
                        Takes about 30 seconds to analyze.
                    </p>
                </div>
            </section>
        </main>
    );
}

// -------- Photo tile --------

function PhotoTile({
    step,
    dataUrl,
    onRetake,
}: {
    step: { id: string; label: string };
    dataUrl?: string;
    onRetake: () => void;
}) {
    return (
        <div className="relative group">
            <div
                className={cn(
                    'relative rounded-[var(--radius-card)] overflow-hidden border aspect-[4/5] bg-white',
                    dataUrl ? 'border-border' : 'border-dashed border-border'
                )}
            >
                {dataUrl ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={dataUrl}
                            alt={step.label}
                            className="w-full h-full object-cover"
                        />
                        {/* Retake overlay on hover */}
                        <button
                            onClick={onRetake}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            aria-label={`Retake ${step.label}`}
                        >
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-xs font-medium text-ink">
                                <RefreshCcw className="w-3.5 h-3.5" />
                                Retake
                            </span>
                        </button>
                        {/* Green checkmark */}
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5" />
                        </div>
                    </>
                ) : (
                    <button
                        onClick={onRetake}
                        className="w-full h-full flex flex-col items-center justify-center text-muted hover:bg-canvas"
                    >
                        <RefreshCcw className="w-5 h-5 mb-1.5" />
                        <span className="text-xs font-medium">Capture</span>
                    </button>
                )}
            </div>
            <p className="text-xs text-muted mt-2 text-center">{step.label}</p>
        </div>
    );
}

// -------- Analyzing overlay --------

function AnalyzingOverlay() {
    return (
        <main className="min-h-screen bg-canvas flex items-center justify-center p-5">
            <div className="max-w-sm w-full text-center">
                <div className="w-20 h-20 rounded-full bg-regal-soft mx-auto flex items-center justify-center mb-6">
                    <Loader2 className="w-9 h-9 text-regal animate-spin" />
                </div>
                <h1 className="text-2xl font-semibold text-ink mb-2">
                    Analyzing your photos…
                </h1>
                <p className="text-muted text-sm">
                    Our AI is looking at each photo for visible signs. This usually takes
                    about 30 seconds.
                </p>
            </div>
        </main>
    );
}

// -------- Helpers --------

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/jpeg' });
}