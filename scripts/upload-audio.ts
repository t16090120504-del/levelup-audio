/**
 * LevelUp Audio - Upload Sample Audio to Supabase Storage
 *
 * Prerequisites:
 *   1. Run the storage SQL in Supabase Dashboard SQL Editor first.
 *   2. A sample audio file exists at data/user/work/audio-gen/sample-5sec.mp3
 *
 * Usage:
 *   npx tsx scripts/upload-audio.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://ihfaoksiurmucryfzfvd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va';

const BUCKET_NAME = 'audio';
const SAMPLE_FILE = resolve('/data/user/work/audio-gen/sample-5sec.mp3');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function uploadAudio() {
  console.log('=== LevelUp Audio - Upload Sample Audio ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Sample file: ${SAMPLE_FILE}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Read the sample audio file
  const audioBuffer = readFileSync(SAMPLE_FILE);
  console.log(`Audio file size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

  // 2. Upload a single shared sample file
  const samplePath = 'samples/sample-5sec.mp3';
  console.log(`\n--- Uploading ${samplePath} ---`);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(samplePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError.message);
    console.log('\nTip: Make sure you ran the storage SQL in Supabase Dashboard first.');
    console.log('The SQL creates the "audio" bucket with public read policies.');
    process.exit(1);
  }

  console.log('Upload successful!');

  // 3. Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(samplePath);

  const publicUrl = publicUrlData.publicUrl;
  console.log(`Public URL: ${publicUrl}`);

  // 4. Update ALL episodes to use this audio URL
  console.log('\n--- Updating episodes audio_url ---');
  const { data: updateData, error: updateError } = await supabase
    .from('episodes')
    .update({ audio_url: publicUrl })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');

  if (updateError) {
    console.error('Update error:', updateError.message);
    process.exit(1);
  }

  console.log(`Updated ${updateData?.length ?? 0} episodes with the new audio URL.`);

  // 5. Verify by querying one episode
  const { data: verifyData } = await supabase
    .from('episodes')
    .select('id, title, audio_url')
    .limit(1)
    .single();

  if (verifyData) {
    console.log(`\n--- Verification ---`);
    console.log(`Episode: ${verifyData.title}`);
    console.log(`Audio URL: ${verifyData.audio_url}`);
  }

  console.log('\n=== Upload Complete ===');
  console.log('All episodes now point to the shared sample audio in Supabase Storage.');
}

uploadAudio().catch((err) => {
  console.error('Upload script failed:', err);
  process.exit(1);
});
