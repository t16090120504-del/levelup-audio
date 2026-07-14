import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const s = createClient('https://ihfaoksiurmucryfzfvd.supabase.co', 'sb_secret_HR5YZxJ2j0PmWExOQySlTA_hBc_B1Hy');

const { data, error } = await s.from('genres').insert({
  id: randomUUID(),
  name: 'Workplace Power Fantasy',
  slug: 'workplace-power-fantasy',
  description: 'Rise from the bottom to the top. Office politics, corporate warfare, and the underdog who outsmarts everyone.',
  icon_url: null,
  sort_order: 8,
}).select();

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('Genre added:', JSON.stringify(data, null, 2));
}
