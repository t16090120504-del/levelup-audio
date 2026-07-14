/**
 * LevelUp Audio - Upload "Midnight Protocol" Series to Supabase
 *
 * 1. Downloads cover image and uploads to Supabase Storage
 * 2. Uploads 10 audio files to Supabase Storage
 * 3. Creates a new series record
 * 4. Creates 10 episode records linked to the series
 *
 * Usage:
 *   npx tsx scripts/upload-midnight-protocol.ts
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
const AUDIO_DIR = '/data/user/work/audio-midnight-protocol';
const STORAGE_PATH_PREFIX = 'series/midnight-protocol';

const COVER_IMAGE_URL =
  'https://images.unsplash.com/photo-1514533212735-5df27d3a9860?w=600&h=600&fit=crop&q=80';
const COVER_LOCAL_PATH = '/data/user/work/midnight-protocol-cover.jpg';
const COVER_STORAGE_PATH = 'covers/midnight-protocol.jpg';

// ---------------------------------------------------------------------------
// Episode metadata (from midnight-protocol-season1.md)
// ---------------------------------------------------------------------------

const EPISODES_META = [
  { episode_number: 1, title: 'The Cleanup', description: 'Rule one of supernatural cleanup: never touch the blood. Alex Reyes is a Cleaner for Meridian Technologies, the company that hides magical incidents from the public eye. When a Level 4 Ghoul Manifestation at a downtown Seattle Chipotle leaves behind an unknown symbol, Alex realizes something impossible is happening.', duration_seconds: 216 },
  { episode_number: 2, title: 'The Researcher', description: 'At his 7 AM debrief, Alex meets Dr. Sarah Chen — Meridian\'s lead researcher and the most frustrating person he\'s ever met. She reveals the ceiling symbol isn\'t from any known magical taxonomy. Someone is synthesizing entirely new supernatural entities, and the escalation is accelerating.', duration_seconds: 251 },
  { episode_number: 3, title: 'The Pattern', description: 'Alex and Sarah investigate seven incident sites across Seattle and discover a terrifying pattern: all manifestations occur during Meridian\'s system-wide backup windows. The evidence points to someone inside the building — someone with high-level access using Sub-Level 5 as a secret lab.', duration_seconds: 262 },
  { episode_number: 4, title: 'Sub-Level 5', description: 'During a midnight infiltration of Meridian Tower, Alex and Sarah breach decommissioned Bay 11 and find a hidden cathedral of glowing fractal symbols. At its center, Director James Hargrove — Alex\'s boss\'s boss — is standing before a sphere of darkness, chanting in an impossible language.', duration_seconds: 244 },
  { episode_number: 5, title: 'The Director', description: 'Hargrove reveals his secret project: he\'s been building synthetic supernatural entities as weapons against the Old Powers — primordial entities that predate all human magical systems. But one of his creations isn\'t a prototype. The sphere of darkness found him. And it\'s something else entirely.', duration_seconds: 269 },
  { episode_number: 6, title: 'The Nameless', description: 'The containment chamber shatters and the sphere of darkness expands — an entity that predates the Old Powers themselves. It calls itself the Nameless and speaks directly into their bones. It doesn\'t want to destroy. It wants to understand what it means to be small, contained, limited.', duration_seconds: 248 },
  { episode_number: 7, title: 'Stakeout', description: 'After escaping Sub-Level 5, Alex and Sarah spend two weeks on off-the-books stakeouts. Their partnership deepens into something more than professional. But on the fourteenth day, ORACLE detects a new fractal symbol — at Sarah\'s registered apartment address.', duration_seconds: 208 },
  { episode_number: 8, title: 'The Mark', description: 'Sarah discovers the Nameless has marked her apartment as a second anchor point — and her own forearm bears the fractal pattern like a tattoo she never chose. She\'s become a conduit, a bridge between the Nameless and the physical world. Alex must decide how far he\'ll go to protect her.', duration_seconds: 247 },
  { episode_number: 9, title: 'The Convergence', description: 'The Nameless manifests at Pike Place Market at noon on a Saturday — thousands of witnesses, cameras everywhere. Its human suit is almost complete. If Alex and Sarah can\'t disrupt the ley line convergence in twenty minutes, the Nameless becomes permanently physical and no cover-up can undo the damage.', duration_seconds: 245 },
  { episode_number: 10, title: 'Protocol Midnight', description: 'In the climactic confrontation, Sarah completes the synthesis matrix — giving the Nameless the defined form, rules, and limitations it asked for. The entity is contained. Meridian covers everything up. And on the roof of Meridian Tower, Alex and Sarah find something worth protecting.', duration_seconds: 400 },
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
  console.log('=== LevelUp Audio - Upload "Midnight Protocol" ===\n');
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
  // Step 1: Query the genres table for urban-fantasy UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'urban-fantasy');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "urban-fantasy" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found urban-fantasy genre: ${genreId}\n`);

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
      title: 'Midnight Protocol',
      description:
        'Alex Reyes works at Meridian Technologies, a tech company that secretly cleans up supernatural incidents. When entities that shouldn\'t exist start appearing across Seattle, Alex\'s investigation leads him to suspect someone inside Meridian is creating them. His only ally is Dr. Sarah Chen, the brilliant lead researcher with her own reasons for wanting the truth.',
      author: 'James Blackwood',
      cover_url: coverUrl,
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['supernatural', 'conspiracy', 'cleaner', 'romance'],
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
  console.log(`Series created:  Midnight Protocol (${seriesId})`);
  console.log(`Genre:           urban-fantasy (${genreId})`);
  console.log(`Cover:           ${coverUrl}`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
