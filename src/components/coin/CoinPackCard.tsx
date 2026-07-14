import { motion } from 'framer-motion';
import type { CoinPack } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { formatCoinAmount, formatPrice } from '@/lib/format';

export interface CoinPackCardProps {
  pack: CoinPack;
  onPurchase?: (pack: CoinPack) => void;
}

/**
 * Purchasable coin-pack card. Highlights "Most Popular" / "Best Value" packs
 * with a gold border and glow. Shows the coin amount, price, per-coin price,
 * an optional label badge, and a purchase button.
 */
export function CoinPackCard({ pack, onPurchase }: CoinPackCardProps) {
  const isHighlighted = Boolean(pack.popular || pack.bestValue);
  const labelText = pack.label ?? (pack.popular ? 'Most Popular' : pack.bestValue ? 'Best Value' : null);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="h-full">
      <Card
        glow={isHighlighted}
        className={`relative flex h-full flex-col items-center p-5 text-center ${
          isHighlighted ? 'border-gold/40' : ''
        }`}
      >
        {labelText != null && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
            <Badge variant={pack.bestValue ? 'best-value' : 'popular'}>{labelText}</Badge>
          </div>
        )}

        {/* Coin amount */}
        <div className="mt-2 flex flex-col items-center">
          <CoinIcon size={44} />
          <span className="mt-2 font-display text-2xl font-bold text-gold-bright">
            {formatCoinAmount(pack.coins)}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-text-muted">Coins</span>
        </div>

        {/* Price */}
        <div className="mt-4 w-full border-t border-bg-hover pt-3">
          <div className="font-display text-lg font-semibold text-text-primary">
            {formatPrice(pack.price)}
          </div>
          <div className="mt-0.5 text-[11px] text-text-secondary">
            {formatPrice(pack.pricePerCoin)} / coin
          </div>
        </div>

        {/* Purchase */}
        <div className="mt-4 w-full">
          <Button
            variant={isHighlighted ? 'primary' : 'secondary'}
            fullWidth
            onClick={() => onPurchase?.(pack)}
          >
            Purchase
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export default CoinPackCard;
