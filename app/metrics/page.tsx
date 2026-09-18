'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Loader2,
    BarChart3,
    Users,
    Phone,
    Mail,
    Inbox,
    Sparkles,
    TrendingUp,
    Database,
    Bookmark,
    ExternalLink,
    PhoneCall,
    CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// ============================================================
// Types
// ============================================================

interface Metrics {
    assessments: {
        total: number;
        byTriage: { routine: number; soon: number; urgent: number };
    };
    bookings: {
        total: number;
        byStatus: {
            pending: number;
            contacted: number;
            scheduled: number;
            cancelled: number;
        };
    };
    conversion: {
        bookingRate: number;
        bookingRateByTriage: { routine: number; soon: number; urgent: number };
    };
    cache: {
        uniqueImagesAnalyzed: number;
        totalAnalyses: number;
        cacheHitRate: number;
    };
    recent: { last24hAssessments: number; last24hBookings: number };
    generatedAt: string;
}

interface LeadBooking {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    status: 'pending' | 'contacted' | 'scheduled' | 'cancelled';
    preferredClinic: string | null;
    createdAt: string;
}

interface Lead {
    assessmentId: string;
    createdAt: string;
    triageLevel: 'routine' | 'soon' | 'urgent' | null;
    email: string | null;
    booking: LeadBooking | null;
}

type Tab = 'leads' | 'analytics';

// ============================================================
// Page
// ============================================================

export default function ConsolePage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('leads');
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Poll both endpoints every 5s
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const [mRes, lRes] = await Promise.all([
                    fetch('/api/metrics'),
                    fetch('/api/leads?limit=30'),
                ]);
                const m = await mRes.json();
                const l = await lRes.json();
                if (!mRes.ok) throw new Error(m?.error || 'metrics failed');
                if (!lRes.ok) throw new Error(l?.error || 'leads failed');
                if (!cancelled) {
                    setMetrics(m);
                    setLeads(l.leads ?? []);
                    setError(null);
                    setLoading(false);
                }
            } catch (e) {
                if (!cancelled) {
                    setError((e as Error).message);
                    setLoading(false);
                }
            }
        };
        tick();
        const id = setInterval(tick, 5000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-canvas flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-regal animate-spin" />
            </main>
        );
    }

    if (error || !metrics) {
        return (
            <main className="min-h-screen bg-canvas flex items-center justify-center p-5">
                <div className="max-w-md text-center">
                    <p className="text-coral font-medium mb-2">Console unavailable</p>
                    <p className="text-sm text-muted">{error}</p>
                </div>
            </main>
        );
    }

    // Derived numbers
    const actionableLeads = leads.filter((l) => l.booking);
    const pipelineValue = actionableLeads.length * 4500; // ₹4.5k avg consult

    return (
        <main className="min-h-screen bg-canvas pb-12">
            {/* Top bar */}
            <header className="border-b border-border bg-white sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-regal flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-ink leading-none">
                                Screening Console
                            </p>
                            <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">
                                Carestack · Powered by SmileScan
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[10px] uppercase tracking-wider text-emerald font-semibold inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                            Live
                        </span>
                        <button
                            onClick={() => router.push('/')}
                            className="text-xs text-muted hover:text-ink"
                        >
                            Patient view
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-6xl mx-auto px-5 flex gap-6 border-t border-border">
                    <TabButton active={tab === 'leads'} onClick={() => setTab('leads')}>
                        <Inbox className="w-4 h-4" />
                        Leads
                        {actionableLeads.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-regal text-white text-[10px] font-semibold">
                                {actionableLeads.length}
                            </span>
                        )}
                    </TabButton>
                    <TabButton
                        active={tab === 'analytics'}
                        onClick={() => setTab('analytics')}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                    </TabButton>
                </div>
            </header>

            <section className="max-w-6xl mx-auto px-5 py-6">
                {tab === 'leads' ? (
                    <LeadsView leads={leads} totalAssessments={metrics.assessments.total} />
                ) : (
                    <AnalyticsView metrics={metrics} pipelineValue={pipelineValue} />
                )}
            </section>
        </main>
    );
}

