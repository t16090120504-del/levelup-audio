import { motion } from 'framer-motion';

export interface PlaybackSpeedControlProps {
  speed: number;
  onChange: (speed: number) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function PlaybackSpeedControl({ speed, onChange }: PlaybackSpeedControlProps) {
  return (
    <div className="flex items-center gap-1.5">
      {SPEEDS.map((s) => {
        const isActive = speed === s;
        return (
          <motion.button
            key={s}
            whileTap={{ scale: 0.92 }}
            onClick={() => onChange(s)}
            className={[
              'relative rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              isActive
                ? 'bg-gradient-gold text-bg-deepest shadow-gold-glow-sm'
                : 'border border-bg-hover bg-bg-elevated text-text-secondary hover:border-gold/30 hover:text-text-primary',
            ].join(' ')}
          >
            {s}x
          </motion.button>
        );
      })}
    </div>
  );
}

export default PlaybackSpeedControl;
