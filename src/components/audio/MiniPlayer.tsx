import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/stores/player-store';
import { getCoverStyle } from '@/lib/cover';
import { ROUTES } from '@/constants/routes';

export function MiniPlayer() {
  const navigate = useNavigate();
  const currentEpisode = usePlayerStore((s) => s.currentEpisode);
  const currentSeries = usePlayerStore((s) => s.currentSeries);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const playNext = usePlayerStore((s) => s.playNext);

  const hasContent = currentEpisode && currentSeries;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleNavigate = () => {
    if (currentEpisode) {
      navigate(ROUTES.PLAYER_BY_ID(currentEpisode.id));
    }
  };

  return (
    <AnimatePresence>
      {hasContent && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="fixed inset-x-0 z-40 overflow-hidden"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
        >
          {/* Main mini player bar */}
          <div
            onClick={handleNavigate}
            className="relative mx-2 mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-bg-hover bg-bg-elevated/95 px-3 py-2.5 backdrop-blur-md shadow-card"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigate();
              }
            }}
          >
            {/* Cover */}
            <div
              className="h-10 w-10 shrink-0 rounded-lg shadow-sm"
              style={getCoverStyle(currentSeries.coverUrl)}
            />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="clamp-1 text-sm font-semibold text-text-primary">{currentEpisode.title}</p>
              <p className="clamp-1 text-xs text-text-secondary">
                {currentSeries.title}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold text-bg-deepest shadow-gold-glow-sm"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  playNext();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-gold-bright"
                aria-label="Next episode"
              >
                <SkipForward size={16} />
              </motion.button>
            </div>
          </div>

          {/* Thin progress bar */}
          <div className="absolute inset-x-2 bottom-2 h-[3px] overflow-hidden rounded-full bg-transparent">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-bright"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MiniPlayer;
