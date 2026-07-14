/**
 * LevelUp Audio - Supabase Seed Script
 *
 * Inserts seed data (genres, series, episodes) into a Supabase database.
 *
 * Prerequisites:
 *   1. Run scripts/schema.sql in the Supabase Dashboard SQL Editor first.
 *   2. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables,
 *      or edit the defaults below.
 *
 * Usage:
 *   npx tsx scripts/seed-supabase.ts          # insert seed data
 *   npx tsx scripts/seed-supabase.ts --clean   # delete existing data, then insert
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://ihfaoksiurmucryfzfvd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'sb_secret_HR5YZxJ2j0PmWExOQySlTA_hBc_B1Hy';

const SHOULD_CLEAN = process.argv.includes('--clean');

// ---------------------------------------------------------------------------
// Fixed UUIDs — valid UUID v4 format (version=4, variant=10xx)
// ---------------------------------------------------------------------------

const GENRE_UUIDS: Record<string, string> = {
  'progression-fantasy': 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
  litrpg:                'b2c3d4e5-f6a7-4b2c-9d3e-4f5a6b7c8d9e',
  'dungeon-core':        'c3d4e5f6-a7b8-4c3d-0e4f-5a6b7c8d9e0f',
  cultivation:           'd4e5f6a7-b8c9-4d4e-1f5a-6b7c8d9e0f1a',
  isekai:                'e5f6a7b8-c9d0-4e5f-2a6b-7c8d9e0f1a2b',
  'urban-fantasy':       'f6a7b8c9-d0e1-4f6a-3b7c-8d9e0f1a2b3c',
  superhero:             'a7b8c9d0-e1f2-4a7b-4c8d-9e0f1a2b3c4d',
};

const SERIES_UUIDS: Record<string, string> = {
  'series-the-ascendant':             '11111111-aaaa-4bbb-9ccc-dddddddddddd',
  'series-system-reborn':             '22222222-bbbb-4ccc-9ddd-eeeeeeeeeeee',
  'series-dungeon-of-the-forgotten':  '33333333-cccc-4ddd-9eee-ffffffffffff',
  'series-path-of-ten-thousand-swords':'44444444-dddd-4eee-9fff-aaaaaaaaaaaa',
  'series-rift-walker':               '55555555-eeee-4fff-9aaa-bbbbbbbbbbbb',
};

// ---------------------------------------------------------------------------
// Seed data (mirrors src/services/mock/data/)
// ---------------------------------------------------------------------------

interface GenreRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}

const GENRES_DATA: GenreRow[] = [
  {
    id: GENRE_UUIDS['progression-fantasy'],
    name: 'Progression Fantasy',
    slug: 'progression-fantasy',
    description:
      'Stories where the protagonist grows stronger through levels, stats, and power systems',
    sort_order: 1,
  },
  {
    id: GENRE_UUIDS['litrpg'],
    name: 'LitRPG',
    slug: 'litrpg',
    description: 'Game-world adventures with quests, loot, and character sheets',
    sort_order: 2,
  },
  {
    id: GENRE_UUIDS['dungeon-core'],
    name: 'Dungeon Core',
    slug: 'dungeon-core',
    description: 'Reincarnated as a dungeon, build and defend your domain',
    sort_order: 3,
  },
  {
    id: GENRE_UUIDS['cultivation'],
    name: 'Cultivation',
    slug: 'cultivation',
    description:
      'Eastern fantasy of martial arts, qi, and ascension to immortality',
    sort_order: 4,
  },
  {
    id: GENRE_UUIDS['isekai'],
    name: 'Isekai',
    slug: 'isekai',
    description: 'Transported to another world, start a new legendary life',
    sort_order: 5,
  },
  {
    id: GENRE_UUIDS['urban-fantasy'],
    name: 'Urban Fantasy',
    slug: 'urban-fantasy',
    description: 'Magic and supernatural in modern city settings',
    sort_order: 6,
  },
  {
    id: GENRE_UUIDS['superhero'],
    name: 'Superhero',
    slug: 'superhero',
    description: 'Powers, costumes, and saving the world',
    sort_order: 7,
  },
];

interface SeriesRow {
  id: string;
  title: string;
  description: string;
  author: string;
  cover_url: string;
  genre_id: string;
  is_completed: boolean;
  total_episodes: number;
  avg_rating: number;
  total_plays: number;
  tags: string[];
  status: string;
}

const SERIES_DATA: SeriesRow[] = [
  {
    id: SERIES_UUIDS['series-the-ascendant'],
    title: 'The Ascendant',
    description:
      'When a powerless orphan is chosen by an ancient leveling system, he must claw his way up through a brutal magical academy where only the strongest survive. Every battle grants experience, every level unlocks new abilities—and every mistake could be his last.',
    author: 'Aria Wintersong',
    cover_url: 'gradient:from-purple-600-to-blue-500',
    genre_id: GENRE_UUIDS['progression-fantasy'],
    is_completed: false,
    total_episodes: 30,
    avg_rating: 4.8,
    total_plays: 1_250_000,
    tags: ['leveling', 'magic', 'academy'],
    status: 'ongoing',
  },
  {
    id: SERIES_UUIDS['series-system-reborn'],
    title: 'System Reborn',
    description:
      'Death is only the beginning. Reborn into a deadly game world with nothing but a broken interface and a mysterious class no one has ever seen, a former programmer must exploit every bug and loophole to survive the permadeath arena.',
    author: 'Dex Marlowe',
    cover_url: 'gradient:from-emerald-500-to-cyan-600',
    genre_id: GENRE_UUIDS['litrpg'],
    is_completed: false,
    total_episodes: 30,
    avg_rating: 4.6,
    total_plays: 980_000,
    tags: ['game-lit', 'stats', 'survival'],
    status: 'ongoing',
  },
  {
    id: SERIES_UUIDS['series-dungeon-of-the-forgotten'],
    title: 'Dungeon of the Forgotten',
    description:
      'Reincarnated as a crystal core deep beneath an ancient ruin, a fallen king must rebuild his domain floor by floor. Summon monsters, design lethal traps, and devour adventurers who dare to challenge your growing labyrinth of death.',
    author: 'Thane Ironheart',
    cover_url: 'gradient:from-amber-600-to-red-700',
    genre_id: GENRE_UUIDS['dungeon-core'],
    is_completed: false,
    total_episodes: 30,
    avg_rating: 4.7,
    total_plays: 750_000,
    tags: ['dungeon', 'strategy', 'base-building'],
    status: 'ongoing',
  },
  {
    id: SERIES_UUIDS['series-path-of-ten-thousand-swords'],
    title: 'Path of Ten Thousand Swords',
    description:
      "In a world where cultivation determines one's destiny, a discarded disciple discovers a forbidden technique that lets him absorb the sword intent of fallen masters. Ten thousand blades. Ten thousand battles. One path to immortality.",
    author: 'Liang Mei',
    cover_url: 'gradient:from-rose-500-to-indigo-700',
    genre_id: GENRE_UUIDS['cultivation'],
    is_completed: false,
    total_episodes: 30,
    avg_rating: 4.9,
    total_plays: 1_500_000,
    tags: ['cultivation', 'martial-arts', 'immortal'],
    status: 'ongoing',
  },
  {
    id: SERIES_UUIDS['series-rift-walker'],
    title: 'Rift Walker',
    description:
      'A college student is accidentally summoned to a war-torn fantasy realm as the legendary "Rift Walker"—a hero prophesied to open gateways between worlds. But the summoning ritual was imperfect, and the dark forces hunting him are closer than he thinks.',
    author: 'Sage Carver',
    cover_url: 'gradient:from-teal-500-to-violet-600',
    genre_id: GENRE_UUIDS['isekai'],
    is_completed: false,
    total_episodes: 30,
    avg_rating: 4.5,
    total_plays: 680_000,
    tags: ['isekai', 'adventure', 'summoning'],
    status: 'ongoing',
  },
];

// ---------------------------------------------------------------------------
// Episode generation
// ---------------------------------------------------------------------------

const EPISODE_TITLE_TEMPLATES: readonly string[] = [
  'The Awakening',
  'First Blood',
  'The Trial Begins',
  'Power Unleashed',
  'Beyond the Threshold',
  'Shadows of the Past',
  'The First Step',
  'Rising Tides',
  'Echoes of Power',
  'The Broken Seal',
  'Whispers in the Dark',
  'Crimson Dawn',
  'The Crucible',
  'Uncharted Paths',
  'The Gathering Storm',
  'Forged in Fire',
  'The Hidden Realm',
  'Blood and Ash',
  'The Reckoning',
  'Ascension',
];

const EPISODE_DESCRIPTION_TEMPLATES: readonly string[] = [
  'A long-dormant power stirs within the protagonist, setting destiny in motion.',
  'The first real test arrives—and failure is not an option.',
  'A trial unlike any other begins, pushing every limit to the breaking point.',
  'Raw power surges forth, devastating everyone who underestimated the hero.',
  'Crossing into unknown territory, there is no turning back.',
  'Ghosts of the past resurface, demanding to be confronted.',
  'Every legend begins with a single, fateful decision.',
  'As forces gather, the tide of fate begins to turn.',
  'An ancient power echoes through the ages, calling out to its heir.',
  'A seal cracks open, releasing something that should have stayed buried.',
  'Dark whispers promise power—at a terrible price.',
  'Dawn breaks over a battlefield stained red with sacrifice.',
  'The crucible of war refines the hero into something new.',
  'Into uncharted lands, where no map or guide can help.',
  'Storm clouds gather on the horizon, heralding the coming conflict.',
  'Tempered by fire and pain, a weapon is forged.',
  'A hidden realm reveals secrets that change everything.',
  'From the ashes of defeat, a new resolve is born.',
  'The reckoning arrives, and debts long owed come due.',
  'The final ascension—transcending all that came before.',
];

const SAMPLE_AUDIO_URL = '/audio-samples/sample-ep.mp3';
const EPISODE_UNLOCK_COST = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface EpisodeRow {
  id: string;
  series_id: string;
  title: string;
  description: string;
  episode_number: number;
  season_number: number;
  duration_seconds: number;
  audio_url: string;
  audio_size_bytes: number;
  is_free: boolean;
  unlock_cost_coins: number;
  released_at: string;
}

/**
 * Generate a valid UUID v4 using crypto.randomUUID().
 * This is always a proper UUID v4, no format issues.
 */
