import type { Series } from '@/types';

/**
 * Static mock series data.
 * `coverUrl` uses a gradient pseudo-URL (`gradient:from-...-to-...`)
 * so the UI can render a CSS gradient as a placeholder cover.
 */
export const series: Series[] = [
  {
    id: 'series-the-ascendant',
    title: 'The Ascendant',
    description:
      'When a powerless orphan is chosen by an ancient leveling system, he must claw his way up through a brutal magical academy where only the strongest survive. Every battle grants experience, every level unlocks new abilities—and every mistake could be his last.',
    author: 'Aria Wintersong',
    coverUrl: 'gradient:from-purple-600-to-blue-500',
    genreId: 'genre-progression-fantasy',
    isCompleted: false,
    totalEpisodes: 30,
    avgRating: 4.8,
    totalPlays: 1_250_000,
    tags: ['leveling', 'magic', 'academy'],
    status: 'ongoing',
  },
  {
    id: 'series-system-reborn',
    title: 'System Reborn',
    description:
      'Death is only the beginning. Reborn into a deadly game world with nothing but a broken interface and a mysterious class no one has ever seen, a former programmer must exploit every bug and loophole to survive the permadeath arena.',
    author: 'Dex Marlowe',
    coverUrl: 'gradient:from-emerald-500-to-cyan-600',
    genreId: 'genre-litrpg',
    isCompleted: false,
    totalEpisodes: 30,
    avgRating: 4.6,
    totalPlays: 980_000,
    tags: ['game-lit', 'stats', 'survival'],
    status: 'ongoing',
  },
  {
    id: 'series-dungeon-of-the-forgotten',
    title: 'Dungeon of the Forgotten',
    description:
      'Reincarnated as a crystal core deep beneath an ancient ruin, a fallen king must rebuild his domain floor by floor. Summon monsters, design lethal traps, and devour adventurers who dare to challenge your growing labyrinth of death.',
    author: 'Thane Ironheart',
    coverUrl: 'gradient:from-amber-600-to-red-700',
    genreId: 'genre-dungeon-core',
    isCompleted: false,
    totalEpisodes: 30,
    avgRating: 4.7,
    totalPlays: 750_000,
    tags: ['dungeon', 'strategy', 'base-building'],
    status: 'ongoing',
  },
  {
    id: 'series-path-of-ten-thousand-swords',
    title: 'Path of Ten Thousand Swords',
    description:
      'In a world where cultivation determines one\'s destiny, a discarded disciple discovers a forbidden technique that lets him absorb the sword intent of fallen masters. Ten thousand blades. Ten thousand battles. One path to immortality.',
    author: 'Liang Mei',
    coverUrl: 'gradient:from-rose-500-to-indigo-700',
    genreId: 'genre-cultivation',
    isCompleted: false,
    totalEpisodes: 30,
    avgRating: 4.9,
    totalPlays: 1_500_000,
    tags: ['cultivation', 'martial-arts', 'immortal'],
    status: 'ongoing',
  },
  {
    id: 'series-rift-walker',
    title: 'Rift Walker',
    description:
      'A college student is accidentally summoned to a war-torn fantasy realm as the legendary "Rift Walker"—a hero prophesied to open gateways between worlds. But the summoning ritual was imperfect, and the dark forces hunting him are closer than he thinks.',
    author: 'Sage Carver',
    coverUrl: 'gradient:from-teal-500-to-violet-600',
    genreId: 'genre-isekai',
    isCompleted: false,
    totalEpisodes: 30,
    avgRating: 4.5,
    totalPlays: 680_000,
    tags: ['isekai', 'adventure', 'summoning'],
    status: 'ongoing',
  },
];
