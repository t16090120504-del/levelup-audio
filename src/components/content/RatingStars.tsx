import { Star } from 'lucide-react';

export interface RatingStarsProps {
  rating: number;
  size?: 'sm' | 'md';
  showNumber?: boolean;
}

const SIZE_PX = {
  sm: 14,
  md: 18,
} as const;

/**
 * Displays a 0–5 star rating with half-star precision using an overlay-clip
 * technique: a muted "empty" star sits behind a gold "filled" star whose
 * width is clipped to the fractional fill percentage.
 */
export function RatingStars({ rating, size = 'sm', showNumber = false }: RatingStarsProps) {
  const px = SIZE_PX[size];
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <div className="inline-flex items-center gap-1">
      <div className="inline-flex" aria-label={`Rating ${rating.toFixed(1)} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => {
          const fillPercent = Math.max(0, Math.min(100, (clamped - i) * 100));
          return (
            <span
              key={i}
              className="relative inline-block"
              style={{ width: px, height: px }}
            >
              <Star
                size={px}
                className="absolute inset-0 text-bg-hover"
                fill="currentColor"
                strokeWidth={0}
              />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
              >
                <Star
                  size={px}
                  className="text-gold-bright"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            </span>
          );
        })}
      </div>
      {showNumber && (
        <span className="font-mono text-xs font-semibold text-gold-bright">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export default RatingStars;
