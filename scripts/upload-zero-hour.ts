/**
 * LevelUp Audio - Upload "Zero Hour: The Unregistered" Series to Supabase
 *
 * 1. Downloads cover image and uploads to Supabase Storage
 * 2. Uploads 10 audio files to Supabase Storage
 * 3. Creates a new series record
 * 4. Creates 10 episode records linked to the series
 *
 * Usage:
 *   npx tsx scripts/upload-zero-hour.ts
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
const AUDIO_DIR = '/data/user/work/audio-zero-hour';
const STORAGE_PATH_PREFIX = 'series/zero-hour';

const COVER_IMAGE_URL =
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&h=600&fit=crop&q=80';
const COVER_LOCAL_PATH = '/data/user/work/zero-hour-cover.jpg';
const COVER_STORAGE_PATH = 'covers/zero-hour.jpg';

// ---------------------------------------------------------------------------
// Episode metadata
// ---------------------------------------------------------------------------

const EPISODES_META = [
  { episode_number: 1, title: 'Manifestation',
    description: 'My powers manifested on a Tuesday. Working the night shift at a convenience store, a robbery triggered something inside me — the ability to freeze time for everything within a thirty-meter radius. I spent two weeks reading the registration contract. Two hundred and fourteen pages. After reading about mandatory power suppression and indefinite confinement, I made my decision: I will never sign.',
    duration_seconds: 211 },
  { episode_number: 2, title: 'Zero Hour',
    description: 'I became Zero because I couldn\'t think of anything less threatening. My first act as a vigilante: stopping a mugging with three seconds of frozen time. Word spread in the neighborhoods. The government noticed. Then a DHR agent appeared at 2 AM with a warning: Aurora, a Class-7 registered hero, was already in the city — and she never failed a capture.',
    duration_seconds: 269 },
  { episode_number: 3, title: 'The Hunt',
    description: 'Aurora found me on the fourth night — golden armor blazing, energy wings spread wide. She cornered me at the waterfront, but something unexpected happened: she was partially resistant to my temporal freeze. Moving at one-tenth speed through my power, she chose not to capture me. She asked why I didn\'t register. I asked if she\'d read Clause 23. She told me to run.',
    duration_seconds: 292 },
  { episode_number: 4, title: 'Diana',
    description: 'Elena Voss, an ex-registered hero, revealed the truth about Aurora\'s real identity — Diana Park, Captain Stellar\'s daughter. She showed me the suppression records: fifty-three registered heroes who entered the system and never came out. No trials. No public records. When Diana found me on a rooftop three nights later, she said she wanted to know the truth.',
    duration_seconds: 299 },
  { episode_number: 5, title: 'The List',
    description: 'Diana and I examined the suppression list together. Forty-seven of fifty-three suppressed heroes had no documented instability — they\'d simply disagreed with their sponsors. Refused a deployment. Challenged orders. The suppression system wasn\'t safety — it was a disciplinary tool. Diana realized she\'d been a weapon pointed at anyone who questioned the system.',
    duration_seconds: 264 },
  { episode_number: 6, title: 'The Network',
    description: 'Elena introduced us to the Network — thirty-seven unregistered heroes in the city alone. Their leader, Thomas Gray, was a former Class-4 telekinetic suppressed for two years before escaping. He explained that suppression destroys more than powers: it erodes memory, emotion, and identity. Diana learned her father was still alive in a facility outside Reno — but not free.',
    duration_seconds: 229 },
  { episode_number: 7, title: 'The Bridge',
    description: 'During two weeks of planning, something changed between Diana and me. On a rooftop on the eleventh night, she admitted she was scared — of losing everything she\'d known since she was sixteen. I told her she was more than her registration. She leaned against me, and in the silence between two people about to burn everything down, she kissed me.',
    duration_seconds: 203 },
  { episode_number: 8, title: 'Blacksite Meridian',
    description: 'We assaulted Blacksite Meridian at 3 AM, during a ninety-second security gap. Elena knew the layout. Diana moved without her armor — focused, raw, crackling with energy. In the suppression wing, we found Captain Stellar in a medical pod — gaunt, foggy-eyed, barely conscious. He looked at me past the ski mask and said: take care of her. Then the alarms started.',
    duration_seconds: 227 },
  { episode_number: 9, title: 'Unmasked',
    description: 'Ninety seconds wasn\'t enough. We freed thirty-one of forty-seven prisoners before defense systems came back online. Diana held the corridor alone against six Class-5 heroes while I evacuated the freed prisoners. When I ran back to help her, she pulled off her mask and broadcast on every frequency: her name, the truth about suppression, and her defiance.',
    duration_seconds: 238 },
  { episode_number: 10, title: 'Unregistered',
    description: 'The government spun Diana\'s defection as a mental break. The suppression order went out within hours. But the freed heroes started talking — halting, painful testimonies that went viral on underground platforms. Legal challenges mounted. Registered heroes questioned their contracts. Underground, Diana squeezed my hand and said: we show up when things get bad, we fix them, and we don\'t stop.',
    duration_seconds: 347 },
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
  console.log('=== LevelUp Audio - Upload "Zero Hour: The Unregistered" ===\n');
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
  // Step 1: Query the genres table for superhero UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'superhero');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "superhero" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found superhero genre: ${genreId}\n`);

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
      title: 'Zero Hour: The Unregistered',
      description:
        'In a world where superheroes must register with the government or become fugitives, Jake Park manifested the ability to freeze time and refused to sign away his rights. Operating as the vigilante "Zero," he becomes the most wanted unregistered hero in the country — until the system\'s golden girl, Aurora, is sent to capture him and discovers the truth she was never meant to find.',
      author: 'K. Atlas',
      cover_url: coverUrl,
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['superhero', 'vigilante', 'government', 'romance'],
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
  console.log(`Series created:  Zero Hour: The Unregistered (${seriesId})`);
  console.log(`Genre:           superhero (${genreId})`);
  console.log(`Cover:           ${coverUrl}`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
