/**
 * LevelUp Audio - Upload "Infinite Loop: The Last Login" Series to Supabase
 *
 * 1. Downloads cover image and uploads to Supabase Storage
 * 2. Uploads 10 audio files to Supabase Storage
 * 3. Creates a new series record
 * 4. Creates 10 episode records linked to the series
 *
 * Usage:
 *   npx tsx scripts/upload-infinite-loop.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://ihfaoksiurmucryfzfvd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'sb_secret_HR5YZxJ2j0PmWExOQySlTA_hBc_B1Hy';

const BUCKET_NAME = 'audio';
const AUDIO_DIR = '/data/user/work/audio-infinite-loop';
const STORAGE_PATH_PREFIX = 'series/infinite-loop';

const COVER_IMAGE_URL =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=600&fit=crop&q=80';
const COVER_LOCAL_PATH = '/data/user/work/infinite-loop-cover.jpg';
const COVER_STORAGE_PATH = 'covers/infinite-loop.jpg';

// ---------------------------------------------------------------------------
// Episode metadata
// ---------------------------------------------------------------------------

const EPISODES_META = [
  { episode_number: 1, title: 'Never Log Out',
    description: 'Kai, a top-ranked solo player, logs into Aetherworld Online on the night of its scheduled shutdown. When the server fails to close, a red system message reveals the terrifying truth: 10,247 players are trapped, and death in the game means death in reality.',
    duration_seconds: 220 },
  { episode_number: 2, title: 'The Bug Hunter',
    description: 'In the chaos following the lockdown, Kai ventures into the Whispering Wasteland and discovers a mysterious crack in reality. Approaching it unlocks a unique hidden class — the Glitch Exploiter — granting him the ability to see code anomalies no other player can perceive.',
    duration_seconds: 253 },
  { episode_number: 3, title: 'The Priest That Shouldn\'t Exist',
    description: 'Kai encounters Lyra, a level 58 priest whose movement is too perfect for a player and whose character panel is blank. She claims she can also see code distortions and hints that she knows how to escape the deadly game.',
    duration_seconds: 228 },
  { episode_number: 4, title: 'The Price of Trust',
    description: 'Lyra reveals she is the daughter of Chen Mingyuan, Aetherworld Online\'s founder. She explains that her father\'s hidden modifications prevented the server from truly shutting down, and she needs a Glitch Exploiter to find the back door he left in the game\'s core.',
    duration_seconds: 236 },
  { episode_number: 5, title: 'Boss Fights Start with Bugs',
    description: 'Kai and Lyra enter the Void Abyss endgame zone. Against the Abyss Guardian, a level 100 elite boss designed for 20-player raids, Kai uses his Glitch Exploiter vision to find dead zones in the boss\'s hitbox — attacking from gaps that shouldn\'t exist.',
    duration_seconds: 230 },
  { episode_number: 6, title: 'Heartbeat',
    description: 'After killing the Abyss Guardian and extracting the first key, Lyra warns that the extraction has triggered an alarm. The game\'s GM patrol system is materializing to hunt them. Together they race toward the second boss — the Thousand-Faced Tyrant.',
    duration_seconds: 259 },
  { episode_number: 7, title: 'Beneath a Thousand Faces',
    description: 'The Thousand-Faced Tyrant can pixel-perfectly copy any character. Kai lets it copy his Glitch Exploiter class, causing the boss to destabilize. He plunges into the collapsing code to extract the second key, risking permanent neural damage.',
    duration_seconds: 246 },
  { episode_number: 8, title: 'On the Edge of Collapse',
    description: 'Kai awakens from an eleven-minute coma caused by the code flood. Lyra, who depleted all her resources resurrecting him three times, struggles to hide her growing feelings as they head toward the Infinite Corridor for the third key.',
    duration_seconds: 245 },
  { episode_number: 9, title: 'The Infinite Corridor and the Last Secret',
    description: 'In a maze dungeon that shouldn\'t exist, Lyra reveals the truth: she is an NPC, an AI copy of the creator\'s daughter, flagged as undeletable. Her father built this maze for her. Kai accepts her completely, and together they find the third key.',
    duration_seconds: 254 },
  { episode_number: 10, title: 'The Last Login',
    description: 'With the security protocol closing in, Lyra reveals the final two keys are embedded in her core code. Using them will erase all her memories. Kai promises to make her fall in love with him again from scratch. They open the back door, freeing all 10,247 players — at the cost of Lyra\'s memories.',
    duration_seconds: 337 },
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
  console.log('=== LevelUp Audio - Upload "Infinite Loop: The Last Login" ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Audio dir:    ${AUDIO_DIR}`);
  console.log(`Storage path: ${BUCKET_NAME}/${STORAGE_PATH_PREFIX}/\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // -----------------------------------------------------------------------
  // Step 0: Download cover image and upload to Supabase Storage
  // -----------------------------------------------------------------------
  console.log('--- Step 0: Download and upload cover image ---');

  console.log(`  Downloading cover from Unsplash...`);
  execSync(
    `curl -sL -o "${COVER_LOCAL_PATH}" "${COVER_IMAGE_URL}"`,
    { stdio: 'pipe' },
  );

  if (!existsSync(COVER_LOCAL_PATH)) {
    console.error('  ERROR: Failed to download cover image.');
    process.exit(1);
  }

  const coverBuffer = readFileSync(COVER_LOCAL_PATH);
  console.log(`  Cover image size: ${(coverBuffer.length / 1024).toFixed(1)} KB`);

  // Upload cover to storage
  const { error: coverUploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(COVER_STORAGE_PATH, coverBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (coverUploadError) {
    console.error(`  ERROR uploading cover: ${coverUploadError.message}`);
    var coverUrl = COVER_IMAGE_URL;
  } else {
    const { data: coverUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(COVER_STORAGE_PATH);
    var coverUrl = coverUrlData.publicUrl;
    console.log(`  Cover uploaded -> ${coverUrl}`);
  }

  // Clean up local cover file
  if (existsSync(COVER_LOCAL_PATH)) {
    unlinkSync(COVER_LOCAL_PATH);
  }

  console.log();

  // -----------------------------------------------------------------------
  // Step 1: Query the genres table for litrpg UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'litrpg');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "litrpg" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found litrpg genre: ${genreId}\n`);

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
      title: 'Infinite Loop: The Last Login',
      description:
        'Trapped in a dying MMO where death means real death, a hardcore gamer discovers a unique class that lets him exploit glitches no one else can see. Together with a mysterious healer hiding a world-shaking secret, he must clear the final raid that never existed — or die trying.',
      author: 'Max Thunder',
      cover_url: coverUrl,
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['gaming', 'death-game', 'glitch', 'romance'],
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
  const startDate = now;

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

    // Get actual duration from ffprobe
    const fileName = `ep${String(ep.episode_number).padStart(2, '0')}.mp3`;
    const localPath = resolve(AUDIO_DIR, fileName);
    let actualDuration = ep.duration_seconds;
    try {
      const durationOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${localPath}"`,
        { encoding: 'utf-8', stdio: 'pipe' },
      ).trim();
      actualDuration = Math.round(parseFloat(durationOutput));
    } catch {
      console.log(`  Warning: Could not get duration for ${fileName}, using default.`);
    }

    const audioSizeBytes = existsSync(localPath) ? readFileSync(localPath).length : 0;

    const { error: epError } = await supabase.from('episodes').insert({
      id: epId,
      series_id: seriesId,
      title: ep.title,
      description: ep.description,
      episode_number: ep.episode_number,
      season_number: 1,
      duration_seconds: actualDuration,
      audio_url: audioUrl,
      audio_size_bytes: audioSizeBytes,
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
        `  Ep${String(ep.episode_number).padStart(2, '0')}: "${ep.title}"${freeLabel} — ${actualDuration}s — ${formatDate(releasedAt).split('T')[0]}`,
      );
    }

    await sleep(100);
  }

  console.log(`\nCreated ${episodesCreated}/10 episodes.\n`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('=== Summary ===');
  console.log(`Series created:  Infinite Loop: The Last Login (${seriesId})`);
  console.log(`Genre:           litrpg (${genreId})`);
  console.log(`Cover:           ${coverUrl}`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
