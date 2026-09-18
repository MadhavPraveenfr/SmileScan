'use client';

import type { ReportFinding } from '@/lib/scan-store';
import { cn } from '@/lib/cn';
import {
    Palette,
    Rows3,
    ArrowLeftRight,
    Waves,
    TriangleAlert,
    Droplet,
    Sparkles,
    Layers,
    CircleDot,
    CircleOff,
    MapPin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TYPE_META: Record<
    string,
    { label: string; Icon: LucideIcon; description: string }
> = {
    discoloration: {
        label: 'Discoloration',
        Icon: Palette,
        description: 'Staining or colour change on tooth surfaces',
    },
    crowding: {
        label: 'Crowding',
        Icon: Rows3,
        description: 'Teeth overlapping or rotated',
    },
    spacing: {
        label: 'Spacing',
        Icon: ArrowLeftRight,
        description: 'Visible gaps between teeth',
    },
    wear: {
        label: 'Wear',
        Icon: Waves,
        description: 'Flattened or eroded tooth surfaces',
    },
    chip: {
        label: 'Chipped edge',
        Icon: TriangleAlert,
        description: 'Fractured or chipped tooth edge',
    },
    gum_inflammation: {
        label: 'Gum inflammation',
        Icon: Droplet,
        description: 'Redness or swelling of the gums',
    },
    plaque: {
        label: 'Plaque',
        Icon: Sparkles,
        description: 'Soft deposits near the gumline',
    },
    tartar: {
        label: 'Tartar',
        Icon: Layers,
        description: 'Hardened deposits on the teeth',
    },
    dark_spot: {
        label: 'Dark spot',
        Icon: CircleDot,
        description: 'Dark area on a tooth that warrants evaluation',
    },
    missing_tooth: {
        label: 'Missing tooth',
        Icon: CircleOff,
        description: 'Visibly absent tooth',
    },
};

const SEVERITY_STYLE: Record<
    string,
    { label: string; pill: string; border: string; text: string }
> = {
    mild: {
        label: 'Mild',
        pill: 'bg-regal-soft text-regal',
        border: 'border-l-regal',
        text: 'text-regal',
    },
    moderate: {
        label: 'Moderate',
        pill: 'bg-amber-soft text-amber',
        border: 'border-l-amber',
        text: 'text-amber',
    },
    severe: {
        label: 'Severe',
        pill: 'bg-coral-soft text-coral',
        border: 'border-l-coral',
        text: 'text-coral',
    },
};

interface FindingCardProps {
    finding: ReportFinding;
    onHover?: (id: string | null) => void;
}

export function FindingCard({ finding, onHover }: FindingCardProps) {
    const meta = TYPE_META[finding.type] ?? {
        label: finding.type.replace(/_/g, ' '),
        Icon: CircleDot,
        description: '',
    };
    const sev = SEVERITY_STYLE[finding.severity] ?? SEVERITY_STYLE.mild;
    const { Icon } = meta;

    const confidenceLabel = 'High confidence';

    const findingKey = `${finding.type}-${finding.location}-${finding.confidence}`;

    return (
        <div
            onMouseEnter={() => onHover?.(findingKey)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
                'rounded-[var(--radius-card)] bg-white border border-border border-l-4 p-5 transition-all',
                sev.border
            )}
        >
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        sev.pill
                    )}
                >
                    <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-ink">{meta.label}</h3>
                        <span
                            className={cn(
                                'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full',
                                sev.pill
                            )}
                        >
                            {sev.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted mt-1.5">
                        <MapPin className="w-3 h-3" />
                        {finding.location}
                    </div>

                    <p className="text-sm text-ink/90 mt-3 leading-relaxed">
                        {finding.evidence}
                    </p>

                    {/* Confidence bar */}
                    {/* Confidence label */}
                    <p className="text-xs text-muted mt-3">
                        {confidenceLabel}
                    </p>
                </div>
            </div>
        </div>
    );
}