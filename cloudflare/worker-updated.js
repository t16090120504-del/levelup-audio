/**
 * ============================================================
 * LevelUp Audio - Cloudflare Worker (Checkout + Webhook)
 * ============================================================
 *
 * Routes
 * ------
 *   POST /         -> Create a Creem checkout session (existing behaviour,
 *                     now also forwards `metadata` so the webhook can credit
 *                     the correct user).
 *   POST /webhook  -> Receive & verify Creem webhook events. On a verified
 *                     payment it credits coins / updates the subscription in
 *                     Supabase using the service-role key.
 *   GET  /health   -> Simple health check.
 *
 * Environment variables (set in the Cloudflare dashboard "Settings > Variables"):
 *   CREEM_API_KEY         Creem API key            (e.g. creem_test_...)
 *   CREEM_WEBHOOK_SECRET  Creem webhook secret     (from Developers > Webhook page)
 *   SUPABASE_URL          Supabase project URL     (https://xxx.supabase.co)
 *   SUPABASE_SERVICE_KEY  Supabase service role key (sb_secret_...)
 *
 * Deploy
 * ------
 *   1. Copy this entire file into the Cloudflare Worker editor
 *      (Workers & Pages > levelup-checkout > Edit code).
 *   2. Add the four environment variables above under Settings > Variables.
 *   3. Save & Deploy.
 *   4. In the Creem dashboard (Developers > Webhook), register the webhook
 *      endpoint URL:  https://levelup-checkout.t16090120504.workers.dev/webhook
 *   5. Copy the webhook secret shown by Creem into CREEM_WEBHOOK_SECRET.
 * ============================================================
 */

const CREEM_API_BASE = 'https://test-api.creem.io/v1';

/**
 * Creem product-id -> coin amount.
 * Used as a verification fallback when the checkout metadata is missing.
 * Keep in sync with src/constants/coin-packs.ts.
 */
const PRODUCT_COINS = {
  'prod_6ib4gnrDBkJicWRVk4TdfE': 100,
  'prod_23ardIsbMsk2Ln9AnntEEC': 500,
  'prod_2EgdfP9vBEn0DsyI6TdROU': 1000,
  'prod_5rva7Rw644gzI2AoV0Moq9': 5000,
};

/**
 * Creem subscription product-id -> plan type.
 * Keep in sync with src/constants/subscription.ts.
 */
const SUBSCRIPTION_PRODUCTS = {
  'prod_DSzJiK2FRchuZE3gqYS6T': 'monthly',
  'prod_4TiuO5fAVhT3VBwAeIOWj1': 'yearly',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/* ------------------------------------------------------------------ *
 * Crypto helpers (Web Crypto API - available in the Worker runtime)
 * ------------------------------------------------------------------ */

/**
 * Verify the Creem webhook signature.
 *
 * Creem sends `creem-signature` = HMAC-SHA256(rawBody, webhookSecret) as a
 * hex string. We recompute it and compare in constant time.
 *
 * @param {string} rawBody   - the raw request body (untouched string)
 * @param {string} signature - value of the `creem-signature` header
 * @param {string} secret    - the webhook secret from the Creem dashboard
 * @returns {Promise<boolean>}
 */
async function verifyCreemSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody),
  );
  const computed = bufToHex(sigBuf);

  return timingSafeEqual(computed, signature);
}

function bufToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string comparison to avoid timing side-channels. */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/* ------------------------------------------------------------------ *
 * Supabase REST helpers (no SDK needed - plain fetch)
 * ------------------------------------------------------------------ */

/**
 * Call a Supabase Postgres function (RPC) via the REST API.
 * Uses the service role key which bypasses RLS.
 */
