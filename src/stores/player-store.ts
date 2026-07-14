import { create } from 'zustand';
import type { Episode, Series } from '@/types/content';
import { audioEngine } from '@/services/audio-engine';
import { useEngagementStore } from '@/stores/engagement-store';

interface PlayerStoreState {
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
  showEndOverlay: boolean;

  playEpisode: (episode: Episode, series: Series) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  playNext: () => void;
  playPrev: () => void;
  setAutoPlayNext: (enabled: boolean) => void;
  setShowEndOverlay: (show: boolean) => void;
  clearError: () => void;
  _onTimeUpdate: (time: number) => void;
  _onEnded: () => void;
  _onLoadedMetadata: (duration: number) => void;
  _onError: (error: string) => void;
  _onPlayStateChange: (isPlaying: boolean) => void;
}

export const usePlayerStore = create<PlayerStoreState>()((set, get) => {
  function handlePlayError(err: unknown): void {
    set({
      error: err instanceof Error ? err.message : String(err),
      isPlaying: false,
    });
  }

  function startEpisode(episode: Episode, series: Series | null): void {
    audioEngine.loadSource(episode.audioUrl);
    audioEngine.play().catch(handlePlayError);
    set({
      currentEpisode: episode,
      currentSeries: series,
      currentTime: 0,
      duration: 0,
      error: null,
      showEndOverlay: false,
      isPlaying: true,
      isBuffering: true,
    });
    // Count this as an episode "played" for engagement signals (e.g. the
    // signup prompt). Fire-and-forget; never blocks playback.
    try {
      useEngagementStore.getState().incrementEpisodesPlayed();
    } catch {
      // ignore — engagement tracking must never break playback
    }
  }

  return {
    currentEpisode: null,
    currentSeries: null,
    queue: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isBuffering: false,
    autoPlayNext: true,
    error: null,
    showEndOverlay: false,

    playEpisode: (episode, series) => {
      startEpisode(episode, series);
    },

    togglePlayPause: () => {
      const { isPlaying, currentEpisode } = get();
      if (!currentEpisode) return;
      if (isPlaying) {
        audioEngine.pause();
        set({ isPlaying: false });
      } else {
        audioEngine.play().catch(handlePlayError);
        set({ isPlaying: true });
      }
    },

    seek: (time) => {
      audioEngine.seek(time);
      set({ currentTime: time });
    },

    setVolume: (volume) => {
      audioEngine.setVolume(volume);
      set({ volume });
    },

    setPlaybackRate: (rate) => {
      audioEngine.setPlaybackRate(rate);
      set({ playbackRate: rate });
    },

    playNext: () => {
      const { queue, currentEpisode, currentSeries } = get();
      if (!currentEpisode || queue.length === 0) return;
      const currentIndex = queue.findIndex((e) => e.id === currentEpisode.id);
      const nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) return;
      startEpisode(queue[nextIndex], currentSeries);
    },

    playPrev: () => {
      const { queue, currentEpisode, currentSeries } = get();
      if (!currentEpisode || queue.length === 0) return;
      const currentIndex = queue.findIndex((e) => e.id === currentEpisode.id);
      const prevIndex = currentIndex - 1;
      if (prevIndex < 0) return;
      startEpisode(queue[prevIndex], currentSeries);
    },

    setAutoPlayNext: (enabled) => {
      set({ autoPlayNext: enabled });
    },

    setShowEndOverlay: (show) => {
      set({ showEndOverlay: show });
    },

    clearError: () => {
      set({ error: null });
    },

    _onTimeUpdate: (time) => {
      set({ currentTime: time });
    },

    _onEnded: () => {
      const { autoPlayNext, queue, currentEpisode, currentSeries } = get();
      if (autoPlayNext && currentEpisode) {
        const currentIndex = queue.findIndex((e) => e.id === currentEpisode.id);
        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
          startEpisode(queue[nextIndex], currentSeries);
          return;
        }
      }
      set({ isPlaying: false, showEndOverlay: true });
    },

    _onLoadedMetadata: (duration) => {
      set({ duration, isBuffering: false });
    },

    _onError: (error) => {
      set({ error, isPlaying: false, isBuffering: false });
    },

    _onPlayStateChange: (isPlaying) => {
      set({ isPlaying });
    },
  };
});
