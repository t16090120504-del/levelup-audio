/**
 * Genre slug constants.
 * These slugs are used in routing and API requests to identify genres.
 */
export const GENRE_SLUGS = [
  'progression-fantasy',
  'litrpg',
  'dungeon-core',
  'cultivation',
  'isekai',
  'urban-fantasy',
  'superhero',
  'workplace-power-fantasy',
] as const;

/** Union type of all valid genre slugs. */
export type GenreSlug = (typeof GENRE_SLUGS)[number];
