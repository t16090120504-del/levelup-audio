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
  /**
   * Optional metadata forwarded to Creem and echoed back in the webhook.
   * The webhook relies on `metadata.user_id` + `metadata.coins` to credit
   * the correct user securely (instead of trusting URL params on success).
   */
  metadata?: Record<string, unknown>;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
}

/**
 * Creates a Creem checkout session via Cloudflare Worker (prod) or local server (dev).
 *
 * The `metadata` is forwarded through to Creem so the webhook receiver can
 * identify the purchasing user and the coin amount to credit. This is what
 * makes the server-side crediting secure — the success page no longer grants
 * coins from untrusted query parameters.
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
      metadata: params.metadata,
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

/**
 * Builds the success URL for a subscription checkout.
 */
export function buildSubscriptionSuccessUrl(
  baseUrl: string,
  productId: string,
  planId: string,
): string {
  return `${baseUrl}/payment/success?productId=${encodeURIComponent(productId)}&type=subscription&planId=${encodeURIComponent(planId)}`;
}
