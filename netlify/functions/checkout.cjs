/**
 * Netlify Serverless Function — Creem Checkout
 *
 * Replaces the Express server (server.mjs) for production deployment.
 * Creates a Creem checkout session via the REST API using fetch (Node 18+).
 */

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { productId, successUrl } = JSON.parse(event.body);

    if (!productId || !successUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'productId and successUrl are required' }),
      };
    }

    const apiKey = process.env.CREEM_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'CREEM_API_KEY environment variable is not set' }),
      };
    }

    const baseUrl = 'https://test-api.creem.io/v1';

    const response = await fetch(`${baseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: successUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.message || 'Checkout creation failed' }),
      };
    }

    if (!data.checkout_url) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No checkout URL returned from Creem' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl: data.checkout_url }),
    };
  } catch (err) {
    console.error('Checkout creation error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to create checkout session' }),
    };
  }
};
