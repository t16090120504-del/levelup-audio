import type { Episode } from '@/types';
import { CONFIG } from '@/constants/config';
import { series } from './series';

/** 20 fantasy-style episode title templates, cycled across episodes. */
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

/** Matching description templates (same index as titles above). */
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

/** Shared placeholder audio file for all mock episodes. */
const SAMPLE_AUDIO_URL = '/audio-samples/sample-ep.mp3';

/** Milliseconds in one day, used for release-date spacing. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generates a list of episodes for the given series.
 *
 * - Episode IDs follow the pattern `${seriesId}-ep-${number}`.
 * - The first 5 episodes are free; the rest require coins to unlock.
 * - Release dates start 30 days ago and increment by one day per episode.
 * - Duration is randomly generated between 300–900 seconds (5–15 minutes).
 *
 * Results are cached per `seriesId` so repeated calls return consistent data.
 *
 * @param seriesId - The ID of the series to generate episodes for.
 * @param count    - How many episodes to generate.
 * @returns An array of `Episode` objects sorted by episode number.
 */
export function generateEpisodes(seriesId: string, count: number): Episode[] {
  const now = Date.now();
  const startDate = now - 30 * ONE_DAY_MS;

  const episodes: Episode[] = [];

  for (let i = 0; i < count; i++) {
    const episodeNumber = i + 1;
    const templateIndex = i % EPISODE_TITLE_TEMPLATES.length;
    const durationSeconds = Math.floor(Math.random() * 601) + 300; // 300–900

    episodes.push({
      id: `${seriesId}-ep-${episodeNumber}`,
      seriesId,
      title: EPISODE_TITLE_TEMPLATES[templateIndex],
      description: EPISODE_DESCRIPTION_TEMPLATES[templateIndex],
      episodeNumber,
      seasonNumber: 1,
      durationSeconds,
      audioUrl: SAMPLE_AUDIO_URL,
      audioSizeBytes: durationSeconds * 16000,
      isFree: episodeNumber <= 5,
      unlockCostCoins: CONFIG.EPISODE_UNLOCK_COST,
      releasedAt: new Date(startDate + i * ONE_DAY_MS).toISOString(),
    });
  }

  return episodes;
}

/** Internal cache so generated episodes persist across calls. */
const episodeCache = new Map<string, Episode[]>();

/**
 * Returns all episodes for a given series, generating and caching them
 * on first access based on the series' `totalEpisodes` value.
 *
 * @param seriesId - The series ID.
 * @returns All episodes for the series, sorted by episode number.
 */
export function getEpisodesBySeries(seriesId: string): Episode[] {
  if (!episodeCache.has(seriesId)) {
    const target = series.find((s) => s.id === seriesId);
    const count = target ? target.totalEpisodes : 0;
    episodeCache.set(seriesId, generateEpisodes(seriesId, count));
  }
  return episodeCache.get(seriesId) ?? [];
}

/**
 * Returns a flat array of all episodes across every series.
 *
 * @returns All episodes from all series.
 */
export function getAllEpisodes(): Episode[] {
  return series.flatMap((s) => getEpisodesBySeries(s.id));
}
