/**
 * LevelUp Audio - Upload "The Corporate Ascendant" Series to Supabase
 *
 * 1. Downloads cover image and uploads to Supabase Storage
 * 2. Uploads 10 audio files to Supabase Storage
 * 3. Creates a new series record
 * 4. Creates 10 episode records linked to the series
 *
 * Usage:
 *   npx tsx scripts/upload-corporate.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
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
const AUDIO_DIR = '/data/user/work/audio-corporate';
const STORAGE_PATH_PREFIX = 'series/corporate-ascendant';

const COVER_IMAGE_URL =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=600&fit=crop&q=80';
const COVER_LOCAL_PATH = '/data/user/work/corporate-cover.jpg';
const COVER_STORAGE_PATH = 'covers/corporate-ascendant.jpg';

// ---------------------------------------------------------------------------
// Episode metadata (from corporate-ascendant-season1.md)
// ---------------------------------------------------------------------------

const EPISODES_META = [
  { episode_number: 1, title: 'The Fall',           description: 'Marcus Chen is the youngest VP at Apex Technologies — until CEO Richard Huang frames him for a $47 million embezzlement scheme in a single devastating afternoon. His career, reputation, and relationship are destroyed overnight.', duration_seconds: 280 },
  { episode_number: 2, title: 'Rock Bottom',       description: 'Three months after his fall, Marcus is sleeping in his car, blacklisted from every tech company. Then a letter arrives from a grandfather he never knew — bequeathing him a $3.2 billion empire and a mysterious AI-powered smartwatch.', duration_seconds: 257 },
  { episode_number: 3, title: 'First Move',        description: 'The watch awakens with ARIA, an advanced AI built by his grandfather. She reveals Richard Huang\'s real embezzlement scheme and guides Marcus to his first profitable trade — earning $512,000 and catching the attention of a dangerous rival.', duration_seconds: 272 },
  { episode_number: 4, title: 'The Rival',          description: 'Elena Park, the "Ice Queen" of Meridian Industries, confronts Marcus about his suspiciously brilliant trades. Both are targeting the same acquisition — Helios Digital — and neither is willing to share.', duration_seconds: 247 },
  { episode_number: 5, title: 'Uneasy Alliance',    description: 'Richard Huang enters the Helios bidding war through his secret partnership with Meridian Industries. Elena discovers her own CEO has been planning to sideline her. She crosses enemy lines to join Marcus.', duration_seconds: 244 },
  { episode_number: 6, title: 'The Sting',          description: 'At the Catalyst Annual Gala, Marcus and Elena execute a meticulously planned operation. Marcus takes the stage and publicly exposes Richard Huang\'s $180 million fraud — with ARIA\'s evidence displayed on every screen in the venue.', duration_seconds: 276 },
  { episode_number: 7, title: 'Building an Empire', description: 'Richard is indicted and Marcus becomes a media sensation. Elena joins Vanguard as COO. Together they aggressively expand the company while their partnership evolves from professional to something more complicated.', duration_seconds: 243 },
  { episode_number: 8, title: 'The Counterattack',  description: 'Richard Huang fights back with a $200 million defamation suit, a coordinated smear campaign, and a mole inside Vanguard. The company has seven months of runway left before it runs out of cash.', duration_seconds: 257 },
  { episode_number: 9, title: 'All In',             description: 'Elena secures $350 million from Citadel Capital. They launch Atlas, a revolutionary AI financial platform that gets 500,000 signups on day one. The DOJ hits Richard with a superseding indictment.', duration_seconds: 244 },
  { episode_number: 10, title: 'The Summit',        description: 'Richard Huang is convicted on all counts and sentenced to fourteen years. Vanguard\'s IPO raises $4.8 billion, making Marcus a billionaire. And in a quiet moment at the office, he proposes to Elena.', duration_seconds: 319 },
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
  console.log('=== LevelUp Audio - Upload "The Corporate Ascendant" ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Audio dir:    ${AUDIO_DIR}`);
  console.log(`Storage path: ${BUCKET_NAME}/${STORAGE_PATH_PREFIX}/\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // -----------------------------------------------------------------------
  // Step 0: Download cover image and upload to Supabase Storage
  // -----------------------------------------------------------------------
  console.log('--- Step 0: Download and upload cover image ---');

  // Download cover image
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
    // Continue without cover — we'll use a fallback
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
  // Step 1: Query the genres table for workplace-power-fantasy UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'workplace-power-fantasy');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "workplace-power-fantasy" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found workplace-power-fantasy genre: ${genreId}\n`);

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
      title: 'The Corporate Ascendant',
      description:
        'Framed for embezzlement and stripped of everything, Marcus Chen discovers an inheritance that gives him an AI-powered edge in the corporate world. Together with his former rival Elena Park, he builds an empire and takes down the man who destroyed his life.',
      author: 'Victoria Chen',
      cover_url: coverUrl,
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['corporate', 'revenge', 'business', 'romance'],
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
  const startDate = now; // Starting from today

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
  // Summary
  // -----------------------------------------------------------------------
  console.log('=== Summary ===');
  console.log(`Series created:  The Corporate Ascendant (${seriesId})`);
  console.log(`Genre:           workplace-power-fantasy (${genreId})`);
  console.log(`Cover:           ${coverUrl}`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
