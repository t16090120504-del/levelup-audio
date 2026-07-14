export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 rounded',
  rect: 'rounded-lg',
  circle: 'rounded-full',
};

/**
 * Shimmer skeleton placeholder for loading states.
 * Uses the `.shimmer` component class defined in index.css.
 */
export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={['shimmer', variantClasses[variant], className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
