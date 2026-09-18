'use client';

import { useState } from 'react';
import type { Report } from '@/lib/scan-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
    CalendarClock,
    Check,
    ChevronDown,
    Loader2,
    MapPin,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

type View = 'cta' | 'form' | 'success' | 'error';

interface BookingCTAProps {
    report: Report;
}

// -------- Triage-aware copy --------

const COPY: Record<
    Report['triageLevel'],
    {
        headline: string;
        subhead: string;
        cta: string;
        bg: string;
        border: string;
        accent: string;
    }
> = {
    routine: {
        headline: 'Still worth a professional look',
        subhead:
            'A quick check-up is the best way to confirm nothing has changed since your last visit.',
        cta: 'Book a routine check-up',
        bg: 'bg-regal-soft',
        border: 'border-regal/20',
        accent: 'text-regal',
    },
    soon: {
        headline: 'Have a dentist take a look',
        subhead:
            'Based on what showed up in your photos, a consultation is worth scheduling in the next few weeks.',
        cta: 'Book a consultation',
        bg: 'bg-amber-soft',
        border: 'border-amber/20',
        accent: 'text-amber',
    },
    urgent: {
        headline: 'See a dentist soon',
        subhead:
            'Some findings here are worth checking in person sooner rather than later.',
        cta: 'Request urgent consultation',
        bg: 'bg-coral-soft',
        border: 'border-coral/20',
        accent: 'text-coral',
    },
};

// -------- Component --------

export function BookingCTA({ report }: BookingCTAProps) {
    const copy = COPY[report.triageLevel];
    const [view, setView] = useState<View>('cta');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(report.email ?? '');
    const [clinic, setClinic] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setErrorMsg(null);

        // Light client validation (backend validates anyway)
        const errs: Record<string, string> = {};
        if (name.trim().length < 2) errs.name = 'Please enter your name';
        if (phone.replace(/\D/g, '').length < 10)
            errs.phone = 'Enter a valid phone number';
        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId: report.assessmentId,
                    name: name.trim(),
                    phone: phone.trim(),
                    email: email.trim() || undefined,
                    preferredClinic: clinic.trim() || undefined,
                    notes: notes.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                if (data?.fields) {
                    setFieldErrors(data.fields);
                }
                throw new Error(data?.error || `Request failed (${res.status})`);
            }

            setBookingId(data.bookingId);
            setView('success');
        } catch (e) {
            setErrorMsg((e as Error).message);
            setView('error');
        } finally {
            setSubmitting(false);
        }
    };

    // -------- Success state --------
    if (view === 'success' && bookingId) {
        return (
            <div className="rounded-[var(--radius-card)] bg-emerald-soft border border-emerald/20 p-6">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald text-white flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-ink text-lg">
                            Request received
                        </h3>
                        <p className="text-sm text-ink/80 mt-1 leading-relaxed">
                            Your report and contact details have been sent to a dentist.
                            They&apos;ll reach out to <strong>{phone}</strong> within one
                            business day.
                        </p>
                        <p className="text-xs text-muted mt-3 font-mono">
                            Ref: {bookingId.slice(0, 8)}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // -------- CTA state --------
    if (view === 'cta') {
        return (
            <div
                className={cn(
                    'rounded-[var(--radius-card)] border p-6',
                    copy.bg,
                    copy.border
                )}
            >
                <div className="flex items-start gap-4">
                    <div
                        className={cn(
                            'w-11 h-11 rounded-lg bg-white/70 flex items-center justify-center shrink-0',
                            copy.accent
                        )}
                    >
                        <CalendarClock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-ink text-lg leading-snug">
                            {copy.headline}
                        </h3>
                        <p className="text-sm text-ink/80 mt-1.5 leading-relaxed">
                            {copy.subhead}
                        </p>

                        <Button
                            size="lg"
                            onClick={() => setView('form')}
                            className="mt-5 w-full sm:w-auto"
                        >
                            {copy.cta}
                        </Button>

                        <p className="text-xs text-muted mt-3">
                            Free to request. No payment until you visit.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // -------- Form state --------
    return (
        <div className="rounded-[var(--radius-card)] bg-white border border-border p-6">
            <div className="flex items-start gap-3 mb-5">
                <div
                    className={cn(
                        'w-9 h-9 rounded-lg bg-canvas flex items-center justify-center shrink-0',
                        copy.accent
                    )}
                >
                    <Sparkles className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="font-semibold text-ink">Request a consultation</h3>
                    <p className="text-xs text-muted mt-0.5">
                        Your report summary is attached automatically.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field
                    label="Full name"
                    required
                    value={name}
                    onChange={setName}
                    error={fieldErrors.name}
                    autoComplete="name"
                    placeholder="Priya Sharma"
                />

                <Field
                    label="Phone number"
                    required
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    error={fieldErrors.phone}
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                />

                <Field
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    error={fieldErrors.email}
                    autoComplete="email"
                    placeholder="you@example.com"
                    hint="Optional — we'll send a copy of your report"
                />

                <Field
                    label="Preferred clinic or city"
                    value={clinic}
                    onChange={setClinic}
                    placeholder="e.g. Koramangala, Bangalore"
                    icon={<MapPin className="w-4 h-4" />}
                />

                <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">
                        Anything the dentist should know?
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="e.g. sensitivity on the left side, or available evenings only"
                        className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-sm focus:outline-none focus:border-regal focus:ring-2 focus:ring-regal/10 resize-none"
                    />
                </div>

                {errorMsg && (
                    <div className="rounded-lg bg-coral-soft border border-coral/20 p-3 text-sm text-coral">
                        {errorMsg}
                    </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted">
                    <ShieldCheck className="w-4 h-4 text-emerald shrink-0" />
                    <span>Your report is shared only with the clinic you book.</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={submitting}
                        className="flex-1"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending…
                            </>
                        ) : (
                            'Send request'
                        )}
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        variant="secondary"
                        onClick={() => setView('cta')}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}

// -------- Field helper --------

function Field({
    label,
    value,
    onChange,
    type = 'text',
    required,
    error,
    placeholder,
    autoComplete,
    hint,
    icon,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
    error?: string;
    placeholder?: string;
    autoComplete?: string;
    hint?: string;
    icon?: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
                {label}
                {required && <span className="text-coral ml-0.5">*</span>}
            </label>
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                        {icon}
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={cn(
                        'w-full h-11 rounded-[var(--radius-input)] border bg-white text-sm focus:outline-none focus:ring-2',
                        icon ? 'pl-9 pr-3.5' : 'px-3.5',
                        error
                            ? 'border-coral focus:border-coral focus:ring-coral/10'
                            : 'border-border focus:border-regal focus:ring-regal/10'
                    )}
                />
            </div>
            {error && <p className="text-xs text-coral mt-1.5">{error}</p>}
            {!error && hint && (
                <p className="text-xs text-muted mt-1.5">{hint}</p>
            )}
        </div>
    );
}