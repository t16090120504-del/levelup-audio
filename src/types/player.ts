import type { Episode, Series } from './content';

export interface PlayerQueue {
  episodes: Episode[];
  currentIndex: number;
}

export interface PlayerState {
  currentEpisode: Episode | null;
  currentSeries: Series | null;
  queue: Episode[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isBuffering: boolean;
  autoPlayNext: boolean;
  error: string | null;
}
