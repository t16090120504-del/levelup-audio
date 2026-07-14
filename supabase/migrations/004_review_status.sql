-- ============================================================
-- LevelUp Audio - Review Status Migration (004)
-- ============================================================
-- Adds content review columns to episodes and series tables.
-- 在 Supabase Dashboard 的 SQL Editor 中执行此文件，或使用
-- scripts/run-migrations.ts 脚本通过 REST API 运行。
-- ============================================================

-- episodes: review_status tracks content moderation state
ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- series: defaults to 'approved' because series are created
-- by admins who have already reviewed the content
ALTER TABLE series
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'approved'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Indexes for filtering pending items quickly
CREATE INDEX IF NOT EXISTS idx_episodes_review_status ON episodes(review_status);
CREATE INDEX IF NOT EXISTS idx_series_review_status ON series(review_status);

COMMENT ON COLUMN episodes.review_status IS 'Content moderation status: pending, approved, or rejected';
COMMENT ON COLUMN episodes.review_notes IS 'Admin notes explaining the review decision';
COMMENT ON COLUMN series.review_status IS 'Content moderation status: pending, approved, or rejected (defaults to approved for admin-created series)';
COMMENT ON COLUMN series.review_notes IS 'Admin notes explaining the review decision';
