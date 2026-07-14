export interface ProgressBarProps {
  /** Current value, clamped to 0–100. */
  value: number;
  variant?: 'default' | 'gold' | 'health' | 'experience';
  showGlow?: boolean;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

const heightClasses: Record<NonNullable<ProgressBarProps['height']>, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const fillClasses: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  default: 'bg-gradient-to-r from-bg-hover to-text-muted',
  gold: 'bg-gradient-to-r from-gold-dark via-gold to-gold-bright',
  health: 'bg-gradient-to-r from-red-600 via-status-warning to-status-free',
  experience: 'bg-gradient-to-r from-blue-600 via-purple-500 to-status-unlocked',
};

/**
 * HP / EXP style progress bar with gradient fills.
 */
export function ProgressBar({
  value,
  variant = 'default',
  showGlow = false,
  height = 'md',
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={[
        'w-full overflow-hidden rounded-full border border-bg-hover bg-bg-deepest',
        heightClasses[height],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={[
          'h-full rounded-full transition-all duration-500 ease-out',
          fillClasses[variant],
          showGlow ? 'shadow-gold-glow-sm' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
