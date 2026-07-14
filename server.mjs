import express from 'express';
import cors from 'cors';
import { Creem } from 'creem';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const CREEM_API_KEY = process.env.CREEM_API_KEY || 'creem_test_4nPZ2hNUXjl73WgrHy1wY1';

const creem = new Creem({
  apiKey: CREEM_API_KEY,
  server: 'test',
});

/**
 * POST /api/checkout
 *
 * Creates a Creem checkout session for the given product.
 * Body: { productId: string, successUrl: string }
 * Returns: { checkoutUrl: string }
 */
app.post('/api/checkout', async (req, res) => {
  try {
    const { productId, successUrl } = req.body;

    if (!productId || !successUrl) {
      return res.status(400).json({ error: 'productId and successUrl are required' });
    }

    const checkout = await creem.checkouts.create({
      productId,
      successUrl,
    });

    if (!checkout.checkoutUrl) {
      return res.status(500).json({ error: 'No checkout URL returned from Creem' });
    }

    res.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (err) {
    console.error('Checkout creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

app.listen(PORT, () => {
  console.log(`Creem checkout server running on http://localhost:${PORT}`);
});
