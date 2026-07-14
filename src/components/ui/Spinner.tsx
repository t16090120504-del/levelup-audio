import { useId } from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

/**
 * Magic-style loading spinner with a gold gradient arc.
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const dimension = sizeMap[size];
  const gradientId = useId();

  return (
    <svg
      className={`animate-spin ${className}`}
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD067" />
          <stop offset="50%" stopColor="#F5B544" />
          <stop offset="100%" stopColor="#D4941E" />
        </linearGradient>
      </defs>

      {/* Background track */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-bg-hover"
        opacity="0.4"
      />

      {/* Animated gradient arc (approx. 3/4 circle) */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="47 16"
      />
    </svg>
  );
}