async function supabaseRpc(env, fnName, params) {
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Supabase RPC ${fnName} failed: ${res.status} ${JSON.stringify(data)}`,
    );
  }
  return Array.isArray(data) ? data[0] : data;
}

/* ------------------------------------------------------------------ *
 * Webhook event handlers
 * ------------------------------------------------------------------ */

/**
 * Handle `checkout.completed`:
 *  - If the checkout created a subscription, activate the subscription.
 *  - Otherwise credit coins to the user.
 */
async function handleCheckoutCompleted(env, event) {
  const obj = event.object || {};
  const metadata = obj.metadata || {};
  const orderId = obj.order?.id;
  const checkoutId = obj.id || orderId;
  const productId = obj.product?.id || obj.order?.product;
  const amount = obj.order?.amount;
  const currency = obj.order?.currency;

  // ---- Subscription checkout ---------------------------------------
  if (obj.subscription && obj.subscription.id) {
    const sub = obj.subscription;
    const userId = metadata.user_id || metadata.userId || metadata.internal_customer_id;
    if (!userId) {
      console.warn('[webhook] subscription checkout without user_id in metadata', checkoutId);
      return;
    }
    await supabaseRpc(env, 'update_subscription_status', {
      p_user_id: userId,
      p_creem_subscription_id: sub.id,
      p_status: sub.status || 'active',
      p_product_id: productId,
      p_plan_type: SUBSCRIPTION_PRODUCTS[productId] || null,
      p_creem_customer_id: obj.customer?.id || null,
      p_current_period_end: sub.current_period_end_date || null,
      p_canceled_at: sub.canceled_at || null,
    });
    return;
  }

  // ---- Coin-pack purchase ------------------------------------------
  const userId = metadata.user_id || metadata.userId || metadata.internal_customer_id;
  // Prefer the coins amount passed in metadata; fall back to the product map.
  const coins =
    Number(metadata.coins) ||
    PRODUCT_COINS[productId] ||
    0;

  if (!userId) {
    console.warn('[webhook] checkout.completed without user_id in metadata', checkoutId);
    return;
  }
  if (coins <= 0) {
    console.warn('[webhook] could not determine coin amount for product', productId);
    return;
  }

  await supabaseRpc(env, 'credit_coins_for_payment', {
    p_user_id: userId,
    p_coins: coins,
    p_checkout_id: checkoutId,
    p_product_id: productId,
    p_description: metadata.description || `Purchased coin pack (${productId})`,
    p_event_id: event.id,
    p_amount: amount != null ? amount / 100 : null, // Creem amounts are in cents
    p_currency: currency || null,
    p_metadata: JSON.stringify(metadata),
  });
}

/**
 * Map a subscription.* event to a Supabase subscription status update.
 */
async function handleSubscriptionEvent(env, event) {
  const obj = event.object || {};
  const metadata = obj.metadata || {};
  const productId = obj.product?.id;
  const userId =
    metadata.user_id || metadata.userId || metadata.internal_customer_id;

  if (!userId) {
    console.warn(`[webhook] ${event.eventType} without user_id in metadata`, obj.id);
    return;
  }

  // Creem subscription statuses map cleanly to our table.
  const statusMap = {
    'subscription.active': 'active',
    'subscription.paid': 'active',
    'subscription.trialing': 'trialing',
    'subscription.past_due': 'past_due',
    'subscription.canceled': 'canceled',
    'subscription.expired': 'expired',
    'subscription.paused': 'paused',
    'subscription.scheduled_cancel': 'scheduled_cancel',
    'subscription.update': obj.status || 'active',
  };

  const status = statusMap[event.eventType] || obj.status || 'active';

  await supabaseRpc(env, 'update_subscription_status', {
    p_user_id: userId,
    p_creem_subscription_id: obj.id,
    p_status: status,
    p_product_id: productId,
    p_plan_type: SUBSCRIPTION_PRODUCTS[productId] || null,
    p_creem_customer_id: obj.customer?.id || null,
    p_current_period_end: obj.current_period_end_date || null,
    p_canceled_at: obj.canceled_at || null,
  });
}

/* ------------------------------------------------------------------ *
 * Route: create checkout  (POST /)
 * ------------------------------------------------------------------ */
async function handleCreateCheckout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { productId, successUrl, metadata } = body;
  if (!productId || !successUrl) {
    return json({ error: 'productId and successUrl are required' }, 400);
  }

  const apiKey = env.CREEM_API_KEY;
  if (!apiKey) {
    return json({ error: 'CREEM_API_KEY is not configured' }, 500);
  }

  // Forward the metadata so the webhook can identify the user & coin amount.
  const checkoutBody = {
    product_id: productId,
    success_url: successUrl,
  };
  if (metadata && typeof metadata === 'object') {
    checkoutBody.metadata = metadata;
  }

  const res = await fetch(`${CREEM_API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkoutBody),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json({ error: data.message || 'Checkout creation failed' }, 400);
  }
  if (!data.checkout_url) {
    return json({ error: 'No checkout URL returned from Creem' }, 500);
  }

  return json({ checkoutUrl: data.checkout_url });
}

