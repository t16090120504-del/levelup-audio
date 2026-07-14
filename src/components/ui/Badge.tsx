import type { ReactNode } from 'react';

export interface BadgeProps {
  variant?: 'free' | 'unlocked' | 'locked' | 'new' | 'popular' | 'best-value' | 'warning' | 'default';
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  free: 'bg-status-free/20 text-status-free border-status-free/30',
  unlocked: 'bg-status-unlocked/20 text-status-unlocked border-status-unlocked/30',
  locked: 'bg-status-locked/20 text-status-locked border-status-locked/30',
  new: 'bg-gold-bright/20 text-gold-bright border-gold-bright/30',
  popular: 'bg-gradient-gold text-bg-deepest border-gold-bright/50',
  'best-value': 'bg-gradient-gold text-bg-deepest border-gold-bright/50',
  warning: 'bg-status-warning/20 text-status-warning border-status-warning/30',
  default: 'bg-bg-elevated text-text-secondary border-bg-hover',
};

/**
 * JRPG-style status badge.
 * Uses the `.badge-base` component class plus variant-specific colors.
 */
export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={['badge-base border', variantClasses[variant], className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
