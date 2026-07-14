import { useCoinStore } from '@/stores/coin-store';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { formatCoinAmount } from '@/lib/format';

export interface CoinBalanceBadgeProps {
  onClick?: () => void;
}

/**
 * Compact global coin-balance indicator. Reads the balance from the coin
 * store and renders a CoinIcon alongside the formatted amount. Clicking it
 * is intended to open the coin store.
 */
export function CoinBalanceBadge({ onClick }: CoinBalanceBadgeProps) {
  const balance = useCoinStore((s) => s.balance);

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-bg-elevated px-2.5 py-1.5 shadow-gold-glow-sm transition-all hover:border-gold/50 hover:shadow-gold-glow"
    >
      <CoinIcon size={20} />
      <span className="font-mono text-sm font-bold text-gold-bright">
        {formatCoinAmount(balance)}
      </span>
    </button>
  );
}

export default CoinBalanceBadge;
