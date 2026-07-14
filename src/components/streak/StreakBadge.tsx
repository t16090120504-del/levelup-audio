import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useStreakStore } from '@/stores/streak-store';

export interface StreakBadgeProps {
  /** Optional click handler (e.g. scroll to daily bonus). */
  onClick?: () => void;
}

/**
 * Compact streak indicator shown in the home page header.
 *
 * Displays the current consecutive-day login streak with a flame icon.
 * The badge glows more intensely at milestone streaks (7 and 30 days).
 */
export function StreakBadge({ onClick }: StreakBadgeProps) {
  const loginStreak = useStreakStore((s) => s.loginStreak);

  // Hide entirely if there is no streak yet (keeps the header clean).
  if (loginStreak <= 0) return null;

  const isMilestone = loginStreak === 7 || loginStreak === 30 || loginStreak >= 30;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      initial={false}
      animate={isMilestone ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={
        isMilestone
          ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.15 }
      }
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
        isMilestone
          ? 'border-gold/50 bg-gold/10 text-gold-bright shadow-gold-glow-sm'
          : 'border-bg-hover bg-bg-elevated text-text-secondary'
      }`}
      aria-label={`${loginStreak}-day login streak`}
      title={`${loginStreak}-day login streak${loginStreak >= 7 ? ' — streak bonus unlocked!' : ''}`}
    >
      <Flame
        size={14}
        className={isMilestone ? 'text-gold-bright' : 'text-status-warning'}
        fill={isMilestone ? 'currentColor' : 'none'}
      />
      <span className="font-mono">{loginStreak}</span>
      <span className="hidden sm:inline">day streak</span>
    </motion.button>
  );
}

export default StreakBadge;
