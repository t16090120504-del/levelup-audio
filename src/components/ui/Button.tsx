import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn-jrpg-primary',
  secondary: 'btn-jrpg-secondary',
  ghost: 'btn-jrpg-ghost',
  danger: 'btn-jrpg-danger',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

/**
 * JRPG-style button.
 *
 * - `primary`   – gold gradient background with a shine-sweep on hover
 * - `secondary` – dark elevated background with a subtle border
 * - `ghost`     – transparent, reveals background on hover
 * - `danger`    – deep red tones
 *
 * Uses the `.btn-jrpg` component class plus variant classes from index.css.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    className = '',
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={[
        'btn-jrpg group',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        disabled || loading ? 'cursor-not-allowed opacity-60' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {/* Shine sweep overlay for the primary variant */}
      {variant === 'primary' && !loading && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
          <span className="absolute -inset-y-2 -left-full w-1/2 -skew-x-12 bg-white/20 blur-sm transition-transform duration-700 group-hover:translate-x-[300%]" />
        </span>
      )}

      <span className="relative z-10 inline-flex items-center gap-2">
        {loading ? (
          <Spinner size="sm" />
        ) : (
          leftIcon != null && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon != null && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </span>
    </button>
  );
});
