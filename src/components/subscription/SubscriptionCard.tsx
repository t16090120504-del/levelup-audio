import { motion } from 'framer-motion';
import { Check, Crown } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/format';

export interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  onSubscribe?: (plan: SubscriptionPlan) => void;
}

const PERIOD_LABEL: Record<SubscriptionPlan['period'], string> = {
  monthly: '/mo',
  yearly: '/yr',
};

/**
 * Subscription plan card. Shows the plan name, price with billing period, a
 * feature checklist, and a free-trial CTA. Yearly plans display a "Save 42%"
 * badge and a highlighted gold treatment.
 */
export function SubscriptionCard({ plan, onSubscribe }: SubscriptionCardProps) {
  const isYearly = plan.period === 'yearly';

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="h-full">
      <Card
        glow={isYearly}
        className={`flex h-full flex-col p-4 ${isYearly ? 'border-gold/40' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5">
            {isYearly && <Crown size={16} className="text-gold-bright" />}
            <span className="font-display text-sm font-semibold text-text-primary">{plan.name}</span>
          </div>
          {isYearly && <Badge variant="best-value">Save 42%</Badge>}
        </div>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-gold-bright">
            {formatPrice(plan.price)}
          </span>
          <span className="text-xs text-text-muted">{PERIOD_LABEL[plan.period]}</span>
        </div>

        {/* Features */}
        <ul className="mt-3 flex-1 space-y-1.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs text-text-secondary">
              <Check size={14} className="mt-0.5 shrink-0 text-status-free" strokeWidth={3} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-4">
          <Button
            variant={isYearly ? 'primary' : 'secondary'}
            fullWidth
            onClick={() => onSubscribe?.(plan)}
          >
            Start {plan.trialDays}-Day Free Trial
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export default SubscriptionCard;
