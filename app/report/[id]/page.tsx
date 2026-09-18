'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useScanStore, type Report } from '@/lib/scan-store';
import { Button } from '@/components/ui/button';
import { TriageBadge } from '@/components/ui/triage-badge';
import { FindingCard } from '@/components/report/finding-card';
import { PhotoGallery } from '@/components/report/photo-gallery';
import { BookingCTA } from '@/components/report/booking-cta';
import {
    ArrowLeft,
    AlertTriangle,
    Loader2,
    Sparkles,
    Calendar,
    CheckCircle2,
    Trash2,
    ShieldCheck,
} from 'lucide-react';

type LoadState = 'loading' | 'ready' | 'error';

export default function ReportPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const storeReport = useScanStore((s) => s.report);
    const setReport = useScanStore((s) => s.setReport);


    const [state, setState] = useState<LoadState>('loading');
    const [error, setError] = useState<string | null>(null);
    const [report, setLocalReport] = useState<Report | null>(null);
    const [hoveredFinding, setHoveredFinding] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [photosDeleted, setPhotosDeleted] = useState(false);

    const id = params?.id;

    useEffect(() => {
        if (!id) return;

        // Only use the store version if it's complete (has photos).
        // The version from /api/screen does not include photo URLs — those
        // come from /api/report/[id], which generates signed URLs.
        if (
            storeReport?.assessmentId === id &&
            (storeReport.photos?.length ?? 0) > 0
        ) {
            setLocalReport(storeReport);
            setPhotosDeleted(storeReport.photosDeleted === true);
            setState('ready');
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/report/${id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);

                const r: Report = {
                    assessmentId: data.assessmentId,
                    triageLevel: data.triageLevel,
                    summary: data.summary,
                    findings: data.findings,
                    alert: data.alert,
                    disclaimer: data.disclaimer,
                    imagesAnalyzed: data.imagesAnalyzed,
                    imagesSkipped: data.imagesSkipped,
                    photos: data.photos,
                };

                if (!cancelled) {
                    setLocalReport(r);
                    setReport(r);
                    setPhotosDeleted(r.photosDeleted === true);
                    setState('ready');
                }
            } catch (e) {
                if (!cancelled) {
                    setError((e as Error).message);
                    setState('error');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, storeReport, setReport]);

    const handleDeletePhotos = async () => {
        if (
            !confirm(
                'Delete your photos? Your report stays available, but the images will be permanently removed.'
            )
        ) {
            return;
        }
        setDeleting(true);
        try {
            const res = await fetch(`/api/report/${id}/purge`, { method: 'POST' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || `Failed (${res.status})`);
            }
            setPhotosDeleted(true);
            // Clear photos from local report so the gallery unmounts immediately
            if (report) {
                setLocalReport({ ...report, photos: [] });
            }
        } catch (e) {
            alert((e as Error).message);
        } finally {
            setDeleting(false);
        }
    };

    if (state === 'loading') return <LoadingView />;
    if (state === 'error' || !report) return <ErrorView message={error} />;

    // Only show findings the AI is reasonably confident about.
    const CONFIDENCE_THRESHOLD = 0.8;
    const visibleFindings = report.findings.filter(
        (f) => f.confidence >= CONFIDENCE_THRESHOLD
    );
    const hiddenCount = report.findings.length - visibleFindings.length;

    const hasPhotos = (report.photos?.length ?? 0) > 0;
    const hasFindings = visibleFindings.length > 0;
    const hadFindingsButFiltered =
        report.findings.length > 0 && visibleFindings.length === 0;

    return (
        <main className="min-h-screen bg-canvas pb-16">
            <header className="border-b border-border bg-white sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-sm text-muted hover:text-ink"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Home
                    </button>
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Sparkles className="w-4 h-4 text-regal" />
                        Your report
                    </div>
                    <div className="w-16" />
                </div>
            </header>

            <section className="max-w-3xl mx-auto px-5 py-8">
                {/* Alert banner */}
                {report.alert && (
                    <div className="mb-5 rounded-[var(--radius-card)] bg-coral-soft border border-coral/30 p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-coral">Please read this</p>
                            <p className="text-sm text-ink mt-1">{report.alert}</p>
                        </div>
                    </div>
                )}

                {/* Triage + summary */}
                <div className="rounded-[var(--radius-card)] bg-white border border-border p-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <TriageBadge level={report.triageLevel} />
                        <span className="text-xs text-muted inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date().toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </span>
                    </div>

                    <h1 className="text-2xl font-semibold text-ink mt-4 leading-snug">
                        {report.summary}
                    </h1>

                    <p className="text-sm text-muted mt-3">
                        Analyzed {report.imagesAnalyzed} of{' '}
                        {report.imagesAnalyzed + report.imagesSkipped} photos.
                        {hasFindings &&
                            ` ${visibleFindings.length} visible ${visibleFindings.length === 1 ? 'sign' : 'signs'
                            } flagged.`}
                    </p>
                </div>

                {/* Photo gallery */}
                {hasPhotos && !photosDeleted && (
                    <div className="mt-8">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-lg font-semibold text-ink">Your photos</h2>
                            <p className="text-xs text-muted">Tap to enlarge</p>
                        </div>
                        <PhotoGallery
                            photos={report.photos!}
                            findings={visibleFindings}
                            highlightedFindingKey={hoveredFinding}
                        />
                        <p className="text-xs text-muted mt-3">
                            Boxes outline areas where visible signs were detected.
                        </p>

                        {/* Privacy controls */}
                        <div className="mt-5 p-4 rounded-[var(--radius-card)] bg-canvas border border-border">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="w-4 h-4 text-emerald shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm text-ink font-medium">
                                        Your photos, your control
                                    </p>
                                    <p className="text-xs text-muted mt-1 leading-relaxed">
                                        Photos are automatically deleted after 24 hours if you
                                        don&apos;t request a consultation. You can delete them
                                        right now — your report stays available.
                                    </p>
                                    <button
                                        onClick={handleDeletePhotos}
                                        disabled={deleting}
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-coral hover:underline disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {deleting ? 'Deleting…' : 'Delete my photos now'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {photosDeleted && (
                    <div className="mt-8 p-4 rounded-[var(--radius-card)] bg-emerald-soft border border-emerald/20">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-4 h-4 text-emerald shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-ink font-medium">Photos deleted</p>
                                <p className="text-xs text-muted mt-1 leading-relaxed">
                                    Your photos have been removed. Your report remains available
                                    below.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Findings */}
                <div className="mt-10">
                    <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-lg font-semibold text-ink">
                            What we noticed
                        </h2>
                        {hasFindings && (
                            <p className="text-xs text-muted">
                                {visibleFindings.length}{' '}
                                {visibleFindings.length === 1 ? 'finding' : 'findings'}
                            </p>
                        )}
                    </div>

                    {hasFindings ? (
                        <div className="flex flex-col gap-3">
                            {visibleFindings.map((f, i) => (
                                <FindingCard
                                    key={i}
                                    finding={f}
                                    onHover={setHoveredFinding}
                                />
                            ))}
                        </div>
                    ) : hadFindingsButFiltered ? (
                        <div className="rounded-[var(--radius-card)] bg-white border border-border p-8 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald mx-auto mb-3" />
                            <p className="font-medium text-ink mb-1">
                                Nothing we&apos;re confident about
                            </p>
                            <p className="text-sm text-muted">
                                Our AI noticed a few faint possibilities in your photos but
                                couldn&apos;t confirm them from the images. A dentist can see
                                things a screening can&apos;t — a routine check-up is still
                                worthwhile.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-[var(--radius-card)] bg-white border border-border p-8 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald mx-auto mb-3" />
                            <p className="font-medium text-ink mb-1">
                                No obvious concerns detected
                            </p>
                            <p className="text-sm text-muted">
                                Nothing stood out in your photos. Keep up regular brushing,
                                flossing, and routine dental check-ups.
                            </p>
                        </div>
                    )}
                </div>

                {/* Booking */}
                <div className="mt-10">
                    <BookingCTA report={report} />
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-muted mt-8 text-center leading-relaxed">
                    {report.disclaimer}
                </p>
            </section>
        </main>
    );
}

// -------- Loading --------

function LoadingView() {
    return (
        <main className="min-h-screen bg-canvas flex items-center justify-center p-5">
            <div className="text-center">
                <Loader2 className="w-8 h-8 text-regal animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted">Loading your report…</p>
            </div>
        </main>
    );
}

// -------- Error --------

function ErrorView({ message }: { message: string | null }) {
    const router = useRouter();
    return (
        <main className="min-h-screen bg-canvas flex items-center justify-center p-5">
            <div className="max-w-md w-full bg-white rounded-[var(--radius-card)] border border-border p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-coral-soft text-coral flex items-center justify-center mx-auto mb-4 text-2xl font-semibold">
                    !
                </div>
                <h1 className="text-xl font-semibold text-ink mb-2">
                    Couldn&apos;t load report
                </h1>
                <p className="text-sm text-muted mb-6">
                    {message ?? 'The report may have expired or the link is invalid.'}
                </p>
                <Button onClick={() => router.push('/')} className="w-full">
                    Start a new screening
                </Button>
            </div>
        </main>
    );
}