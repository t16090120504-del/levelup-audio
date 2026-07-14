import { motion } from 'framer-motion';
import { SkipBack, Rewind, Play, Pause, FastForward, SkipForward } from 'lucide-react';

export interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  disabled?: boolean;
}

export function PlayerControls({
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  onSkipBack,
  onSkipForward,
  disabled = false,
}: PlayerControlsProps) {
  const iconBtnClass =
    'flex items-center justify-center rounded-full text-text-secondary transition-colors hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Skip Back 15s */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onSkipBack}
        disabled={disabled}
        className={`${iconBtnClass} h-10 w-10`}
        aria-label="Skip back 15 seconds"
      >
        <SkipBack size={20} />
      </motion.button>

      {/* Previous */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onPrev}
        disabled={disabled}
        className={`${iconBtnClass} h-10 w-10`}
        aria-label="Previous episode"
      >
        <Rewind size={22} />
      </motion.button>

      {/* Play / Pause */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onTogglePlay}
        disabled={disabled}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-gold text-bg-deepest shadow-gold-glow-sm transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
      </motion.button>

      {/* Next */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onNext}
        disabled={disabled}
        className={`${iconBtnClass} h-10 w-10`}
        aria-label="Next episode"
      >
        <FastForward size={22} />
      </motion.button>

      {/* Skip Forward 30s */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onSkipForward}
        disabled={disabled}
        className={`${iconBtnClass} h-10 w-10`}
        aria-label="Skip forward 30 seconds"
      >
        <SkipForward size={20} />
      </motion.button>
    </div>
  );
}

export default PlayerControls;
