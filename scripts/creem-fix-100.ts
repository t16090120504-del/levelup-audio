import { Creem } from 'creem';

const creem = new Creem({
  apiKey: 'creem_test_4nPZ2hNUXjl73WgrHy1wY1',
  server: 'test',
});

async function create100Coins() {
  try {
    const product = await creem.products.create({
      name: '100 Coins',
      description: 'Start your journey with 100 coins. Enough to unlock 10 premium episodes.',
      price: 100, // $1.00 (minimum)
      currency: 'USD',
      billingType: 'onetime',
    });
    console.log(`Created: 100 Coins`);
    console.log(`  Product ID: ${product.id}`);
  } catch (err: unknown) {
    console.error('Error:', (err as Error).message);
  }
}

create100Coins();
