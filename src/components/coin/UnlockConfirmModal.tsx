import { motion } from 'framer-motion';
import { Lock, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Episode } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { useCoinStore } from '@/stores/coin-store';
import { ROUTES } from '@/constants/routes';
import { formatCoinAmount } from '@/lib/format';

export interface UnlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  episode: Episode | null;
  onConfirm?: (episode: Episode) => void;
}

/**
 * Confirmation modal for unlocking a single episode with coins. Shows the
 * episode details and cost, the current balance, and either an "Unlock Now"
 * action (when affordable) or an "Insufficient Coins" warning with a
 * "Get More Coins" action that routes to the store.
 */
export function UnlockConfirmModal({
  isOpen,
  onClose,
  episode,
  onConfirm,
}: UnlockConfirmModalProps) {
  const balance = useCoinStore((s) => s.balance);
  const navigate = useNavigate();

  const cost = episode?.unlockCostCoins ?? 0;
  const canAfford = balance >= cost;

  const handleConfirm = () => {
    if (!episode) return;
    onConfirm?.(episode);
    onClose();
  };

  const handleGetMoreCoins = () => {
    onClose();
    navigate(ROUTES.STORE);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unlock Episode" size="sm">
      {episode && (
        <div className="space-y-4">
          {/* Coin decoration + episode info */}
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="mt-0.5"
            >
              <CoinIcon size={32} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <h3 className="clamp-2 font-display text-base font-semibold text-text-primary">
                {episode.title}
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Season {episode.seasonNumber} · Episode {episode.episodeNumber}
              </p>
            </div>
          </div>

          {/* Cost row */}
          <div className="flex items-center justify-between rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
              <Lock size={14} />
              Unlock cost
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-gold-bright">
              {formatCoinAmount(cost)}
              <CoinIcon size={14} />
            </span>
          </div>

          {/* Balance row */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Your balance</span>
            <span
              className={`font-mono font-semibold ${canAfford ? 'text-text-primary' : 'text-status-warning'}`}
            >
              {formatCoinAmount(balance)} coins
            </span>
          </div>

          {/* Warning when insufficient */}
          {!canAfford && (
            <div className="flex items-center gap-2 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
              <TriangleAlert size={14} className="shrink-0" />
              <span>Insufficient Coins — you need {formatCoinAmount(cost - balance)} more.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" fullWidth onClick={onClose}>
              Cancel
            </Button>
            {canAfford ? (
              <Button
                variant="primary"
                fullWidth
                leftIcon={<CoinIcon size={14} />}
                onClick={handleConfirm}
              >
                Unlock Now
              </Button>
            ) : (
              <Button variant="primary" fullWidth onClick={handleGetMoreCoins}>
                Get More Coins
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default UnlockConfirmModal;
