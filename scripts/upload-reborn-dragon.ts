/**
 * LevelUp Audio - Upload "Reborn as a Dragon: The Hidden Prince" Series to Supabase
 *
 * 1. Downloads cover image and uploads to Supabase Storage
 * 2. Uploads 10 audio files to Supabase Storage
 * 3. Creates a new series record
 * 4. Creates 10 episode records linked to the series
 *
 * Usage:
 *   npx tsx scripts/upload-reborn-dragon.ts
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
const AUDIO_DIR = '/data/user/work/audio-reborn-dragon';
const STORAGE_PATH_PREFIX = 'series/reborn-dragon';

const COVER_IMAGE_URL =
  'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=600&h=600&fit=crop&q=80';
const COVER_LOCAL_PATH = '/data/user/work/reborn-dragon-cover.jpg';
const COVER_STORAGE_PATH = 'covers/reborn-dragon.jpg';

// ---------------------------------------------------------------------------
// Episode metadata (from reborn-dragon-season1.md)
// ---------------------------------------------------------------------------

const EPISODES_META = [
  { episode_number: 1, title: 'The Train and the Flame',       description: 'Ryu Tanaka, a 32-year-old salaryman, dies in a train accident and wakes up as a baby dragon in a crystal cavern. A ghostly echo of the Dragon King tells him the Demon King stirs and only dragonfire can stop him.' },
  { episode_number: 2, title: 'Human Skin',                   description: 'After learning to survive as a dragon, Ryu discovers his transformation ability by accident. He takes human form and heads toward the Royal Academy in Solaris, hiding his dragon nature from a world that believes his kind is extinct.' },
  { episode_number: 3, title: 'The Academy of Solaris',       description: 'Ryu enrolls at the Royal Academy under a fake noble identity. During the entrance exam, his dragon senses help him survive five rounds against a trained duelist — drawing the attention of Princess Seraphina.' },
  { episode_number: 4, title: 'The Warrior Princess',          description: 'Princess Seraphina confronts Ryu about his mysterious abilities. She warns him about Academy politics and the dangerous noble Cassian, but Ryu finds himself drawn to her violet eyes and the exhaustion she hides behind her warrior\'s composure.' },
  { episode_number: 5, title: 'Fire Beneath the Skin',        description: 'Dragon instincts simmer beneath Ryu\'s human disguise, causing smoke and heat leaks. Seraphina notices his secrets — his accent, his instinctive fighting style, something primal. She vows to uncover the truth.' },
  { episode_number: 6, title: "The Dungeon's Breath",         description: 'During a dungeon exam, Ryu\'s team encounters a drake — a dragon-kin creature. The drake recognizes Ryu\'s bloodline and kneels before him, muttering "Blood of the King. I obey." Seraphina sees everything.' },
  { episode_number: 7, title: 'Ash and Truth',               description: 'Ryu\'s control crumbles. He partially transforms in front of Seraphina, revealing scales and claws. Then the full transformation takes hold — fifteen meters of midnight dragon. Instead of reporting him, Seraphina touches his snout and says she needs him.' },
  { episode_number: 8, title: "The Demon's Shadow",          description: 'Seraphina reveals the Demon King\'s seal is failing. Only dragonfire can reinforce it. On the rooftop under twin suns, Ryu tells her everything — the train, Tokyo, his old life. She keeps his secret and calls him by his real name.' },
  { episode_number: 9, title: 'Scales and Kisses',           description: 'Nightly training sessions strengthen Ryu\'s dragon form and his bond with Seraphina. After a breath weapon accident leaves him injured, she kisses him on the armory floor. They promise to fight the Demon King side by side.' },
  { episode_number: 10, title: 'The Last Dragon Rises',       description: 'The seal breaks. Demon forces march toward Solaris. An ancient ritual requires Ryu\'s full dragon form and Seraphina\'s holy power — but it may kill him. Together, they face the Demon King\'s army as the last dragon rises.', },
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
  console.log('=== LevelUp Audio - Upload "Reborn as a Dragon: The Hidden Prince" ===\n');
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
  // Step 1: Query the genres table for isekai UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'isekai');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "isekai" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found isekai genre: ${genreId}\n`);

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
      title: 'Reborn as a Dragon: The Hidden Prince',
      description:
        'An overworked salaryman dies in a train accident and wakes up as a baby dragon in a fantasy world where his kind was declared extinct 500 years ago. With the power to take human form, he enrolls in a warrior academy and falls for the princess destined to fight the Demon King — the same enemy who exterminated the dragons.',
      author: 'Aria Stormwind',
      cover_url: coverUrl,
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['dragon', 'academy', 'demon-king', 'romance'],
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
  console.log(`Series created:  Reborn as a Dragon: The Hidden Prince (${seriesId})`);
  console.log(`Genre:           isekai (${genreId})`);
  console.log(`Cover:           ${coverUrl}`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
