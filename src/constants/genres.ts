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
] as const;

/** Union type of all valid genre slugs. */
export type GenreSlug = (typeof GENRE_SLUGS)[number];
