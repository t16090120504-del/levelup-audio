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
    creemProductId: 'prod_DSzJiK2FRchuZE3gqYS6T',
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
    creemProductId: 'prod_4TiuO5fAVhT3VBwAeIOWj1',
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

/** Map plan period to its Creem product ID */
export function getCreemProductIdForPeriod(period: 'monthly' | 'yearly'): string | undefined {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.period === period);
  return plan?.creemProductId;
}
