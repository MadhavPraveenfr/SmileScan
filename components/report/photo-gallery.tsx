'use client';

import { useState } from 'react';
import type { ReportFinding, ReportPhoto } from '@/lib/scan-store';
import { SCAN_STEPS } from '@/lib/scan-steps';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

interface PhotoGalleryProps {
    photos: ReportPhoto[];
    findings: ReportFinding[];
    highlightedFindingKey?: string | null;
}

const SEVERITY_BORDER: Record<string, string> = {
  mild: '#1B3D2F',      // forest green (was regal blue)
  moderate: '#D69E2E',  // amber (unchanged)
  severe: '#E53E3E',    // coral (unchanged)
};

export function PhotoGallery({
    photos,
    findings,
    highlightedFindingKey,
}: PhotoGalleryProps) {
    const [expanded, setExpanded] = useState<ReportPhoto | null>(null);

    // Index findings by angle
    const findingsByAngle = new Map<string, ReportFinding[]>();
    for (const f of findings) {
        const list = findingsByAngle.get(f.angle) ?? [];
        list.push(f);
        findingsByAngle.set(f.angle, list);
    }

    // Order photos by the canonical step order
    const ordered = SCAN_STEPS.map((step) => {
        const p = photos.find((x) => x.angle === step.id);
        return p ? { step, photo: p } : null;
    }).filter((x): x is { step: (typeof SCAN_STEPS)[number]; photo: ReportPhoto } => !!x);

    if (ordered.length === 0) return null;

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ordered.map(({ step, photo }) => (
                    <button
                        key={step.id}
                        onClick={() => setExpanded(photo)}
                        className="relative rounded-[var(--radius-card)] overflow-hidden border border-border aspect-[4/5] bg-canvas group"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.url}
                            alt={step.label}
                            className="w-full h-full object-cover"
                        />
                        {/* Bounding boxes */}
                        <BoundingBoxes
                            findings={findingsByAngle.get(step.id) ?? []}
                            highlightedFindingKey={highlightedFindingKey}
                        />
                        {/* Label */}
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
                            {step.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Expanded lightbox */}
            {expanded && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setExpanded(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(null);
                        }}
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div
                        className="relative max-w-2xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={expanded.url}
                            alt={expanded.angle}
                            className="w-full rounded-lg"
                        />
                        <BoundingBoxes
                            findings={findingsByAngle.get(expanded.angle) ?? []}
                            highlightedFindingKey={highlightedFindingKey}
                        />
                    </div>
                </div>
            )}
        </>
    );
}

// -------- Bounding boxes overlay --------

function BoundingBoxes({
    findings,
    highlightedFindingKey,
}: {
    findings: ReportFinding[];
    highlightedFindingKey?: string | null;
}) {
    return (
        <>
            {findings.map((f, i) => {
                const [ymin, xmin, ymax, xmax] = f.bounding_box;
                const key = `${f.type}-${f.location}-${f.confidence}`;
                const isHighlighted = key === highlightedFindingKey;

                return (
                    <div
                        key={i}
                        className={cn(
                            'absolute rounded-md border-2 transition-all pointer-events-none',
                            isHighlighted && 'border-4 shadow-lg'
                        )}
                        style={{
                            top: `${ymin / 10}%`,
                            left: `${xmin / 10}%`,
                            width: `${(xmax - xmin) / 10}%`,
                            height: `${(ymax - ymin) / 10}%`,
                            borderColor: SEVERITY_BORDER[f.severity] ?? SEVERITY_BORDER.mild,
                            backgroundColor: isHighlighted
                                ? 'rgba(255,255,255,0.15)'
                                : 'transparent',
                            boxShadow: isHighlighted
                                ? `0 0 20px ${SEVERITY_BORDER[f.severity]}`
                                : 'none',
                        }}
                    />
                );
            })}
        </>
    );
}