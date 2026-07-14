import type { SubscriptionPlan } from '@/types/coin';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-monthly',
    name: 'Monthly',
    price: 9.99,
    period: 'monthly',
    features: [
      'Unlimited access to all episodes',
      'No ads',
      'Early access to new episodes',
      'Offline downloads',
    ],
    trialDays: 7,
  },
  {
    id: 'plan-yearly',
    name: 'Yearly',
    price: 69.99,
    period: 'yearly',
    features: [
      'Unlimited access to all episodes',
      'No ads',
      'Early access to new episodes',
      'Offline downloads',
    ],
    trialDays: 7,
  },
];

export const MONTHLY_PLAN: SubscriptionPlan | undefined = SUBSCRIPTION_PLANS.find(
  (plan) => plan.period === 'monthly',
);

export const YEARLY_PLAN: SubscriptionPlan | undefined = SUBSCRIPTION_PLANS.find(
  (plan) => plan.period === 'yearly',
);

export function getSubscriptionPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id);
}
