import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { Series } from '@/types';
import { getCoverStyle } from '@/lib/cover';

export interface SeriesCardCompactProps {
  series: Series;
  onClick?: (series: Series) => void;
}

/**
 * Compact fixed-width (160px) series card for horizontal scrolling rows.
 * Shows a 120px cover, a single-line title, and a compact rating + episode
 * count row.
 */
export function SeriesCardCompact({ series, onClick }: SeriesCardCompactProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="w-40 shrink-0">
      <button
        type="button"
        onClick={() => onClick?.(series)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(series);
          }
        }}
        className="group block w-full overflow-hidden rounded-xl border border-bg-hover bg-gradient-card text-left shadow-card transition-all hover:border-gold/30 hover:shadow-card-hover"
      >
        <div
          className="relative h-[120px] w-full overflow-hidden"
          style={getCoverStyle(series.coverUrl)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-deepest/60 to-transparent" />
          {series.status === 'completed' && (
            <span className="absolute right-1.5 top-1.5 rounded bg-gold-bright/90 px-1 py-0.5 text-[9px] font-bold uppercase text-bg-deepest">
              Done
            </span>
          )}
        </div>
        <div className="p-2">
          <h3 className="clamp-1 text-xs font-semibold text-text-primary">{series.title}</h3>
          <div className="mt-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-0.5 text-[11px] text-gold-bright">
              <Star size={10} fill="currentColor" strokeWidth={0} />
              <span className="font-mono">{series.avgRating.toFixed(1)}</span>
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              {series.totalEpisodes} Eps
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export default SeriesCardCompact;
