import type { CoinPack } from '@/types/coin';

/**
 * Calculates the price per coin rounded to 2 decimal places.
 */
function calcPricePerCoin(price: number, coins: number): number {
  return Math.round((price / coins) * 100) / 100;
}

export const COIN_PACKS: CoinPack[] = [
  {
    id: 'pack-starter',
    name: 'Starter',
    price: 1.0,
    coins: 100,
    pricePerCoin: calcPricePerCoin(1.0, 100),
    creemProductId: 'prod_6ib4gnrDBkJicWRVk4TdfE',
  },
  {
    id: 'pack-popular',
    name: 'Basic',
    price: 3.99,
    coins: 500,
    pricePerCoin: calcPricePerCoin(3.99, 500),
    label: 'Most Popular',
    popular: true,
    creemProductId: 'prod_23ardIsbMsk2Ln9AnntEEC',
  },
  {
    id: 'pack-value',
    name: 'Premium',
    price: 6.99,
    coins: 1000,
    pricePerCoin: calcPricePerCoin(6.99, 1000),
    label: 'Best Value',
    bestValue: true,
    creemProductId: 'prod_2EgdfP9vBEn0DsyI6TdROU',
  },
  {
    id: 'pack-premium',
    name: 'Ultimate',
    price: 29.99,
    coins: 5000,
    pricePerCoin: calcPricePerCoin(29.99, 5000),
    creemProductId: 'prod_5rva7Rw644gzI2AoV0Moq9',
  },
];

export const POPULAR_COIN_PACK: CoinPack | undefined = COIN_PACKS.find(
  (pack) => pack.popular,
);

export const BEST_VALUE_COIN_PACK: CoinPack | undefined = COIN_PACKS.find(
  (pack) => pack.bestValue,
);

export function getCoinPackById(id: string): CoinPack | undefined {
  return COIN_PACKS.find((pack) => pack.id === id);
}
