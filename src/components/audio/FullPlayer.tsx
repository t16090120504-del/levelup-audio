import { motion } from 'framer-motion';
import { ChevronLeft, Repeat } from 'lucide-react';
import type { Episode, Series } from '@/types';
import { getCoverStyle } from '@/lib/cover';
import { AudioProgressBar } from './AudioProgressBar';
import { PlayerControls } from './PlayerControls';
import { VolumeControl } from './VolumeControl';
import { PlaybackSpeedControl } from './PlaybackSpeedControl';

export interface FullPlayerProps {
  episode: Episode;
  series: Series;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  autoPlayNext: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onSpeedChange: (speed: number) => void;
  onAutoPlayToggle: () => void;
  onBack: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function FullPlayer({
  episode,
  series,
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate,
  autoPlayNext,
  onTogglePlay,
  onPrev,
  onNext,
  onSkipBack,
  onSkipForward,
  onSeek,
  onVolumeChange,
  onSpeedChange,
  onAutoPlayToggle,
  onBack,
}: FullPlayerProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* Blurred background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 blur-3xl"
        style={getCoverStyle(series.coverUrl)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg-deepest/60 via-bg-deepest/80 to-bg-deepest" />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-4"
      >
        {/* Top bar */}
        <motion.div variants={itemVariants} className="flex items-center">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
        </motion.div>

        {/* Cover */}
        <motion.div variants={itemVariants} className="mt-6 flex flex-1 items-center justify-center">
          <div
            className="aspect-square w-full max-w-[280px] rounded-xl shadow-card"
            style={{
              ...getCoverStyle(series.coverUrl),
              boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,181,68,0.1)',
            }}
          />
        </motion.div>

        {/* Info */}
        <motion.div variants={itemVariants} className="mt-8 text-center">
          <h1 className="font-display text-xl text-text-primary">{episode.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{series.title}</p>
          <p className="mt-0.5 text-xs text-text-muted">{series.author}</p>
        </motion.div>

        {/* Progress */}
        <motion.div variants={itemVariants} className="mt-6">
          <AudioProgressBar
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
          />
        </motion.div>

        {/* Controls */}
        <motion.div variants={itemVariants} className="mt-5">
          <PlayerControls
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
            onSkipBack={onSkipBack}
            onSkipForward={onSkipForward}
            disabled={!episode.audioUrl}
          />
        </motion.div>

        {/* Bottom row: Volume + Speed + Auto-play */}
        <motion.div variants={itemVariants} className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <VolumeControl volume={volume} onChange={onVolumeChange} />
            <PlaybackSpeedControl speed={playbackRate} onChange={onSpeedChange} />
          </div>

          {/* Auto-play next toggle */}
          <button
            onClick={onAutoPlayToggle}
            className="mx-auto flex items-center gap-2 rounded-full border border-bg-hover bg-bg-elevated px-4 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-gold/20 hover:text-text-primary"
          >
            <Repeat size={13} className={autoPlayNext ? 'text-gold-bright' : 'text-text-muted'} />
            <span className={autoPlayNext ? 'text-gold-bright' : ''}>Auto-play next</span>
            <span
              className={[
                'ml-1 inline-block h-2 w-2 rounded-full',
                autoPlayNext ? 'bg-gold-bright shadow-gold-glow-sm' : 'bg-text-muted',
              ].join(' ')}
            />
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default FullPlayer;
