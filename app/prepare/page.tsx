'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sun, Sparkles, Ban, UserCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PreparePage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-canvas">
            <header className="border-b border-border bg-white">
                <div className="max-w-3xl mx-auto px-5 h-14 flex items-center">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-sm text-muted hover:text-ink"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>
            </header>

            <section className="max-w-3xl mx-auto px-5 py-10">
                <h1 className="text-3xl font-semibold text-ink">Before you start</h1>
                <p className="text-muted mt-3 max-w-xl">
                    A few things make a big difference to how accurate your report will be.
                </p>

                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                    <TipCard
                        icon={<Sun className="w-5 h-5" />}
                        title="Good lighting"
                        body="Face a window or a bright lamp. Avoid overhead-only light — it casts shadows on your teeth."
                    />
                    <TipCard
                        icon={<Sparkles className="w-5 h-5" />}
                        title="Clean your teeth"
                        body="Brush or rinse first. Food debris can look like plaque to the AI."
                    />
                    <TipCard
                        icon={<Ban className="w-5 h-5" />}
                        title="No filters or zoom"
                        body="Filters change colours and zoom hides detail. Use the plain camera at normal zoom."
                    />
                    <TipCard
                        icon={<UserCircle2 className="w-5 h-5" />}
                        title="Remove glasses"
                        body="Frames and reflections can interfere with mouth detection."
                    />
                </div>

                <div className="mt-8 rounded-[var(--radius-card)] bg-regal-soft border border-regal/10 p-5">
                    <p className="text-sm text-ink">
                        <span className="font-medium">
                            We&apos;ll ask for camera access next.
                        </span>{' '}
                        Your photos are used only to generate your report. You can delete
                        them at any time.
                    </p>
                </div>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                    <Button
                        size="lg"
                        onClick={() => router.push('/scan')}
                        className="sm:flex-1"
                    >
                        I&apos;m ready — open camera
                    </Button>
                    <Button
                        size="lg"
                        variant="secondary"
                        onClick={() => router.push('/')}
                    >
                        Cancel
                    </Button>
                </div>

                <p className="text-xs text-muted mt-6 text-center">
                    Takes about 90 seconds. You can retake any photo.
                </p>
            </section>
        </main>
    );
}

function TipCard({
    icon,
    title,
    body,
}: {
    icon: ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-[var(--radius-card)] bg-white border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-canvas flex items-center justify-center text-regal mb-3">
                {icon}
            </div>
            <h3 className="font-medium text-ink mb-1">{title}</h3>
            <p className="text-sm text-muted leading-relaxed">{body}</p>
        </div>
    );
}