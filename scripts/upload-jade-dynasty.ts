/**
 * LevelUp Audio - Upload "Jade Dynasty: The Forbidden Meridian" Series to Supabase
 *
 * 1. Downloads cover image and uploads to Supabase Storage
 * 2. Uploads 10 audio files to Supabase Storage
 * 3. Creates a new series record
 * 4. Creates 10 episode records linked to the series
 *
 * Usage:
 *   npx tsx scripts/upload-jade-dynasty.ts
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
const AUDIO_DIR = '/data/user/work/audio-jade-dynasty';
const STORAGE_PATH_PREFIX = 'series/jade-dynasty';

const COVER_IMAGE_URL =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=600&fit=crop&q=80';
const COVER_LOCAL_PATH = '/data/user/work/jade-dynasty-cover.jpg';
const COVER_STORAGE_PATH = 'covers/jade-dynasty.jpg';

// ---------------------------------------------------------------------------
// Episode metadata (from jade-dynasty-season1.md)
// ---------------------------------------------------------------------------

const EPISODES_META = [
  { episode_number: 1, title: 'Cripple and Phoenix',           description: 'Yun Fei, a crippled servant at Azure Cloud Sect born with sealed meridians, discovers a dying phoenix in the Spirit Herb Garden. As the phoenix merges with his soul, his meridians unseal — revealing the legendary Nine Heavens Physique unseen in 10,000 years. But the phoenix\'s last words warn him: "They will come for you."' },
  { episode_number: 2, title: 'Nine Heavens Physique',       description: 'Three golden pillars of light from the Celestial Court descend upon Azure Cloud Sect, searching for the Nine Heavens Physique. Yun Fei secretly cultivates for three days, breaking through to Qi Condensation Layer 3 in record time. When outer disciple Zhao Ping bullies him, golden flames erupt from Yun Fei\'s palm — catching the attention of Senior Sister Mei Lingxue.' },
  { episode_number: 3, title: 'Cold Plum, Sharp as Blade',    description: 'Mei Lingxue — the sect\'s top inner disciple — detects the spiritual energy fluctuations around Yun Fei. She examines his meridians and discovers the golden walls of the Nine Heavens Physique. Against all convention, she orders him to take the outer disciple entrance examination in three days, drawing the attention of the entire sect.' },
  { episode_number: 4, title: 'Entrance Examination',          description: 'At the entrance examination, Yun Fei places his hand on the Spirit Testing Stone. It explodes — a nine-layer spiritual vortex erupts, revealing his Nine Heavens Physique to everyone. Before the sect can celebrate, a voice from the heavens declares: "The Nine Heavens Physique has appeared. Celestial Court decree — surrender him immediately."' },
  { episode_number: 5, title: 'Falling Plum, Breaking Sword', description: 'A Celestial Court enforcer descends, wielding heavenly lightning. The Sect Master kneels, ready to surrender Yun Fei. But Mei Lingxue steps forward with her Cold Plum Sword, declaring Yun Fei as her junior brother. When the enforcer strikes, Yun Fei blocks with phoenix flames — and survives a blow from a Nascent Soul-level being.' },
  { episode_number: 6, title: 'Meridian Awakening',           description: 'Yun Fei falls unconscious after blocking the heavenly lightning. He wakes three days later in the inner sect healing hall with Mei Lingxue watching over him. She explains the truth about the Nine Heavens Physique — the Celestial Court\'s founding ancestor possessed it, and they believe it belongs to them. His meridians, tempered by heavenly lightning, grow stronger than ever.' },
  { episode_number: 7, title: 'Heart Blockade',               description: 'Yun Fei\'s cultivation skyrockets to Qi Condensation Layer 8 in ten days, but his mental state becomes his bottleneck. Fear and urgency block his breakthrough. Late one night at the waterfall, he glimpses Mei Lingxue cultivating in the moonlight. In that moment of clarity, he breaks through to Layer 9 — realizing he wants to live, not just to survive, but to stand beside her.' },
  { episode_number: 8, title: 'Demon Beast Tide',             description: 'A massive demon beast tide assaults Azure Cloud Sect. Yun Fei saves his former bully Zhao Ping and single-handedly holds a breach in the defense line with phoenix flames. When a Foundation Establishment-level Flame Jiao breaks through to the Spirit Herb Garden — where Mei Lingxue is — Yun Fei rushes to defend her, his golden flames clashing with the beast\'s crimson fire.' },
  { episode_number: 9, title: 'Forbidden',                    description: 'Gravely wounded, Yun Fei and Mei Lingxue fight the Flame Jiao together. Mei Lingxue blinds it with a desperate sword strike but is thrown back. Yun Fei\'s Nine Heavens vortex reverses, absorbing all energy around him and unleashing the Phoenix Nirvana Fire — a giant phoenix phantom that incinerates the beast. Afterward, Mei Lingxue holds his hand for the first time.' },
  { episode_number: 10, title: "Heaven's Tribulation Approaches", description: 'The Sect Master offers Yun Fei a deal: break through to Foundation Establishment within three days, and the sect will formally protect him from the Celestial Court. Yun Fei confronts Mei Lingxue about their forbidden connection. She tells him to survive first — and they will talk after. Three days remain before the Celestial Court returns, and a hidden heavenly lightning seed lurks in his meridians.' },
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
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3Path}"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    return parseFloat(result.trim());
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== LevelUp Audio - Upload "Jade Dynasty: The Forbidden Meridian" ===\n');
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
  // Step 1: Query the genres table for cultivation UUID
  // -----------------------------------------------------------------------
  console.log('--- Step 1: Query genre UUID ---');
  const { data: genreRows, error: genreError } = await supabase
    .from('genres')
    .select('id, slug')
    .eq('slug', 'cultivation');

  if (genreError) {
    console.error('Error querying genres:', genreError.message);
    process.exit(1);
  }

  if (!genreRows || genreRows.length === 0) {
    console.error(
      'Genre "cultivation" not found. Please seed genres first.',
    );
    process.exit(1);
  }

  const genreId = genreRows[0].id;
  console.log(`Found cultivation genre: ${genreId}\n`);

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
      title: 'Jade Dynasty: The Forbidden Meridian',
      description:
        'Born with sealed meridians and treated as worthless, a servant at the prestigious Azure Cloud Sect discovers he possesses the legendary Nine Heavens Physique — a body type unseen in 10,000 years. As he cultivates at terrifying speed, his forbidden bond with the sect\'s coldest genius may be his greatest strength — or his fatal weakness.',
      author: 'Lin Tianhua',
      cover_url: coverUrl,
      genre_id: genreId,
      is_completed: false,
      total_episodes: 10,
      avg_rating: 5.0,
      total_plays: 0,
      tags: ['cultivation', 'martial-arts', 'forbidden-love', 'underdog'],
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

    const fileName = `ep${String(ep.episode_number).padStart(2, '0')}.mp3`;
    const localPath = resolve(AUDIO_DIR, fileName);
    const durationSeconds = existsSync(localPath)
      ? Math.round(getDurationSeconds(localPath))
      : 0;

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
      duration_seconds: durationSeconds,
      audio_url: audioUrl,
      audio_size_bytes: existsSync(localPath)
        ? readFileSync(localPath).length
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
        `  Ep${String(ep.episode_number).padStart(2, '0')}: "${ep.title}"${freeLabel} — ${durationSeconds.toFixed(1)}s — ${formatDate(releasedAt).split('T')[0]}`,
      );
    }

    await sleep(100);
  }

  console.log(`\nCreated ${episodesCreated}/10 episodes.\n`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('=== Summary ===');
  console.log(`Series created:  Jade Dynasty: The Forbidden Meridian (${seriesId})`);
  console.log(`Genre:           cultivation (${genreId})`);
  console.log(`Cover:           ${coverUrl}`);
  console.log(`Audio uploaded:  ${Object.keys(uploadedUrls).length}/10 files`);
  console.log(`Episodes created: ${episodesCreated}/10`);
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
