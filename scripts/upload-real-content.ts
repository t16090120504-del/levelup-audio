/**
 * LevelUp Audio - Upload Real Content to Supabase
 *
 * Creates "The Last System: Awakening" series with 10 real audio episodes.
 * Uploads audio files to Supabase Storage and creates episode records.
 * Cleans up old mock series afterward.
 *
 * Usage:
 *   npx tsx scripts/upload-real-content.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://ihfaoksiurmucryfzfvd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va';
// Service role key bypasses RLS — needed for INSERT/UPDATE/DELETE on tables
// that only have SELECT policies for anon.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'sb_secret_HR5YZxJ2j0PmWExOQySlTA_hBc_B1Hy';

const BUCKET_NAME = 'audio';
const AUDIO_DIR = '/data/user/work/audio-episodes';
const STORAGE_PATH_PREFIX = 'series/the-last-system';

// ---------------------------------------------------------------------------
// Episode metadata (from the-last-system-season1.md)
// ---------------------------------------------------------------------------

const EPISODES_META = [
  {
    episode_number: 1,
    title: 'The Dying Light',
    description:
      'The System died at 3:47 AM on a Tuesday. Not with a bang, but quietly — and Kael, a street-level scavenger, discovers a faint blue glow in the rubble that changes everything.',
    duration_seconds: 174,
  },
  {
    episode_number: 2,
    title: 'The Price of Power',
    description:
      'I wake up screaming. Not from pain, but from the sheer volume of information flooding my brain. Stats, skills, interface modules — and a terrifying new feature called the Memory Tax.',
    duration_seconds: 224,
  },
  {
    episode_number: 3,
    title: 'First Blood',
    description:
      'My back is against concrete. Three hostiles. One enchanted weapon. My stats say Level 4 with no combat skills. But the System shard shows me hidden actions that the old System never offered.',
    duration_seconds: 237,
  },
  {
    episode_number: 4,
    title: 'The Ghost in the Machine',
    description:
      'I spend two days testing my new abilities. The enchanted sword "Echo" responds to my touch like it was made for me. And the shard gives me a coordinate pointing to Sector Zero — ground zero of the Collapse.',
    duration_seconds: 161,
  },
  {
    episode_number: 5,
    title: 'The Fragment',
    description:
      'The voice is coming from inside the tower. A projection named Lumen — the System\'s self-awareness protocol — reveals the truth about the Purge and the Architects of Silence who destroyed everything.',
    duration_seconds: 226,
  },
  {
    episode_number: 6,
    title: 'The Map of Scars',
    description:
      'The journey north to find the Silence Engine takes five days through ruins and mutated wildlife. A mana-modified creature stands between Kael and the only passable route — and it\'s twice his level.',
    duration_seconds: 256,
  },
  {
    episode_number: 7,
    title: 'What I Lost',
    description:
      'Victory comes with a price. Leveling up means paying the Memory Tax — one random memory, permanently erased. Kael must decide what he\'s willing to sacrifice for power, and what the Architects\' destruction really cost humanity.',
    duration_seconds: 242,
  },
  {
    episode_number: 8,
    title: 'The Fortress of Vex',
    description:
      'The Academy of Ascension is now a warlord\'s fortress. Lumen and Kael infiltrate through forgotten drainage tunnels, navigating degraded security systems to reach the Silence Engine hidden deep below.',
    duration_seconds: 201,
  },
  {
    episode_number: 9,
    title: 'The Choice',
    description:
      'Lord Vex finds them. Twenty armed soldiers. A Level 187 warlord with a devastating hammer. Kael fights for his life while Lumen attempts something impossible — negotiating with the Silence Engine itself.',
    duration_seconds: 224,
  },
  {
    episode_number: 10,
    title: 'A New Dawn',
    description:
      'Time stops. Lumen speaks to the Engine, proposing a transformation: merge the last Kernel with the negation matrix to create a new System — one powered by crystallized mana instead of human memories. The choice will reshape civilization.',
    duration_seconds: 338,
  },
];

// ---------------------------------------------------------------------------
// Mock series UUIDs to delete
// ---------------------------------------------------------------------------

const MOCK_SERIES_IDS = [
  '11111111-aaaa-4bbb-9ccc-dddddddddddd',
  '22222222-bbbb-4ccc-9ddd-eeeeeeeeeeee',
  '33333333-cccc-4ddd-9eee-ffffffffffff',
  '44444444-dddd-4eee-9fff-aaaaaaaaaaaa',
  '55555555-eeee-4fff-9aaa-bbbbbbbbbbbb',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatDate(d: Date): string {
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== LevelUp Audio - Upload Real Content ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Audio dir:    ${AUDIO_DIR}`);
  console.log(`Storage path: ${BUCKET_NAME}/${STORAGE_PATH_PREFIX}/\n`);

  // Use service_role client for DB operations (bypasses RLS).
  // Storage upload uses the same client (storage policies are separate).
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // -----------------------------------------------------------------------
  // Step 1: Query the genres table for progression-fantasy UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'progression-fantasy');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "progression-fantasy" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found progression-fantasy genre: ${genreId}\n`);

  // -----------------------------------------------------------------------
  // Step 2: Upload 10 audio files to Supabase Storage
  // -----------------------------------------------------------------------
  console.log('--- Step 2: Upload audio files ---');
  const uploadedUrls: Record<number, string> = {};

  for (const ep of EPISODES_META) {
    const fileName = `ep${String(ep.episode_number).padStart(2, '0')}.mp3`;
    const localPath = resolve(AUDIO_DIR, fileName);
    const storagePath = `${STORAGE_PATH_PREFIX}/${fileName}`;

    if (!existsSync(localPath)) {
      console.error(`  ERROR: File not found: ${localPath}`);
      console.error(`  Skipping episode ${ep.episode_number}`);
      continue;
    }

    const fileBuffer = readFileSync(localPath);
    console.log(
      `  Uploading ep${String(ep.episode_number).padStart(2, '0')}.mp3 (${(fileBuffer.length / 1024).toFixed(1)} KB)...`,
    );

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error(
        `  ERROR uploading ${fileName}: ${uploadError.message}`,
      );
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    uploadedUrls[ep.episode_number] = urlData.publicUrl;
    console.log(`  OK -> ${urlData.publicUrl}`);

    // Small delay to avoid rate limiting
    await sleep(200);
  }

  console.log(
    `\nUploaded ${Object.keys(uploadedUrls).length}/10 audio files.\n`,
  );

  // -----------------------------------------------------------------------
  // Step 3: Create the series record
  // -----------------------------------------------------------------------
  console.log('--- Step 3: Create series ---');
  const seriesId = crypto.randomUUID();

  const { data: seriesData, error: seriesError } = await supabase
    .from('series')
    .insert({
      id: seriesId,
      title: 'The Last System: Awakening',
      description:
        'In a world where the last remaining System — a reality-altering interface that grants power through stats and levels — is dying, a street-level scavenger named Kael discovers he is the last person capable of hosting it. But the System demands sacrifice. Every level costs a memory.',
      author: 'Aria Wintersong',
      cover_url: 'gradient:from-indigo-600-to-purple-800',
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['system', 'post-apocalyptic', 'leveling', 'sacrifice'],
      status: 'ongoing',
    })
    .select()
    .single();

  if (seriesError) {
    console.error('Error creating series:', seriesError.message);
    process.exit(1);
  }

  console.log(`Created series: ${seriesData!.title} (id: ${seriesId})\n`);

  // -----------------------------------------------------------------------
  // Step 4: Create 10 episode records
  // -----------------------------------------------------------------------
  console.log('--- Step 4: Create episodes ---');
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const startDate = now - 7 * ONE_DAY_MS; // 7 days ago

  let episodesCreated = 0;

  for (const ep of EPISODES_META) {
    const audioUrl = uploadedUrls[ep.episode_number];
    if (!audioUrl) {
      console.error(
        `  Skipping episode ${ep.episode_number} — no audio URL.`,
      );
      continue;
    }

    const releasedAt = new Date(
      startDate + (ep.episode_number - 1) * ONE_DAY_MS,
    );

    const epId = crypto.randomUUID();

    const { error: epError } = await supabase.from('episodes').insert({
      id: epId,
      series_id: seriesId,
      title: ep.title,
      description: ep.description,
      episode_number: ep.episode_number,
      season_number: 1,
      duration_seconds: ep.duration_seconds,
      audio_url: audioUrl,
      audio_size_bytes: ep.duration_seconds * 16000,
      is_free: ep.episode_number <= 3,
      unlock_cost_coins: 10,
      released_at: formatDate(releasedAt),
    });

    if (epError) {
      console.error(
        `  ERROR creating episode ${ep.episode_number}: ${epError.message}`,
      );
    } else {
      episodesCreated++;
      const freeLabel = ep.episode_number <= 3 ? ' [FREE]' : ' [10 coins]';
      console.log(
        `  Ep${String(ep.episode_number).padStart(2, '0')}: "${ep.title}"${freeLabel} — ${ep.duration_seconds}s — ${formatDate(releasedAt).split('T')[0]}`,
      );
    }

    await sleep(100);
  }

  console.log(`\nCreated ${episodesCreated}/10 episodes.\n`);

  // -----------------------------------------------------------------------
  // Step 5: Delete old mock series and their episodes
  // -----------------------------------------------------------------------
  console.log('--- Step 5: Delete old mock series ---');
  let mockDeleted = 0;

  for (const mockId of MOCK_SERIES_IDS) {
    // Episodes are deleted via CASCADE
    const { error: delError } = await supabase
      .from('series')
      .delete()
      .eq('id', mockId);

    if (delError) {
      console.error(`  Error deleting ${mockId}: ${delError.message}`);
    } else {
      mockDeleted++;
      console.log(`  Deleted mock series: ${mockId}`);
    }
  }

  console.log(`Deleted ${mockDeleted} old mock series.\n`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('=== Summary ===');
  console.log(`Series created:  The Last System: Awakening (${seriesId})`);
  console.log(`Genre:           progression-fantasy (${genreId})`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log(`Mock series deleted: ${mockDeleted}/5`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