// ============================================================
// LEADS VIEW — the actionable operations screen
// ============================================================

function LeadsView({
    leads,
    totalAssessments,
}: {
    leads: Lead[];
    totalAssessments: number;
}) {
    const withContact = leads.filter((l) => l.booking);

    return (
        <>
            {/* Summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MiniStat label="Total screenings" value={totalAssessments} />
                <MiniStat
                    label="Contact captured"
                    value={withContact.length}
                    accent="emerald"
                />
                <MiniStat
                    label="Urgent + soon"
                    value={
                        leads.filter(
                            (l) => l.triageLevel === 'urgent' || l.triageLevel === 'soon'
                        ).length
                    }
                    accent="amber"
                />
                <MiniStat
                    label="Pending follow-up"
                    value={withContact.filter((l) => l.booking?.status === 'pending').length}
                    accent="coral"
                />
            </div>

            {/* Leads table */}
            <div className="rounded-[var(--radius-card)] bg-white border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-ink">Recent screenings</h2>
                        <p className="text-xs text-muted mt-0.5">
                            Every screening that generated a report. Contact info appears when
                            the patient requests a consultation.
                        </p>
                    </div>
                </div>

                {leads.length === 0 ? (
                    <div className="p-12 text-center">
                        <Inbox className="w-10 h-10 text-muted mx-auto mb-3" />
                        <p className="text-sm text-muted">
                            No screenings yet. Complete a patient flow to see leads here.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider bg-canvas">
                                    <th className="px-5 py-3 font-medium">When</th>
                                    <th className="px-5 py-3 font-medium">Triage</th>
                                    <th className="px-5 py-3 font-medium">Patient contact</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <LeadRow key={lead.assessmentId} lead={lead} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="text-xs text-muted mt-4 text-center">
                Read-only view. In production, status changes flow back into Carestack
                CRM.
            </p>
        </>
    );
}

function LeadRow({ lead }: { lead: Lead }) {
    const triageStyles: Record<string, string> = {
        routine: 'bg-emerald-soft text-emerald',
        soon: 'bg-amber-soft text-amber',
        urgent: 'bg-coral-soft text-coral',
    };
    const triageLabel: Record<string, string> = {
        routine: 'Routine',
        soon: 'Soon',
        urgent: 'Urgent',
    };
    const statusStyles: Record<string, string> = {
        pending: 'bg-amber-soft text-amber',
        contacted: 'bg-regal-soft text-regal',
        scheduled: 'bg-emerald-soft text-emerald',
        cancelled: 'bg-canvas text-muted',
    };
    const statusLabel: Record<string, string> = {
        pending: 'Pending',
        contacted: 'Contacted',
        scheduled: 'Scheduled',
        cancelled: 'Cancelled',
    };

    const triage = lead.triageLevel ?? 'routine';
    const timeAgo = relativeTime(lead.createdAt);

    return (
        <tr className="border-t border-border hover:bg-canvas/50">
            <td className="px-5 py-4 text-muted text-xs whitespace-nowrap">
                {timeAgo}
            </td>

            <td className="px-5 py-4">
                <span
                    className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        triageStyles[triage]
                    )}
                >
                    {triageLabel[triage]}
                </span>
            </td>

            <td className="px-5 py-4">
                {lead.booking ? (
                    <div>
                        <p className="font-medium text-ink">{lead.booking.name}</p>
                        <p className="text-xs text-muted mt-0.5 inline-flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {lead.booking.phone}
                        </p>
                        {lead.booking.preferredClinic && (
                            <p className="text-xs text-muted mt-0.5 truncate max-w-[200px]">
                                {lead.booking.preferredClinic}
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        <p className="text-muted italic text-xs">No contact yet</p>
                        {lead.email && (
                            <p className="text-xs text-muted mt-0.5 inline-flex items-center gap-1.5">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                            </p>
                        )}
                    </div>
                )}
            </td>

            <td className="px-5 py-4">
                {lead.booking ? (
                    <span
                        className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            statusStyles[lead.booking.status]
                        )}
                    >
                        {statusLabel[lead.booking.status]}
                    </span>
                ) : (
                    <span className="text-muted text-xs">—</span>
                )}
            </td>

            <td className="px-5 py-4 text-right">
                <div className="inline-flex items-center gap-1.5">
                    {lead.booking && (
                        <a
                            href={`tel:${lead.booking.phone.replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-regal text-white text-xs font-medium hover:bg-regal/90"
                        >
                            <PhoneCall className="w-3.5 h-3.5" />
                            Call
                        </a>
                    )}
                    <a
                        href={`/report/${lead.assessmentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-ink hover:bg-canvas"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Report
                    </a>
                </div>
            </td>
        </tr>
    );
}

// ============================================================
// ANALYTICS VIEW — aggregate performance
// ============================================================

function AnalyticsView({
    metrics,
    pipelineValue,
}: {
    metrics: Metrics;
    pipelineValue: number;
}) {
    const { assessments, bookings, conversion, cache } = metrics;

    return (
        <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                    icon={<Users className="w-5 h-5" />}
                    label="Screenings"
                    value={assessments.total.toString()}
                    sub={`${metrics.recent.last24hAssessments} in last 24h`}
                />
                <KpiCard
                    icon={<Bookmark className="w-5 h-5" />}
                    label="Bookings"
                    value={bookings.total.toString()}
                    sub={`${metrics.recent.last24hBookings} in last 24h`}
                    accent="emerald"
                />
                <KpiCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Conversion"
                    value={`${(conversion.bookingRate * 100).toFixed(1)}%`}
                    sub="screening → booking"
                    accent="regal"
                />
                <KpiCard
                    icon={<Database className="w-5 h-5" />}
                    label="Est. pipeline value"
                    value={`₹${(pipelineValue / 1000).toFixed(1)}k`}
                    sub={`${bookings.total} consults × ₹4.5k avg`}
                    accent="amber"
                />
            </div>

            {/* Middle row */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Panel title="Triage distribution">
                    <TriageBar
                        label="Routine"
                        count={assessments.byTriage.routine}
                        total={
                            assessments.byTriage.routine +
                            assessments.byTriage.soon +
                            assessments.byTriage.urgent
                        }
                        color="emerald"
                    />
                    <TriageBar
                        label="Soon"
                        count={assessments.byTriage.soon}
                        total={
                            assessments.byTriage.routine +
                            assessments.byTriage.soon +
                            assessments.byTriage.urgent
                        }
                        color="amber"
                    />
                    <TriageBar
                        label="Urgent"
                        count={assessments.byTriage.urgent}
                        total={
                            assessments.byTriage.routine +
                            assessments.byTriage.soon +
                            assessments.byTriage.urgent
                        }
                        color="coral"
                    />
                </Panel>

                <Panel title="Conversion by triage level">
                    <ConversionRow
                        label="Routine"
                        rate={conversion.bookingRateByTriage.routine}
                        accent="emerald"
                    />
                    <ConversionRow
                        label="Soon"
                        rate={conversion.bookingRateByTriage.soon}
                        accent="amber"
                    />
                    <ConversionRow
                        label="Urgent"
                        rate={conversion.bookingRateByTriage.urgent}
                        accent="coral"
                    />
                    <p className="text-xs text-muted mt-4 leading-relaxed">
                        Patients with more urgent findings convert at a higher rate —
                        confirming the triage logic is driving real action, not just labels.
                    </p>
                </Panel>
            </div>

            {/* Bottom row */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Panel title="Booking pipeline">
                    <div className="grid grid-cols-2 gap-3">
                        <StatusCell label="Pending" value={bookings.byStatus.pending} tone="amber" />
                        <StatusCell label="Contacted" value={bookings.byStatus.contacted} tone="regal" />
                        <StatusCell label="Scheduled" value={bookings.byStatus.scheduled} tone="emerald" />
                        <StatusCell label="Cancelled" value={bookings.byStatus.cancelled} tone="muted" />
                    </div>
                </Panel>

                <Panel title="System efficiency">
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted">Cache hit rate</span>
                            <span className="text-xl font-semibold text-emerald tabular-nums">
                                {(cache.cacheHitRate * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted">Unique images analyzed</span>
                            <span className="text-xl font-semibold text-ink tabular-nums">
                                {cache.uniqueImagesAnalyzed}
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted">Total analyses served</span>
                            <span className="text-xl font-semibold text-ink tabular-nums">
                                {cache.totalAnalyses}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-2 leading-relaxed">
                            Cached results mean repeat screenings cost zero AI tokens — the
                            platform scales without growing cost linearly.
                        </p>
                    </div>
                </Panel>
            </div>
        </>
    );
}

// ============================================================
// Shared components
// ============================================================

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                    ? 'text-regal border-regal'
                    : 'text-muted border-transparent hover:text-ink'
            )}
        >
            {children}
        </button>
    );
}

function MiniStat({
    label,
    value,
    accent = 'default',
}: {
    label: string;
    value: number;
    accent?: 'default' | 'emerald' | 'amber' | 'coral';
}) {
    const accents = {
        default: 'text-ink',
        emerald: 'text-emerald',
        amber: 'text-amber',
        coral: 'text-coral',
    };
    return (
        <div className="rounded-[var(--radius-card)] bg-white border border-border px-4 py-3">
            <p className="text-xs text-muted">{label}</p>
            <p className={cn('text-2xl font-semibold tabular-nums mt-1', accents[accent])}>
                {value}
            </p>
        </div>
    );
}

function KpiCard({
    icon,
    label,
    value,
    sub,
    accent = 'regal',
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    accent?: 'regal' | 'emerald' | 'amber' | 'coral';
}) {
    const accentStyles = {
        regal: 'bg-regal-soft text-regal',
        emerald: 'bg-emerald-soft text-emerald',
        amber: 'bg-amber-soft text-amber',
        coral: 'bg-coral-soft text-coral',
    }[accent];

    return (
        <div className="rounded-[var(--radius-card)] bg-white border border-border p-5">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', accentStyles)}>
                {icon}
            </div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide">
                {label}
            </p>
            <p className="text-3xl font-semibold text-ink mt-1.5 tabular-nums">
                {value}
            </p>
            <p className="text-xs text-muted mt-1.5">{sub}</p>
        </div>
    );
}

function Panel({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[var(--radius-card)] bg-white border border-border p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">{title}</h2>
            {children}
        </div>
    );
}

function TriageBar({
    label,
    count,
    total,
    color,
}: {
    label: string;
    count: number;
    total: number;
    color: 'emerald' | 'amber' | 'coral';
}) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const colors = {
        emerald: 'bg-emerald',
        amber: 'bg-amber',
        coral: 'bg-coral',
    };
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink font-medium">{label}</span>
                <span className="text-muted tabular-nums">
                    {count} ({pct.toFixed(0)}%)
                </span>
            </div>
            <div className="h-2 rounded-full bg-canvas overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all', colors[color])}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function ConversionRow({
    label,
    rate,
    accent,
}: {
    label: string;
    rate: number;
    accent: 'emerald' | 'amber' | 'coral';
}) {
    const accents = {
        emerald: 'text-emerald',
        amber: 'text-amber',
        coral: 'text-coral',
    };
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
            <span className="text-sm text-ink">{label}</span>
            <span className={cn('text-lg font-semibold tabular-nums', accents[accent])}>
                {(rate * 100).toFixed(1)}%
            </span>
        </div>
    );
}

function StatusCell({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'amber' | 'regal' | 'emerald' | 'muted';
}) {
    const tones = {
        amber: 'text-amber',
        regal: 'text-regal',
        emerald: 'text-emerald',
        muted: 'text-muted',
    };
    return (
        <div className="rounded-lg bg-canvas p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className={cn('text-2xl font-semibold tabular-nums mt-1', tones[tone])}>
                {value}
            </p>
        </div>
    );
}

// ============================================================
// Helpers
// ============================================================

function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}