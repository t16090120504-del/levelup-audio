import { motion } from 'framer-motion';
import { Lock, Play } from 'lucide-react';
import type { Episode } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { formatDuration, formatDate } from '@/lib/format';

export interface EpisodeItemProps {
  episode: Episode;
  status: 'free' | 'unlocked' | 'locked';
  progress?: number;
  onPlay?: (episode: Episode) => void;
  onUnlock?: (episode: Episode) => void;
}

/**
 * Single episode list row. Left: a gold-bordered circular episode-number
 * badge. Middle: title, description, duration + release date. Right: a status
 * indicator (FREE / UNLOCKED with play icon / lock + coin cost). A thin
 * progress bar renders beneath when playback progress is greater than zero.
 *
 * Free/unlocked rows trigger `onPlay`; locked rows trigger `onUnlock`.
 */
export function EpisodeItem({
  episode,
  status,
  progress = 0,
  onPlay,
  onUnlock,
}: EpisodeItemProps) {
  const isLocked = status === 'locked';
  const handleClick = () => {
    if (isLocked) {
      onUnlock?.(episode);
    } else {
      onPlay?.(episode);
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
      className="cursor-pointer rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-bg-hover hover:bg-bg-hover/50"
    >
      <div className="flex items-center gap-3">
        {/* Episode number badge */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-bg-elevated font-mono text-sm font-bold text-gold-bright">
          {episode.episodeNumber}
        </div>

        {/* Middle */}
        <div className="min-w-0 flex-1">
          <h4 className="clamp-1 text-sm font-semibold text-text-primary">{episode.title}</h4>
          <p className="clamp-1 mt-0.5 text-xs text-text-secondary">{episode.description}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
            <span>{formatDuration(episode.durationSeconds)}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-text-muted" />
            <span>{formatDate(episode.releasedAt)}</span>
          </div>
        </div>

        {/* Right: status */}
        <div className="shrink-0">
          {status === 'free' && <Badge variant="free">FREE</Badge>}
          {status === 'unlocked' && (
            <Badge variant="unlocked">
              <Play size={11} fill="currentColor" strokeWidth={0} />
              <span>UNLOCKED</span>
            </Badge>
          )}
          {status === 'locked' && (
            <span className="inline-flex items-center gap-1 rounded-md border border-status-locked/30 bg-status-locked/15 px-2 py-1 text-xs font-semibold text-status-locked">
              <Lock size={12} />
              <span className="font-mono">{episode.unlockCostCoins}</span>
              <CoinIcon size={12} />
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      {progress > 0 && (
        <div className="mt-2 pl-12">
          <ProgressBar value={progress} variant="gold" height="sm" />
        </div>
      )}
    </motion.div>
  );
}

export default EpisodeItem;
