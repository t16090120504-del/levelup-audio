import { motion } from 'framer-motion';
import type { Series, SeriesStatus } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RatingStars } from '@/components/content/RatingStars';
import { getCoverStyle } from '@/lib/cover';

export interface SeriesCardProps {
  series: Series;
  onClick?: (series: Series) => void;
}

const STATUS_META: Record<SeriesStatus, { label: string; dot: string }> = {
  ongoing: { label: 'Ongoing', dot: 'bg-status-free' },
  completed: { label: 'Completed', dot: 'bg-gold-bright' },
  hiatus: { label: 'On Hiatus', dot: 'bg-text-muted' },
};

/**
 * Full vertical series card with a gradient cover, status indicators,
 * rating, and episode count. The entire card is clickable.
 *
 * The app's content model provides free intro episodes for every series, so a
 * "FREE" badge is shown when the series has episodes available.
 */
export function SeriesCard({ series, onClick }: SeriesCardProps) {
  const status = STATUS_META[series.status];
  const hasFreeEpisodes = series.totalEpisodes > 0;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        hover
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(series)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(series);
          }
        }}
        className="h-full cursor-pointer overflow-hidden"
      >
        {/* Cover */}
        <div className="relative h-40 w-full" style={getCoverStyle(series.coverUrl)}>
          {/* readability gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-deepest/70 via-transparent to-transparent" />

          {hasFreeEpisodes && (
            <div className="absolute left-2 top-2">
              <Badge variant="free">FREE</Badge>
            </div>
          )}

          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-bg-deepest/70 px-2 py-0.5 backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${status.dot} ${series.status === 'ongoing' ? 'animate-pulse' : ''}`}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-primary">
              {status.label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-3">
          <h3 className="clamp-2 font-display text-sm font-semibold leading-snug text-text-primary">
            {series.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{series.author}</p>

          <div className="mt-2 flex items-center justify-between">
            <RatingStars rating={series.avgRating} size="sm" showNumber />
            <span className="font-mono text-[11px] text-text-muted">
              {series.totalEpisodes} Eps
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default SeriesCard;
