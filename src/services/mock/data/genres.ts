import type { Genre } from '@/types';

/**
 * Static mock genre data.
 * The `id` of each genre is referenced by `Series.genreId`.
 */
export const genres: Genre[] = [
  {
    id: 'genre-progression-fantasy',
    name: 'Progression Fantasy',
    slug: 'progression-fantasy',
    description:
      'Stories where the protagonist grows stronger through levels, stats, and power systems',
    sortOrder: 1,
  },
  {
    id: 'genre-litrpg',
    name: 'LitRPG',
    slug: 'litrpg',
    description: 'Game-world adventures with quests, loot, and character sheets',
    sortOrder: 2,
  },
  {
    id: 'genre-dungeon-core',
    name: 'Dungeon Core',
    slug: 'dungeon-core',
    description: 'Reincarnated as a dungeon, build and defend your domain',
    sortOrder: 3,
  },
  {
    id: 'genre-cultivation',
    name: 'Cultivation',
    slug: 'cultivation',
    description: 'Eastern fantasy of martial arts, qi, and ascension to immortality',
    sortOrder: 4,
  },
  {
    id: 'genre-isekai',
    name: 'Isekai',
    slug: 'isekai',
    description: 'Transported to another world, start a new legendary life',
    sortOrder: 5,
  },
  {
    id: 'genre-urban-fantasy',
    name: 'Urban Fantasy',
    slug: 'urban-fantasy',
    description: 'Magic and supernatural in modern city settings',
    sortOrder: 6,
  },
  {
    id: 'genre-superhero',
    name: 'Superhero',
    slug: 'superhero',
    description: 'Powers, costumes, and saving the world',
    sortOrder: 7,
  },
];
