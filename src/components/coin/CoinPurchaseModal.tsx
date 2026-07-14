import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, XCircle } from 'lucide-react';
import type { CoinPack } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { formatCoinAmount, formatPrice } from '@/lib/format';
import { createCreemCheckout, buildSuccessUrl } from '@/services/creem-api';

export interface CoinPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: CoinPack | null;
  onSuccess?: (pack: CoinPack) => void;
  onError?: (pack: CoinPack) => void;
}

type Phase = 'confirm' | 'processing' | 'error';

/**
 * Coin-pack purchase flow with Creem integration:
 *
 * 1. **confirm**   – pack summary with "Proceed to Checkout" / "Cancel".
 * 2. **processing** – spinner while creating the Creem checkout session.
 * 3. **error**     – error message with retry / close options.
 *
 * On confirm, the modal calls the local server to create a Creem checkout
 * session and opens the checkout URL in a new browser tab. Coins are
 * credited on the PaymentSuccessPage when the user returns.
 */
export function CoinPurchaseModal({ isOpen, onClose, pack, onSuccess, onError }: CoinPurchaseModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset to the confirm phase each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setPhase('confirm');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!pack?.creemProductId) {
      onError?.(pack!);
      setErrorMsg('This pack does not have a payment link configured.');
      setPhase('error');
      return;
    }

    setPhase('processing');
    setErrorMsg('');

    try {
      const successUrl = buildSuccessUrl(
        window.location.origin,
        pack.creemProductId,
        pack.coins,
      );

      const { checkoutUrl } = await createCreemCheckout({
        productId: pack.creemProductId,
        successUrl,
      });

      // Open the Creem checkout in a new tab
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');

      // Close the modal - coins will be credited on the success page
      onSuccess?.(pack);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout session';
      setErrorMsg(message);
      onError?.(pack!);
      setPhase('error');
    }
  };

  const handleDone = () => {
    onClose();
  };

  const handleRetry = () => {
    handleConfirm();
  };

  const closeOnOverlay = phase === 'confirm' || phase === 'error';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnOverlay={closeOnOverlay}>
      {pack && (
        <AnimatePresence mode="wait">
          {/* Confirm */}
          {phase === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h2 className="font-display text-lg text-gold-bright">Confirm Purchase</h2>
                <p className="mt-1 text-xs text-text-secondary">Review your coin pack below.</p>
              </div>

              <div className="flex flex-col items-center rounded-lg border border-bg-hover bg-bg-elevated p-4">
                <CoinIcon size={48} />
                <span className="mt-2 font-display text-2xl font-bold text-gold-bright">
                  {formatCoinAmount(pack.coins)}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-text-muted">Coins</span>
                <span className="mt-2 font-display text-lg text-text-primary">
                  {formatPrice(pack.price)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" fullWidth onClick={handleConfirm} rightIcon={<ExternalLink size={16} />}>
                  Proceed to Checkout
                </Button>
              </div>
            </motion.div>
          )}

          {/* Processing */}
          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-8"
            >
              <Spinner size="lg" />
              <p className="font-display text-sm text-gold-bright">Creating checkout...</p>
              <p className="text-xs text-text-muted">Opening payment page</p>
            </motion.div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-3 py-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h2 className="font-display text-lg text-gold-bright">Checkout Failed</h2>
              <p className="max-w-[220px] text-center text-xs text-text-secondary">
                {errorMsg || 'Something went wrong while creating the checkout. Please try again.'}
              </p>
              <div className="flex w-full gap-2">
                <Button variant="secondary" fullWidth onClick={handleDone}>
                  Close
                </Button>
                <Button variant="primary" fullWidth onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Modal>
  );
}

export default CoinPurchaseModal;
