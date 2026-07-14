import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { Series } from '@/types';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/content/RatingStars';
import { getCoverStyle } from '@/lib/cover';

export interface BannerCarouselProps {
  series: Series[];
  onSeriesClick?: (series: Series) => void;
}

const AUTO_ADVANCE_MS = 5000;

/**
 * Auto-advancing hero banner carousel. Each slide uses a series' gradient
 * cover as its background with a readability overlay, and displays the title,
 * description, rating, and a "Start Listening" CTA. Manual navigation is
 * available via left/right arrows and bottom dot indicators.
 */
export function BannerCarousel({ series, onSeriesClick }: BannerCarouselProps) {
  const [index, setIndex] = useState(0);
  const count = series.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Auto-advance every 5s; resets whenever the index changes (manual nav).
  useEffect(() => {
    if (count <= 1) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, count]);

  if (count === 0) return null;

  const current = series[index];

  return (
    <div className="relative h-60 w-full overflow-hidden rounded-2xl border border-bg-hover shadow-card">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current.id}
          className="absolute inset-0"
          style={getCoverStyle(current.coverUrl)}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Readability overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-deepest via-bg-deepest/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-deepest/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end p-5">
        <motion.div
          key={`content-${current.id}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="mb-2">
            <RatingStars rating={current.avgRating} size="md" showNumber />
          </div>
          <h2 className="clamp-2 font-display text-2xl font-bold text-text-primary drop-shadow-lg">
            {current.title}
          </h2>
          <p className="clamp-2 mt-1 max-w-md text-sm text-text-secondary">{current.description}</p>
          <div className="mt-3">
            <Button
              size="sm"
              leftIcon={<Play size={14} fill="currentColor" strokeWidth={0} />}
              onClick={() => onSeriesClick?.(current)}
            >
              Start Listening
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-bg-hover bg-bg-deepest/60 p-1.5 text-text-secondary backdrop-blur-sm transition-colors hover:text-gold-bright"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-bg-hover bg-bg-deepest/60 p-1.5 text-text-secondary backdrop-blur-sm transition-colors hover:text-gold-bright"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {series.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-gold-bright' : 'w-1.5 bg-text-muted/60 hover:bg-text-muted'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BannerCarousel;
