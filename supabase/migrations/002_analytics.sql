-- ============================================================
-- LevelUp Audio - Analytics Tables Migration (002)
-- ============================================================
-- 在 Supabase Dashboard 的 SQL Editor 中执行此文件，或使用
-- scripts/run-migrations.ts 脚本通过 REST API 运行。
-- ============================================================

-- ------------------------------------------------------------
-- analytics_events
--   Stores every user-facing analytics event (page views, plays,
--   purchases, etc.). Allows anonymous inserts so we can track
--   events even for non-authenticated visitors.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'page_view', 'episode_play', 'episode_complete', 'coin_purchase', 'series_view', 'search'
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) may INSERT events.
-- This lets us track non-logged-in visitors too.
DROP POLICY IF EXISTS "Allow public insert on analytics_events" ON analytics_events;
CREATE POLICY "Allow public insert on analytics_events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Authenticated users can read only their own events.
DROP POLICY IF EXISTS "Users can read own analytics events" ON analytics_events;
CREATE POLICY "Users can read own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- daily_stats
--   Aggregated daily metrics (one row per calendar day).
--   No public access — admin/service-role only.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_plays INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  coin_revenue DECIMAL(10,2) DEFAULT 0,
  subscription_revenue DECIMAL(10,2) DEFAULT 0,
  episodes_unlocked INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);

-- Enable RLS; no public policies (read/write restricted to service role)
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
