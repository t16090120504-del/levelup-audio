import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const supabase = createClient(
  'https://ihfaoksiurmucryfzfvd.supabase.co',
  'sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va'
);

async function main() {
  // Download cover image
  const imgUrl = 'https://images.unsplash.com/photo-1535350356005-fd52b3b524fb?w=600&h=600&fit=crop&q=80';
  const tmpFile = '/data/user/work/cover-tls.jpg';
  execSync('curl -sL "' + imgUrl + '" -o "' + tmpFile + '" --max-time 30');

  const buf = readFileSync(tmpFile);
  console.log('Image size:', buf.length);

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('audio')
    .upload('covers/the-last-system.jpg', buf, { contentType: 'image/jpeg', upsert: true });

  if (error) { console.error('Upload error:', error); process.exit(1); }

  const { data } = supabase.storage.from('audio').getPublicUrl('covers/the-last-system.jpg');
  const publicUrl = data.publicUrl;
  console.log('Public URL:', publicUrl);

  // Update series cover_url
  const { error: updateErr } = await supabase
    .from('series')
    .update({ cover_url: publicUrl })
    .eq('title', 'The Last System: Awakening');

  if (updateErr) console.error('Update error:', updateErr);
  else console.log('Series cover updated!');
}

main();
