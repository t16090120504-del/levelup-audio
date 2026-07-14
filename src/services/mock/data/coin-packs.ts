import type { CoinPack } from '@/types';

/**
 * Static mock coin-pack data.
 *
 * Values are kept in sync with `@/constants/coin-packs` (COIN_PACKS) but
 * live here as an independent copy so the mock layer remains self-contained.
 * `pricePerCoin` is pre-computed to two decimal places, matching the
 * `calcPricePerCoin` helper used in the constants module.
 */
export const coinPacks: CoinPack[] = [
  {
    id: 'pack-starter',
    name: 'Starter',
    price: 1.0,
    coins: 100,
    pricePerCoin: 0.01,
    creemProductId: 'prod_6ib4gnrDBkJicWRVk4TdfE',
  },
  {
    id: 'pack-popular',
    name: 'Basic',
    price: 3.99,
    coins: 500,
    pricePerCoin: 0.01,
    label: 'Most Popular',
    popular: true,
    creemProductId: 'prod_23ardIsbMsk2Ln9AnntEEC',
  },
  {
    id: 'pack-value',
    name: 'Premium',
    price: 6.99,
    coins: 1000,
    pricePerCoin: 0.01,
    label: 'Best Value',
    bestValue: true,
    creemProductId: 'prod_2EgdfP9vBEn0DsyI6TdROU',
  },
  {
    id: 'pack-premium',
    name: 'Ultimate',
    price: 29.99,
    coins: 5000,
    pricePerCoin: 0.01,
    creemProductId: 'prod_5rva7Rw644gzI2AoV0Moq9',
  },
];
