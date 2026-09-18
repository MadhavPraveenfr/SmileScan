'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Sparkles,
  Clock,
  ChevronRight,
  Camera,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-regal flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-ink">
              SmileScan <span className="text-muted font-normal">by Carestack</span>
            </span>
          </div>
          <span className="text-xs text-muted hidden sm:block">
            Free · No sign-up
          </span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-5 pt-14 pb-10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-regal-soft text-regal text-xs font-medium mb-5">
              <Clock className="w-3.5 h-3.5" />
              2-minute screening
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold text-ink leading-tight tracking-tight">
              A quick look at
              <br />
              your smile.
            </h1>

            <p className="mt-5 text-muted text-lg leading-relaxed max-w-md">
              Take five photos of your teeth. Get an instant visual report on
              what we can see — and whether it&apos;s worth a dentist&apos;s
              opinion.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => router.push('/prepare')}
                className="group"
              >
                Start your screening
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() =>
                  document
                    .getElementById('how-it-works')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                How it works
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald" />
                Photos stay private
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald" />
                Under 2 minutes
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald" />
                Not a diagnosis
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-3xl bg-white border border-border shadow-sm overflow-hidden aspect-[4/5] max-w-sm mx-auto">
              <div className="absolute inset-0 bg-gradient-to-b from-regal-soft to-white" />
              <div className="relative h-full flex flex-col items-center justify-center p-8">
                <div className="w-40 h-32 rounded-full border-2 border-regal/40 bg-white/40 backdrop-blur-sm flex items-center justify-center mb-6">
                  <Camera className="w-8 h-8 text-regal/60" />
                </div>
                <p className="text-sm font-medium text-ink">Front smile</p>
                <p className="text-xs text-muted mt-1">Step 1 of 5</p>
                <div className="flex gap-1.5 mt-5">
                  <div className="w-6 h-1.5 rounded-full bg-regal" />
                  <div className="w-1.5 h-1.5 rounded-full bg-border" />
                  <div className="w-1.5 h-1.5 rounded-full bg-border" />
                  <div className="w-1.5 h-1.5 rounded-full bg-border" />
                  <div className="w-1.5 h-1.5 rounded-full bg-border" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="max-w-5xl mx-auto px-5 py-14">
        <h2 className="text-2xl font-semibold text-ink mb-2">How it works</h2>
        <p className="text-muted mb-10 max-w-xl">
          Three simple steps. No app to download, no account to create.
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            number="1"
            title="Take 5 photos"
            body="We'll guide you through each angle with on-screen hints. Takes about a minute."
          />
          <FeatureCard
            number="2"
            title="Instant report"
            body="Our AI highlights what it can see — staining, alignment, wear — and how confident it is."
          />
          <FeatureCard
            number="3"
            title="See a dentist if needed"
            body="If something's worth checking, request a consultation with a dentist near you."
          />
        </div>
      </section>

      <footer className="border-t border-border bg-white mt-8">
        <div className="max-w-5xl mx-auto px-5 py-6 text-xs text-muted text-center">
          This is a screening tool, not a diagnosis. Always consult a dentist
          for a confirmed evaluation.
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white border border-border p-6">
      <div className="w-9 h-9 rounded-lg bg-regal-soft text-regal text-sm font-semibold flex items-center justify-center mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}