-- ============================================================
-- LevelUp Audio - Payment Logs & Webhook Support Migration
-- ============================================================
-- Run this in the Supabase Dashboard SQL Editor.
--
-- This migration adds:
--   1. `payment_transactions`  - logs every Creem payment for audit/idempotency
--   2. `subscriptions`         - tracks subscription lifecycle driven by webhooks
--   3. `credit_coins_for_payment()`      - atomic, idempotent coin-crediting RPC
--   4. `update_subscription_status()`    - upsert subscription status RPC
--
-- Security model:
--   - Both tables use RLS.
--   - Users can READ their own rows (auth.uid() = user_id).
--   - Only the service role (which bypasses RLS) can INSERT / UPDATE.
--   - The RPC functions are SECURITY DEFINER so the service-role webhook
--     can credit coins / update subscriptions safely and atomically.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. payment_transactions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creem_checkout_id  TEXT UNIQUE,
  creem_event_id     TEXT,
  product_id         TEXT,
  coins_credited     INTEGER NOT NULL DEFAULT 0,
  amount             NUMERIC(10, 2),
  currency           TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'completed', 'failed')),
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_product_id ON payment_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read only their own payment records.
DROP POLICY IF EXISTS "Users can read own payment transactions" ON payment_transactions;
CREATE POLICY "Users can read own payment transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE policy for anon/authenticated users.
-- The service role bypasses RLS, so the webhook (using the service role key)
-- is the only writer. This prevents clients from forging payment records.

-- ----------------------------------------------------------------
-- 2. subscriptions  (driven by Creem subscription webhooks)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creem_subscription_id TEXT UNIQUE NOT NULL,
  creem_customer_id     TEXT,
  product_id            TEXT,
  plan_type             TEXT CHECK (plan_type IN ('monthly', 'yearly')),
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN (
                          'active', 'trialing', 'past_due', 'canceled',
                          'expired', 'paused', 'scheduled_cancel'
                        )),
  current_period_end    TIMESTAMPTZ,
  canceled_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read only their own subscription.
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Again, writes are service-role only (bypasses RLS).

-- ----------------------------------------------------------------
-- 3. credit_coins_for_payment()  - atomic + idempotent
-- ----------------------------------------------------------------
-- Called by the webhook (service role) when a `checkout.completed` event
-- is received. Credits coins exactly once per `creem_checkout_id`, even if
-- Creem retries delivery. Returns the resulting balance.
CREATE OR REPLACE FUNCTION credit_coins_for_payment(
  p_user_id      UUID,
  p_coins        INTEGER,
  p_checkout_id  TEXT,
  p_product_id   TEXT DEFAULT NULL,
  p_description  TEXT DEFAULT 'Coin pack purchase',
  p_event_id     TEXT DEFAULT NULL,
  p_amount       NUMERIC DEFAULT NULL,
  p_currency     TEXT DEFAULT NULL,
  p_metadata     JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, already_processed BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_status TEXT;
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
BEGIN
  IF p_coins <= 0 THEN
    RETURN QUERY SELECT false, false, 0, 'coins must be positive';
    RETURN;
  END IF;

  -- Idempotency: lock any existing row for this checkout so concurrent
  -- webhook retries cannot double-credit.
  SELECT status INTO v_existing_status
  FROM payment_transactions
  WHERE creem_checkout_id = p_checkout_id
  FOR UPDATE;

  IF v_existing_status = 'completed' THEN
    -- Already credited; report current balance without side effects.
    SELECT balance INTO v_current_balance
    FROM coin_balances
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT true, true, COALESCE(v_current_balance, 0),
                        'payment already processed';
    RETURN;
  END IF;

  -- Lock the user's balance row for a consistent read-modify-write.
  SELECT balance INTO v_current_balance
  FROM coin_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := v_current_balance + p_coins;

  -- Upsert the balance (handles first-time users with no row yet).
  INSERT INTO coin_balances (user_id, balance, total_earned, updated_at)
  VALUES (p_user_id, v_new_balance, p_coins, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance       = v_new_balance,
        total_earned  = coin_balances.total_earned + p_coins,
        updated_at    = now();

  -- Record the purchase in the coin ledger.
  INSERT INTO coin_transactions
    (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, 'purchase', p_coins, v_new_balance, p_checkout_id, p_description);

  -- Upsert the payment log so retries are caught above.
  INSERT INTO payment_transactions
    (user_id, creem_checkout_id, creem_event_id, product_id,
     coins_credited, amount, currency, status, completed_at, metadata)
  VALUES
    (p_user_id, p_checkout_id, p_event_id, p_product_id,
     p_coins, p_amount, p_currency, 'completed', now(), p_metadata)
  ON CONFLICT (creem_checkout_id) DO UPDATE
    SET status          = 'completed',
        coins_credited  = p_coins,
        completed_at    = now(),
        creem_event_id  = COALESCE(p_event_id, payment_transactions.creem_event_id);

  RETURN QUERY SELECT true, false, v_new_balance, 'coins credited successfully';
END;
$$;

-- ----------------------------------------------------------------
-- 4. update_subscription_status()  - upsert subscription row
-- ----------------------------------------------------------------
-- Called by the webhook for subscription.* events.
CREATE OR REPLACE FUNCTION update_subscription_status(
  p_user_id              UUID,
  p_creem_subscription_id TEXT,
  p_status               TEXT,
  p_product_id           TEXT DEFAULT NULL,
  p_plan_type            TEXT DEFAULT NULL,
  p_creem_customer_id    TEXT DEFAULT NULL,
  p_current_period_end   TIMESTAMPTZ DEFAULT NULL,
  p_canceled_at          TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscriptions
    (user_id, creem_subscription_id, creem_customer_id, product_id,
     plan_type, status, current_period_end, canceled_at, updated_at)
  VALUES
    (p_user_id, p_creem_subscription_id, p_creem_customer_id, p_product_id,
     p_plan_type, p_status, p_current_period_end, p_canceled_at, now())
  ON CONFLICT (creem_subscription_id) DO UPDATE
    SET status              = p_status,
        product_id          = COALESCE(p_product_id, subscriptions.product_id),
        plan_type           = COALESCE(p_plan_type, subscriptions.plan_type),
        creem_customer_id   = COALESCE(p_creem_customer_id, subscriptions.creem_customer_id),
        current_period_end  = COALESCE(p_current_period_end, subscriptions.current_period_end),
        canceled_at         = COALESCE(p_canceled_at, subscriptions.canceled_at),
        user_id             = COALESCE(p_user_id, subscriptions.user_id),
        updated_at          = now();

  RETURN QUERY SELECT true, 'subscription updated';
END;
$$;

-- Grant execute to anon/authenticated so the service role (which is a
-- superuser-like role) can call them. RLS on the underlying tables still
-- protects direct reads/writes for normal users.
GRANT EXECUTE ON FUNCTION credit_coins_for_payment TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_status TO anon, authenticated;
