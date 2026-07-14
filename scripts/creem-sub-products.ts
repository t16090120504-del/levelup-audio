import { Creem } from 'creem';

const creem = new Creem({
  apiKey: 'creem_test_4nPZ2hNUXjl73WgrHy1wY1',
  server: 'test',
});

async function main() {
  // 1. List all existing products
  console.log('=== Existing Products ===\n');
  try {
    const page = await creem.products.search(1, 50);
    for (const p of page.result.items) {
      console.log(`  ${p.name} (${p.id}) - $${(p.price / 100).toFixed(2)} - billingType: ${p.billingType}`);
    }
    console.log(`Total: ${page.result.items.length} products\n`);
  } catch (err: unknown) {
    console.error('Error listing products:', (err as Error).message);
  }

  // 2. Create Monthly Subscription - $9.99/mo
  console.log('=== Creating Monthly Subscription ($9.99/mo) ===');
  try {
    const monthly = await creem.products.create({
      name: 'LevelUp Audio Monthly',
      description: 'Unlimited access to all episodes, no ads, early access, offline downloads',
      price: 999,
      currency: 'USD',
      billingType: 'recurring',
      billingPeriod: 'every-month',
    });
    console.log(`  Product ID: ${monthly.id}`);
    console.log(`  Name: ${monthly.name}`);
    console.log(`  Price: $${(monthly.price / 100).toFixed(2)}`);
    console.log(`  Billing: ${monthly.billingType} / ${monthly.billingPeriod}\n`);
  } catch (err: unknown) {
    console.error('Error creating monthly subscription:', (err as Error).message);
  }

  // 3. Create Yearly Subscription - $69.99/yr
  console.log('=== Creating Yearly Subscription ($69.99/yr) ===');
  try {
    const yearly = await creem.products.create({
      name: 'LevelUp Audio Yearly',
      description: 'Unlimited access to all episodes, no ads, early access, offline downloads',
      price: 6999,
      currency: 'USD',
      billingType: 'recurring',
      billingPeriod: 'every-year',
    });
    console.log(`  Product ID: ${yearly.id}`);
    console.log(`  Name: ${yearly.name}`);
    console.log(`  Price: $${(yearly.price / 100).toFixed(2)}`);
    console.log(`  Billing: ${yearly.billingType} / ${yearly.billingPeriod}\n`);
  } catch (err: unknown) {
    console.error('Error creating yearly subscription:', (err as Error).message);
  }

  // 4. List all products again to confirm
  console.log('=== All Products After Creation ===\n');
  try {
    const page = await creem.products.search(1, 50);
    for (const p of page.result.items) {
      console.log(`  ${p.name} (${p.id}) - $${(p.price / 100).toFixed(2)} - billingType: ${p.billingType}`);
    }
    console.log(`Total: ${page.result.items.length} products`);
  } catch (err: unknown) {
    console.error('Error listing products:', (err as Error).message);
  }
}

main();
