-- ============================================================
-- LevelUp Audio - Supabase Database Schema
-- ============================================================
-- 在 Supabase Dashboard 的 SQL Editor 中执行此文件
-- ============================================================

-- Genres
CREATE TABLE IF NOT EXISTS genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Series
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  genre_id UUID REFERENCES genres(id),
  is_completed BOOLEAN DEFAULT false,
  total_episodes INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_plays INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Episodes
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  episode_number INTEGER NOT NULL,
  season_number INTEGER DEFAULT 1,
  duration_seconds INTEGER NOT NULL DEFAULT 300,
  audio_url TEXT,
  audio_size_bytes INTEGER,
  is_free BOOLEAN DEFAULT false,
  unlock_cost_coins INTEGER DEFAULT 10,
  released_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(series_id, episode_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series_episode ON episodes(series_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_series_genre_id ON series(genre_id);
CREATE INDEX IF NOT EXISTS idx_series_total_plays ON series(total_plays DESC);
CREATE INDEX IF NOT EXISTS idx_series_avg_rating ON series(avg_rating DESC);

-- Enable Row Level Security
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon key can read)
CREATE POLICY "Allow public read on genres" ON genres FOR SELECT USING (true);
CREATE POLICY "Allow public read on series" ON series FOR SELECT USING (true);
CREATE POLICY "Allow public read on episodes" ON episodes FOR SELECT USING (true);

-- User profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Coin balances
CREATE TABLE IF NOT EXISTS coin_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 20,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_bonus_claim_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own balance" ON coin_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON coin_balances FOR UPDATE USING (auth.uid() = user_id);

-- Coin transactions
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spend', 'bonus', 'refund')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own transactions" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);

-- Unlocked episodes
CREATE TABLE IF NOT EXISTS unlocked_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  coins_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

ALTER TABLE unlocked_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own unlocks" ON unlocked_episodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own unlocks" ON unlocked_episodes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, series_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Listening progress
CREATE TABLE IF NOT EXISTS listening_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  position_seconds NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_played_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

ALTER TABLE listening_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own progress" ON listening_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own progress" ON listening_progress FOR ALL USING (auth.uid() = user_id);
