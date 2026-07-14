/**
 * ============================================================
 * LevelUp Audio - Netlify Function: Creem Webhook Receiver
 * ============================================================
 *
 * Endpoint:  POST /.netlify/functions/verify-payment
 *
 * Receives Creem webhook events (checkout.completed, subscription.*,
 * refund.created, etc.), verifies the `creem-signature` header using
 * HMAC-SHA256, and on a verified payment credits coins to the user's
 * Supabase account / updates the subscription status.
 *
 * Environment variables (set in Netlify: Site settings > Environment variables):
 *   CREEM_WEBHOOK_SECRET   Creem webhook signing secret (Developers > Webhook)
 *   SUPABASE_URL           Supabase project URL   (https://xxx.supabase.co)
 *   SUPABASE_SERVICE_KEY   Supabase service role key (sb_secret_...)
 *
 * Register this URL in the Creem dashboard (Developers > Webhook):
 *   https://<your-site>.netlify.app/.netlify/functions/verify-payment
 * ============================================================
 */

const crypto = require('crypto');

const CREEM_API_BASE = 'https://test-api.creem.io/v1';

/** Creem product-id -> coin amount (fallback; keep in sync with coin-packs.ts). */
const PRODUCT_COINS = {
  'prod_6ib4gnrDBkJicWRVk4TdfE': 100,
  'prod_23ardIsbMsk2Ln9AnntEEC': 500,
  'prod_2EgdfP9vBEn0DsyI6TdROU': 1000,
  'prod_5rva7Rw644gzI2AoV0Moq9': 5000,
};

/** Creem subscription product-id -> plan type (keep in sync with subscription.ts). */
const SUBSCRIPTION_PRODUCTS = {
  'prod_DSzJiK2FRchuZE3gqYS6T': 'monthly',
  'prod_4TiuO5fAVhT3VBwAeIOWj1': 'yearly',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/* ------------------------------------------------------------------ */

function jsonResponse(body, statusCode = 200, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

/**
 * Verify the Creem webhook signature.
 *
 * Creem sends `creem-signature` = HMAC-SHA256(rawBody, webhookSecret) as hex.
 * We recompute it and compare in constant time.
 *
 * @param {string} rawBody  - the raw request body as a string
 * @param {string} signature - value of the `creem-signature` header
 * @param {string} secret   - the webhook secret from the Creem dashboard
 * @returns {boolean}
 */
function verifyCreemSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // Constant-time comparison.
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ *
 * Supabase REST helper (plain fetch, service-role key bypasses RLS)
 * ------------------------------------------------------------------ */

async function supabaseRpc(fnName, params) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured');
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Supabase RPC ${fnName} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

/* ------------------------------------------------------------------ *
 * Event handlers
 * ------------------------------------------------------------------ */

/** Handle `checkout.completed`: credit coins or activate a subscription. */
async function handleCheckoutCompleted(event) {
  const obj = event.object || {};
  const metadata = obj.metadata || {};
  const orderId = obj.order?.id;
  const checkoutId = obj.id || orderId;
  const productId = obj.product?.id || obj.order?.product;
  const amount = obj.order?.amount;
  const currency = obj.order?.currency;

  // --- Subscription checkout ---
  if (obj.subscription && obj.subscription.id) {
    const sub = obj.subscription;
    const userId = metadata.user_id || metadata.userId || metadata.internal_customer_id;
    if (!userId) {
      console.warn('[webhook] subscription checkout without user_id in metadata', checkoutId);
      return;
    }
    await supabaseRpc('update_subscription_status', {
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

  // --- Coin-pack purchase ---
  const userId = metadata.user_id || metadata.userId || metadata.internal_customer_id;
  const coins = Number(metadata.coins) || PRODUCT_COINS[productId] || 0;

  if (!userId) {
    console.warn('[webhook] checkout.completed without user_id in metadata', checkoutId);
    return;
  }
  if (coins <= 0) {
    console.warn('[webhook] could not determine coin amount for product', productId);
    return;
  }

  await supabaseRpc('credit_coins_for_payment', {
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

/** Map a subscription.* event to a Supabase subscription status update. */
async function handleSubscriptionEvent(event) {
  const obj = event.object || {};
  const metadata = obj.metadata || {};
  const productId = obj.product?.id;
  const userId = metadata.user_id || metadata.userId || metadata.internal_customer_id;

  if (!userId) {
    console.warn(`[webhook] ${event.eventType} without user_id in metadata`, obj.id);
    return;
  }

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

  await supabaseRpc('update_subscription_status', {
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
 * Netlify handler
 * ------------------------------------------------------------------ */
exports.handler = async (event) => {
  // CORS pre-flight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Netlify may deliver the body base64-encoded. The signature is computed
  // over the exact raw bytes Creem sent, so decode back to a UTF-8 string.
  let rawBody = event.body || '';
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
  }

  // --- Verify signature ---
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] CREEM_WEBHOOK_SECRET is not configured');
    return jsonResponse({ error: 'webhook secret not configured' }, 500);
  }

  // Headers are lower-cased by Netlify.
  const signature = event.headers['creem-signature'] || event.headers['Creem-Signature'];

  const valid = verifyCreemSignature(rawBody, signature, webhookSecret);
  if (!valid) {
    console.warn('[webhook] signature verification failed');
    return jsonResponse({ error: 'invalid signature' }, 401);
  }

  // --- Parse & dispatch ---
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'invalid JSON payload' }, 400);
  }

  const eventType = payload.eventType;
  console.log(`[webhook] received event: ${eventType} (${payload.id})`);

  try {
    switch (eventType) {
      case 'checkout.completed':
        await handleCheckoutCompleted(payload);
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
        await handleSubscriptionEvent(payload);
        break;

      case 'refund.created':
        console.log('[webhook] refund.created received (not auto-reversed)', payload.id);
        break;

      case 'dispute.created':
        console.log('[webhook] dispute.created received', payload.id);
        break;

      default:
        console.log(`[webhook] unhandled event type: ${eventType}`);
    }
  } catch (err) {
    // Log but still acknowledge with 200 so Creem stops retrying.
    // The DB idempotency guard prevents double-credit on manual resend.
    console.error(`[webhook] error processing ${eventType}:`, err.message);
  }

  // Always acknowledge receipt.
  return jsonResponse({ received: true });
};
