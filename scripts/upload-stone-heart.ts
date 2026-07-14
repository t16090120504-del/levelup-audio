/**
 * LevelUp Audio - Upload "Stone Heart: Dungeon Core Awakening" Series to Supabase
 *
 * 1. Downloads cover image and uploads to Supabase Storage
 * 2. Uploads 10 audio files to Supabase Storage
 * 3. Creates a new series record
 * 4. Creates 10 episode records linked to the series
 *
 * Usage:
 *   npx tsx scripts/upload-stone-heart.ts
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
const AUDIO_DIR = '/data/user/work/audio-stone-heart';
const STORAGE_PATH_PREFIX = 'series/stone-heart';

const COVER_IMAGE_URL =
  'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600&h=600&fit=crop&q=80';
const COVER_LOCAL_PATH = '/data/user/work/stone-heart-cover.jpg';
const COVER_STORAGE_PATH = 'covers/stone-heart.jpg';

// ---------------------------------------------------------------------------
// Episode metadata (from stone-heart-season1.md)
// ---------------------------------------------------------------------------

const EPISODES_META = [
  { episode_number: 1, title: 'The First Stone',        description: 'A dying architect named Marcus Cole wakes up reincarnated as a dungeon core — a sentient crystal buried deep underground, charged with building labyrinths and spawning monsters. His first instinct is not to kill, but to design.' },
  { episode_number: 2, title: 'The First Delver',       description: 'A party of three novice adventurers enters the dungeon. Among them is a rogue named Mira whose movement patterns feel hauntingly familiar. She recognizes the architectural intent behind the dungeon design.' },
  { episode_number: 3, title: 'Expansions',             description: 'Marcus ignores standard dungeon blueprints and builds a Sunken Garden with flowing rivers, crystal formations, and designed creatures. Mira returns alone and dismantles Floor 2, calling the builder an artist.' },
  { episode_number: 4, title: "The Architect's Name",   description: 'Mira becomes a regular visitor. Marcus builds Floor 3 — a Shifting Gallery of rotating corridors and optical illusions — tailored to her rogue abilities. He places a crystalline white lily among the treasure, and she speaks of the architect she lost.' },
  { episode_number: 5, title: 'Layers Below',           description: 'Memories crash through Marcus — Mira was his fiancee. He realizes she is the woman who held his hand as he died. Now he must protect her from the dungeon he built, knowing the truth could trap her inside forever.' },
  { episode_number: 6, title: 'The Challenger',          description: 'A guild team from Shadowhand Company attacks the dungeon. Their mage pinpoints the core location before dying. Marcus learns he is being hunted — dungeon core crystals are worth a fortune on the black market.' },
  { episode_number: 7, title: 'The Bond',                description: 'Mira races to the dungeon after hearing about the attack. She finds the crystalline flowers Marcus has been leaving and realizes the dungeon is in love with someone. He builds her a secret sanctuary — a room that says everything he cannot.' },
  { episode_number: 8, title: 'The Harvesters',          description: 'Shadowhand Company returns with twenty delvers led by Gerrick Vane, a Level 18 Paladin called "The Corebreaker." As Vane smashes through the dungeon floors, Marcus creates an emergency escape route to save Mira.' },
  { episode_number: 9, title: 'The Collapse',            description: 'Vane reaches the core chamber. With defenses depleted, the Architect\'s Eye offers an impossible choice: evolve into a humanoid form — losing all seven floors — or be harvested. Marcus chooses to become human again.' },
  { episode_number: 10, title: 'Home',                  description: 'Marcus bursts from the earth in a crystalline human body. Mira recognizes him instantly. Together they fight Vane using architecture as warfare — walls, platforms, and chokepoints. They win, and begin planning to rebuild together.' },
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

function getDurationSeconds(mp3Path: string): number {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3Path}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return Math.round(parseFloat(output.trim()));
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== LevelUp Audio - Upload "Stone Heart: Dungeon Core Awakening" ===\n');
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

  if (existsSync(COVER_LOCAL_PATH)) {
    unlinkSync(COVER_LOCAL_PATH);
  }

  console.log();

  // -----------------------------------------------------------------------
  // Step 1: Query the genres table for dungeon-core UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'dungeon-core');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "dungeon-core" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found dungeon-core genre: ${genreId}\n`);

  // -----------------------------------------------------------------------
  // Step 2: Upload 10 audio files to Supabase Storage
  // -----------------------------------------------------------------------
  console.log('--- Step 2: Upload audio files ---');
  const uploadedUrls: Record<number, string> = {};
  const durations: Record<number, number> = {};

  for (const ep of EPISODES_META) {
    const fileName = `ep${String(ep.episode_number).padStart(2, '0')}.mp3`;
    const localPath = resolve(AUDIO_DIR, fileName);
    const storagePath = `audio/${STORAGE_PATH_PREFIX}/${fileName}`;

    if (!existsSync(localPath)) {
      console.error(`  ERROR: File not found: ${localPath}`);
      console.error(`  Skipping episode ${ep.episode_number}`);
      continue;
    }

    const fileBuffer = readFileSync(localPath);
    const duration = getDurationSeconds(localPath);
    durations[ep.episode_number] = duration;

    console.log(
      `  Uploading ep${String(ep.episode_number).padStart(2, '0')}.mp3 (${(fileBuffer.length / 1024).toFixed(1)} KB, ${duration}s)...`,
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
      title: 'Stone Heart: Dungeon Core Awakening',
      description:
        'A dying architect wakes up reincarnated as a dungeon core — a sentient crystal buried deep underground, charged with building labyrinths, spawning monsters, and defending against adventurers. He thinks like an architect, not a predator, building dungeons of lethal beauty. Among the delvers is Mira, a rogue who was his fiancee in his previous life. She does not know the dungeon she loves is the man she lost.',
      author: 'D. Shadowmere',
      cover_url: coverUrl,
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['dungeon', 'reincarnation', 'architecture', 'romance'],
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
      now + (ep.episode_number - 1) * ONE_DAY_MS,
    );

    const epId = crypto.randomUUID();
    const duration = durations[ep.episode_number] ?? 0;

    const { error: epError } = await supabase.from('episodes').insert({
      id: epId,
      series_id: seriesId,
      title: ep.title,
      description: ep.description,
      episode_number: ep.episode_number,
      season_number: 1,
      duration_seconds: duration,
      audio_url: audioUrl,
      audio_size_bytes: existsSync(resolve(AUDIO_DIR, `ep${String(ep.episode_number).padStart(2, '0')}.mp3`))
        ? readFileSync(resolve(AUDIO_DIR, `ep${String(ep.episode_number).padStart(2, '0')}.mp3`)).length
        : 0,
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
        `  Ep${String(ep.episode_number).padStart(2, '0')}: "${ep.title}"${freeLabel} — ${duration}s — ${formatDate(releasedAt).split('T')[0]}`,
      );
    }

    await sleep(100);
  }

  console.log(`\nCreated ${episodesCreated}/10 episodes.\n`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('=== Summary ===');
  console.log(`Series created:  Stone Heart: Dungeon Core Awakening (${seriesId})`);
  console.log(`Genre:           dungeon-core (${genreId})`);
  console.log(`Cover:           ${coverUrl}`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
