import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL env variable');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseAnonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY env variable');

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);
