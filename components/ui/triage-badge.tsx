import { cn } from '@/lib/cn';

type Triage = 'routine' | 'soon' | 'urgent';

const CONFIG: Record<Triage, { label: string; className: string }> = {
    routine: { label: 'Looking good', className: 'bg-emerald-soft text-emerald' },
    soon: { label: 'Worth a check-up', className: 'bg-amber-soft text-amber' },
    urgent: { label: 'Needs attention', className: 'bg-coral-soft text-coral' },
};

export function TriageBadge({
    level,
    className,
}: {
    level: Triage;
    className?: string;
}) {
    const c = CONFIG[level];
    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                c.className,
                className
            )}
        >
            <span className="w-2 h-2 rounded-full bg-current" />
            {c.label}
        </span>
    );
}