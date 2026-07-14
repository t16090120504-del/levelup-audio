/**
 * Creem payment integration client.
 *
 * Uses Cloudflare Worker proxy (production) or local Express server (dev)
 * to create checkout sessions, avoiding CORS issues.
 */

const CF_WORKER_URL = 'https://levelup-checkout.t16090120504.workers.dev';

function getCheckoutBaseUrl(): string {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return '';
}

const CHECKOUT_BASE_URL = getCheckoutBaseUrl();

export interface CreateCheckoutParams {
  productId: string;
  successUrl: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
}

/**
 * Creates a Creem checkout session via Cloudflare Worker (prod) or local server (dev).
 */
export async function createCreemCheckout(
  params: CreateCheckoutParams,
): Promise<CreateCheckoutResult> {
  const url = CHECKOUT_BASE_URL
    ? `${CHECKOUT_BASE_URL}/api/checkout`
    : CF_WORKER_URL;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: params.productId,
      successUrl: params.successUrl,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorBody.error || `Checkout request failed (${response.status})`);
  }

  return response.json() as Promise<CreateCheckoutResult>;
}

/**
 * Builds the success URL for a given coin pack purchase.
 */
export function buildSuccessUrl(
  baseUrl: string,
  productId: string,
  coins: number,
): string {
  return `${baseUrl}/payment/success?productId=${encodeURIComponent(productId)}&coins=${coins}`;
}
