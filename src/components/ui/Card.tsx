import { forwardRef, type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

/**
 * Menu-window style card container.
 * Uses the `.card-jrpg` component class defined in index.css.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { hover = false, glow = false, className = '', children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={[
        'card-jrpg',
        hover ? 'card-jrpg-hover' : '',
        glow ? 'shadow-gold-glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
});