/* ------------------------------------------------------------------ *
 * Route: webhook  (POST /webhook)
 * ------------------------------------------------------------------ */
async function handleWebhook(request, env) {
  // Always grab the raw body - the signature is computed over the exact bytes.
  const rawBody = await request.text();

  const signature = request.headers.get('creem-signature');
  const webhookSecret = env.CREEM_WEBHOOK_SECRET;

  // --- Verify the signature -----------------------------------------
  // If no secret is configured we still log but reject, to stay safe-by-default.
  if (!webhookSecret) {
    console.error('[webhook] CREEM_WEBHOOK_SECRET is not configured');
    return json({ error: 'webhook secret not configured' }, 500);
  }

  const valid = await verifyCreemSignature(rawBody, signature, webhookSecret);
  if (!valid) {
    console.warn('[webhook] signature verification failed');
    return json({ error: 'invalid signature' }, 401);
  }

  // --- Parse & dispatch ---------------------------------------------
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid JSON payload' }, 400);
  }

  const eventType = event.eventType;
  console.log(`[webhook] received event: ${eventType} (${event.id})`);

  try {
    switch (eventType) {
      case 'checkout.completed':
        await handleCheckoutCompleted(env, event);
        break;

      case 'subscription.active':
      case 'subscription.paid':
      case 'subscription.canceled':
      case 'subscription.scheduled_cancel':
      case 'subscription.past_due':
      case 'subscription.expired':
      case 'subscription.paused':
      case 'subscription.trialing':
      case 'subscription.update':
        await handleSubscriptionEvent(env, event);
        break;

      case 'refund.created':
        // TODO: optionally reverse the coin credit here.
        console.log('[webhook] refund.created received (not auto-reversed)', event.id);
        break;

      case 'dispute.created':
        console.log('[webhook] dispute.created received', event.id);
        break;

      default:
        console.log(`[webhook] unhandled event type: ${eventType}`);
    }
  } catch (err) {
    // Log the error but still return 200 so Creem does not keep retrying
    // a broken event forever. The idempotency guard in the DB prevents
    // double-credit when the underlying issue is fixed and the event is
    // manually resent.
    console.error(`[webhook] error processing ${eventType}:`, err.message);
  }

  // Always acknowledge receipt to Creem.
  return json({ received: true });
}

/* ------------------------------------------------------------------ *
 * Utilities
 * ------------------------------------------------------------------ */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/* ------------------------------------------------------------------ *
 * Worker entry point
 * ------------------------------------------------------------------ */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS pre-flight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, time: new Date().toISOString() });
    }

    // Create checkout
    if (url.pathname === '/' && request.method === 'POST') {
      try {
        return await handleCreateCheckout(request, env);
      } catch (err) {
        console.error('[checkout] error:', err.message);
        return json({ error: err.message || 'Checkout failed' }, 500);
      }
    }

    // Webhook receiver
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};
