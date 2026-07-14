import { motion } from 'framer-motion';
import { Crown, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface SubscriptionBannerProps {
  onSubscribe?: () => void;
}

/**
 * Promotional subscription banner with a gold-to-dark gradient. Headlines
 * "Unlimited Listening" and offers a 7-day free trial CTA.
 */
export function SubscriptionBanner({ onSubscribe }: SubscriptionBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/20 via-purple-deep/30 to-bg-deepest p-5 shadow-gold-glow-sm"
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-purple-deep/30 blur-3xl" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-bg-deepest/50">
          <Crown size={28} className="text-gold-bright" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold text-gold-bright">Unlimited Listening</h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Subscribe and never worry about coins again
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <Button
          variant="primary"
          fullWidth
          leftIcon={<Headphones size={16} />}
          onClick={onSubscribe}
        >
          Start 7-Day Free Trial
        </Button>
      </div>
    </motion.div>
  );
}

export default SubscriptionBanner;
