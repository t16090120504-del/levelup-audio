-- ============================================================
-- LevelUp Audio - Login Streaks Migration (003)
-- ============================================================
-- Adds streak-tracking columns to the existing profiles table.
-- 在 Supabase Dashboard 的 SQL Editor 中执行此文件，或使用
-- scripts/run-migrations.ts 脚本通过 REST API 运行。
-- ============================================================

-- login_streak   : consecutive days the user has been active
-- last_active_date : the most recent date the user was active (UTC)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Index for quickly finding streak leaders / analytics
CREATE INDEX IF NOT EXISTS idx_profiles_login_streak ON profiles(login_streak DESC);

-- The existing profiles RLS policies already allow users to read/update
-- their own row, so login_streak and last_active_date are covered:
--   "Users can read own profile"   (SELECT)
--   "Users can update own profile" (UPDATE)
-- No additional policies are required.

-- Helpful comment for the new columns
COMMENT ON COLUMN profiles.login_streak IS 'Number of consecutive days the user has visited (resets on a missed day)';
COMMENT ON COLUMN profiles.last_active_date IS 'The UTC date of the users most recent activity, used to compute the streak';
