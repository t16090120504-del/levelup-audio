import type { ListeningProgress } from '@/types';

/**
 * User API interface.
 *
 * Manages user-specific data: favorites, listening progress,
 * and downloaded episodes.
 */
export interface UserApi {
  /** Fetch the list of favorited series IDs. */
  getFavorites(): Promise<string[]>;

  /** Toggle a series in/out of favorites. Returns `true` if now favorited. */
  toggleFavorite(seriesId: string): Promise<boolean>;

  /** Fetch listening progress keyed by episode ID. */
  getListeningProgress(): Promise<Record<string, ListeningProgress>>;

  /** Save playback progress for an episode. */
  saveProgress(
    episodeId: string,
    position: number,
    completed: boolean,
  ): Promise<void>;

  /** Fetch the list of downloaded episode IDs. */
  getDownloadedEpisodes(): Promise<string[]>;
}
