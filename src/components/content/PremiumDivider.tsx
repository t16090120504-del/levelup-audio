import { Crown } from 'lucide-react';

/**
 * A decorative divider announcing premium content. Renders "PREMIUM CONTENT"
 * centered between two gold gradient lines, with a Crown icon and a subtle
 * background tint.
 */
export function PremiumDivider() {
  return (
    <div className="relative my-4 flex items-center justify-center gap-3 rounded-lg border border-gold/10 bg-gradient-to-r from-transparent via-gold/5 to-transparent px-4 py-3">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/40" />
      <div className="inline-flex items-center gap-2">
        <Crown size={16} className="text-gold-bright" />
        <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-bright">
          Premium Content
        </span>
        <Crown size={16} className="text-gold-bright" />
      </div>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/40" />
    </div>
  );
}

export default PremiumDivider;
