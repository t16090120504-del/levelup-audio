export interface Genre {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl?: string;
  sortOrder: number;
}

export type SeriesStatus = 'ongoing' | 'completed' | 'hiatus';

export interface Series {
  id: string;
  title: string;
  description: string;
  author: string;
  coverUrl: string;
  genreId: string;
  isCompleted: boolean;
  totalEpisodes: number;
  avgRating: number;
  totalPlays: number;
  tags: string[];
  status: SeriesStatus;
}

export interface Episode {
  id: string;
  seriesId: string;
  title: string;
  description: string;
  episodeNumber: number;
  seasonNumber: number;
  durationSeconds: number;
  audioUrl: string;
  audioSizeBytes?: number;
  isFree: boolean;
  unlockCostCoins: number;
  releasedAt: string;
}

export type EpisodeStatus = 'free' | 'unlocked' | 'locked';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
