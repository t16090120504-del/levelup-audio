/**
 * LevelUp Audio - Upload Cover Images to Supabase Storage
 *
 * Downloads cover images from Unsplash and uploads them to Supabase Storage.
 * Then updates the series table with the new cover_url.
 *
 * Prerequisites:
 *   1. Supabase Storage "audio" bucket exists (from previous step).
 *   2. Add a "covers" folder policy or use existing bucket.
 *
 * Usage:
 *   npx tsx scripts/upload-covers.ts
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://ihfaoksiurmucryfzfvd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va';

const BUCKET_NAME = 'audio';
const COVERS_DIR = resolve('/data/user/work/covers');

// Series ID mapping (matches seed data)
const SERIES_MAP: Record<string, { id: string; title: string; unsplashQuery: string }> = {
  'series-the-ascendant': {
    id: '11111111-aaaa-4bbb-9ccc-dddddddddddd',
    title: 'The Ascendant',
    unsplashQuery: 'magical-academy-fantasy-purple',
  },
  'series-system-reborn': {
    id: '22222222-bbbb-4ccc-9ddd-eeeeeeeeeeee',
    title: 'System Reborn',
    unsplashQuery: 'cyberpunk-game-interface-green',
  },
  'series-dungeon-of-the-forgotten': {
    id: '33333333-cccc-4ddd-9eee-ffffffffffff',
    title: 'Dungeon of the Forgotten',
    unsplashQuery: 'dark-dungeon-crystal-cave-red',
  },
  'series-path-of-ten-thousand-swords': {
    id: '44444444-dddd-4eee-9fff-aaaaaaaaaaaa',
    title: 'Path of Ten Thousand Swords',
    unsplashQuery: 'eastern-swords-martial-arts-indigo',
  },
  'series-rift-walker': {
    id: '55555555-eeee-4fff-9aaa-bbbbbbbbbbbb',
    title: 'Rift Walker',
    unsplashQuery: 'portal- dimensional-rift-teal-violet',
  },
};

// High-quality Unsplash image URLs (curated, fixed images that won't change)
const UNSPLASH_IMAGES: Record<string, string> = {
  'series-the-ascendant':
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=600&fit=crop&q=80',
  'series-system-reborn':
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=600&fit=crop&q=80',
  'series-dungeon-of-the-forgotten':
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=600&fit=crop&q=80',
  'series-path-of-ten-thousand-swords':
    'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=600&h=600&fit=crop&q=80',
  'series-rift-walker':
    'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=600&h=600&fit=crop&q=80',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function uploadCovers() {
  console.log('=== LevelUp Audio - Upload Cover Images ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Ensure covers directory exists
  if (!existsSync(COVERS_DIR)) {
    mkdirSync(COVERS_DIR, { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  for (const [key, info] of Object.entries(SERIES_MAP)) {
    console.log(`\n--- Processing: ${info.title} ---`);

    const imageUrl = UNSPLASH_IMAGES[key];
    const localFile = resolve(COVERS_DIR, `${key}.jpg`);
    const storagePath = `covers/${key}.jpg`;

    try {
      // 1. Download image using curl
      console.log(`  Downloading from Unsplash...`);
      execSync(
        `curl -sL "${imageUrl}" -o "${localFile}" --max-time 30`,
        { stdio: 'pipe' },
      );

      const { size } = await import('fs').then((fs) =>
        fs.promises.stat(localFile),
      );
      console.log(`  File size: ${(size / 1024).toFixed(1)} KB`);

      if (size < 1000) {
        console.log(`  Skipping: file too small (likely failed download)`);
        errorCount++;
        continue;
      }

      // 2. Upload to Supabase Storage
      console.log(`  Uploading to ${storagePath}...`);
      const fileBuffer = await import('fs').then((fs) =>
        fs.promises.readFile(localFile),
      );

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error(`  Upload error: ${uploadError.message}`);
        errorCount++;
        continue;
      }

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;
      console.log(`  Public URL: ${publicUrl}`);

      // 4. Update series table
      const { error: updateError } = await supabase
        .from('series')
        .update({ cover_url: publicUrl })
        .eq('id', info.id);

      if (updateError) {
        console.error(`  DB update error: ${updateError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  Updated series "${info.title}" cover_url.`);
      successCount++;
    } catch (err) {
      console.error(`  Error: ${(err as Error).message}`);
      errorCount++;
    }
  }

  console.log(`\n=== Upload Complete ===`);
  console.log(`Success: ${successCount}/${Object.keys(SERIES_MAP).length}`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
  }
}

uploadCovers().catch((err) => {
  console.error('Upload script failed:', err);
  process.exit(1);
});