function generateEpisodeUUID(): string {
  return crypto.randomUUID();
}

function generateEpisodesForSeries(
  seriesId: string,
  count: number,
): EpisodeRow[] {
  const now = Date.now();
  const startDate = now - 30 * ONE_DAY_MS;

  const episodes: EpisodeRow[] = [];

  for (let i = 0; i < count; i++) {
    const episodeNumber = i + 1;
    const templateIndex = i % EPISODE_TITLE_TEMPLATES.length;
    const durationSeconds = 300 + ((episodeNumber * 137 + 53) % 601);

    episodes.push({
      id: generateEpisodeUUID(),
      series_id: seriesId,
      title: EPISODE_TITLE_TEMPLATES[templateIndex],
      description: EPISODE_DESCRIPTION_TEMPLATES[templateIndex],
      episode_number: episodeNumber,
      season_number: 1,
      duration_seconds: durationSeconds,
      audio_url: SAMPLE_AUDIO_URL,
      audio_size_bytes: durationSeconds * 16000,
      is_free: episodeNumber <= 5,
      unlock_cost_coins: EPISODE_UNLOCK_COST,
      released_at: new Date(startDate + i * ONE_DAY_MS).toISOString(),
    });
  }

  return episodes;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log('=== LevelUp Audio - Supabase Seed Script ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  if (SHOULD_CLEAN) {
    console.log('Mode: CLEAN (will delete existing data first)\n');
  } else {
    console.log('Mode: INSERT\n');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let totalInserted = 0;
  let totalErrors = 0;

  // -----------------------------------------------------------------------
  // Optional: Clean existing data
  // -----------------------------------------------------------------------
  if (SHOULD_CLEAN) {
    console.log('--- Cleaning existing data ---');
    // Delete in reverse dependency order
    const { error: epErr } = await supabase.from('episodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (epErr) console.error('  Error deleting episodes:', epErr.message);
    else console.log('  Deleted all episodes.');

    const { error: serErr } = await supabase.from('series').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (serErr) console.error('  Error deleting series:', serErr.message);
    else console.log('  Deleted all series.');

    const { error: genErr } = await supabase.from('genres').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (genErr) console.error('  Error deleting genres:', genErr.message);
    else console.log('  Deleted all genres.');

    console.log('');
  }

  // -----------------------------------------------------------------------
  // 1. Seed Genres
  // -----------------------------------------------------------------------
  console.log('--- Seeding Genres ---');
  const { data: genreData, error: genreError } = await supabase
    .from('genres')
    .insert(
      GENRES_DATA.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        description: g.description,
        sort_order: g.sort_order,
      })),
    )
    .select();

  if (genreError) {
    console.error('Error inserting genres:', genreError.message);
    totalErrors++;
  } else {
    console.log(`Inserted ${genreData?.length ?? 0} genres.`);
    totalInserted += genreData?.length ?? 0;
  }

  // -----------------------------------------------------------------------
  // 2. Seed Series
  // -----------------------------------------------------------------------
  console.log('\n--- Seeding Series ---');
  const { data: seriesData, error: seriesError } = await supabase
    .from('series')
    .insert(
      SERIES_DATA.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        author: s.author,
        cover_url: s.cover_url,
        genre_id: s.genre_id,
        is_completed: s.is_completed,
        total_episodes: s.total_episodes,
        avg_rating: s.avg_rating,
        total_plays: s.total_plays,
        tags: s.tags,
        status: s.status,
      })),
    )
    .select();

  if (seriesError) {
    console.error('Error inserting series:', seriesError.message);
    totalErrors++;
  } else {
    console.log(`Inserted ${seriesData?.length ?? 0} series.`);
    totalInserted += seriesData?.length ?? 0;
  }

  // -----------------------------------------------------------------------
  // 3. Seed Episodes (30 per series)
  // -----------------------------------------------------------------------
  console.log('\n--- Seeding Episodes ---');
  let totalEpisodesInserted = 0;

  for (const s of SERIES_DATA) {
    const episodes = generateEpisodesForSeries(s.id, s.total_episodes);

    // Insert in batches of 10 to avoid payload size limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
      const batch = episodes.slice(i, i + BATCH_SIZE);

      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .insert(
          batch.map((ep) => ({
            id: ep.id,
            series_id: ep.series_id,
            title: ep.title,
            description: ep.description,
            episode_number: ep.episode_number,
            season_number: ep.season_number,
            duration_seconds: ep.duration_seconds,
            audio_url: ep.audio_url,
            audio_size_bytes: ep.audio_size_bytes,
            is_free: ep.is_free,
            unlock_cost_coins: ep.unlock_cost_coins,
            released_at: ep.released_at,
          })),
        )
        .select();

      if (episodeError) {
        console.error(
          `Error inserting episodes for "${s.title}" (batch ${i / BATCH_SIZE + 1}):`,
          episodeError.message,
        );
        totalErrors++;
      } else {
        totalEpisodesInserted += episodeData?.length ?? 0;
      }
    }
  }

  console.log(`Inserted ${totalEpisodesInserted} episodes total.`);
  totalInserted += totalEpisodesInserted;

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('\n=== Seed Complete ===');
  console.log(`Total rows inserted: ${totalInserted}`);
  if (totalErrors > 0) {
    console.log(`Total errors:       ${totalErrors}`);
    console.log(
      '\nTip: If you see "duplicate key" errors, run with --clean to reset.',
    );
  } else {
    console.log('All seed data inserted successfully!');
  }
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
