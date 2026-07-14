import { motion } from 'framer-motion';
import { Play, Lock, X } from 'lucide-react';
import type { Episode } from '@/types';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/coin/CoinIcon';

export interface EpisodeEndOverlayProps {
  nextEpisode: Episode | null;
  isUnlocked: boolean;
  onUnlock: (episode: Episode) => void;
  onSkip: () => void;
  onPlayNext: (episode: Episode) => void;
}

export function EpisodeEndOverlay({
  nextEpisode,
  isUnlocked,
  onUnlock,
  onSkip,
  onPlayNext,
}: EpisodeEndOverlayProps) {
  if (!nextEpisode) return null;

  const canPlay = isUnlocked || nextEpisode.isFree;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-gold/20 bg-bg-elevated/95 p-5 backdrop-blur-md shadow-card"
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-bg-hover" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-bright">Next Episode</p>
          <h3 className="mt-1 truncate font-display text-base text-text-primary">
            Ep {nextEpisode.episodeNumber}: {nextEpisode.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{nextEpisode.description}</p>
        </div>
        <button
          onClick={onSkip}
          className="shrink-0 rounded-full p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {canPlay ? (
          <Button
            fullWidth
            leftIcon={<Play size={16} fill="currentColor" />}
            onClick={() => onPlayNext(nextEpisode)}
          >
            Play Next
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              fullWidth
              onClick={onSkip}
            >
              Not Now
            </Button>
            <Button
              fullWidth
              leftIcon={<Lock size={14} />}
              rightIcon={<CoinIcon size={14} />}
              onClick={() => onUnlock(nextEpisode)}
            >
              Unlock {nextEpisode.unlockCostCoins}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default EpisodeEndOverlay;
