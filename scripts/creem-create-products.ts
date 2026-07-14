import { Creem } from 'creem';

const creem = new Creem({
  apiKey: 'creem_test_4nPZ2hNUXjl73WgrHy1wY1',
  server: 'test',
});

const COIN_PACKS = [
  { name: '100 Coins', coins: 100, priceCents: 99, description: 'Start your journey with 100 coins. Enough to unlock 10 premium episodes.' },
  { name: '500 Coins', coins: 500, priceCents: 399, description: 'Best value for casual listeners. 500 coins to unlock 50 premium episodes.' },
  { name: '1000 Coins', coins: 1000, priceCents: 699, description: 'For dedicated listeners. 1000 coins, unlock 100 premium episodes.' },
  { name: '5000 Coins', coins: 5000, priceCents: 2999, description: 'Ultimate value. 5000 coins for the most committed fans. Never run out.' },
];

async function createProducts() {
  console.log('=== Creating Coin Pack Products on Creem ===\n');

  for (const pack of COIN_PACKS) {
    try {
      const product = await creem.products.create({
        name: pack.name,
        description: pack.description,
        price: pack.priceCents,
        currency: 'USD',
        billingType: 'onetime',
      });

      console.log(`Created: ${pack.name} (${pack.coins} coins, $${pack.priceCents / 100})`);
      console.log(`  Product ID: ${product.id}`);
      console.log('');
    } catch (err: unknown) {
      console.error(`Error creating ${pack.name}:`, (err as Error).message);
    }
  }

  // List all products
  console.log('--- All Products ---');
  const page = await creem.products.search(1, 20);
  for (const p of page.result.items) {
    console.log(`  ${p.name} (${p.id}) - $${(p.price / 100).toFixed(2)}`);
  }
}

createProducts();
