import { cn } from '@/lib/cn';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const base =
            'inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:pointer-events-none rounded-[var(--radius-button)]';
        const variants: Record<Variant, string> = {
            primary:
                'bg-lime text-ink font-semibold hover:bg-lime-hover active:scale-[0.98]',
            secondary: 'bg-white text-ink border border-border hover:bg-canvas',
            ghost: 'bg-transparent text-ink hover:bg-canvas',
            danger: 'bg-coral text-white hover:bg-coral/90',
        };
        const sizes: Record<Size, string> = {
            sm: 'h-9 px-3 text-sm',
            md: 'h-11 px-5 text-sm',
            lg: 'h-13 px-6 text-base',
        };
        return (
            <button
                ref={ref}
                className={cn(base, variants[variant], sizes[size], className)}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';