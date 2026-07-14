import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Gift } from 'lucide-react';
import { useCoinStore } from '@/stores/coin-store';
import { CONFIG } from '@/constants/config';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { formatCoinAmount } from '@/lib/format';

export interface DailyBonusProps {
  onClaim?: () => void;
}

/** Milliseconds until the next UTC midnight (matches the store's day boundary). */
function getMsToNextUtcMidnight(): number {
  const now = new Date();
  const nowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
  );
  const tomorrowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return tomorrowUtc - nowUtc;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const BURST_DELAYS = [0, 0.08, 0.16, 0.24, 0.32, 0.4];

/**
 * Daily coin-bonus widget. When a bonus is available, shows a prominent gold
 * card with a "Claim Now" button and a coin burst animation on claim. When
 * already claimed today, shows a live countdown (HH:MM:SS) to the next reset.
 */
export function DailyBonus({ onClaim }: DailyBonusProps) {
  const canClaim = useCoinStore((s) => s.canClaimDailyBonus());
  const claimDailyBonus = useCoinStore((s) => s.claimDailyBonus);
  const [timeLeft, setTimeLeft] = useState(getMsToNextUtcMidnight());
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (canClaim) return;
    setTimeLeft(getMsToNextUtcMidnight());
    const id = setInterval(() => setTimeLeft(getMsToNextUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, [canClaim]);

  const handleClaim = () => {
    const awarded = claimDailyBonus();
    if (awarded > 0) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 1600);
      onClaim?.();
    }
  };

  const bonusAmount = CONFIG.DAILY_BONUS_COINS;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-br from-purple-deep/40 via-bg-card to-bg-elevated p-4 shadow-gold-glow-sm">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-bg-elevated">
          <Gift size={24} className="text-gold-bright" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-gold-bright">Daily Bonus</h3>
          {canClaim ? (
            <p className="text-xs text-text-secondary">
              Claim <span className="font-mono font-bold text-gold-bright">+{formatCoinAmount(bonusAmount)}</span> free coins
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs text-text-secondary">
              <Clock size={12} />
              <span>Next bonus in</span>
              <span className="font-mono font-bold text-text-primary">{formatCountdown(timeLeft)}</span>
            </p>
          )}
        </div>

        {canClaim && (
          <Button size="sm" onClick={handleClaim} leftIcon={<CoinIcon size={14} />}>
            Claim Now
          </Button>
        )}
      </div>

      {/* Coin burst animation on claim */}
      <AnimatePresence>
        {burst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {BURST_DELAYS.map((delay, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: -60 - i * 6,
                  x: (i - 2.5) * 14,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, delay, ease: 'easeOut' }}
              >
                <CoinIcon size={22} />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DailyBonus;
