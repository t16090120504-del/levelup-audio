import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressEntry {
  position: number;
  completed: boolean;
  lastPlayedAt: string;
}

interface ContentState {
  favorites: string[];
  unlockedEpisodes: string[];
  listeningProgress: Record<string, ProgressEntry>;
  downloadedEpisodes: string[];

  toggleFavorite: (seriesId: string) => void;
  isFavorited: (seriesId: string) => boolean;
  unlockEpisode: (episodeId: string) => void;
  isUnlocked: (episodeId: string) => boolean;
  saveProgress: (episodeId: string, position: number, completed: boolean) => void;
  getProgress: (episodeId: string) => number;
  addDownload: (episodeId: string) => void;
  removeDownload: (episodeId: string) => void;
  reset: () => void;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      favorites: [],
      unlockedEpisodes: [],
      listeningProgress: {},
      downloadedEpisodes: [],

      toggleFavorite: (seriesId) => {
        set((state) => {
          const isFav = state.favorites.includes(seriesId);
          return {
            favorites: isFav
              ? state.favorites.filter((id) => id !== seriesId)
              : [...state.favorites, seriesId],
          };
        });
      },

      isFavorited: (seriesId) => {
        return get().favorites.includes(seriesId);
      },

      unlockEpisode: (episodeId) => {
        set((state) => {
          if (state.unlockedEpisodes.includes(episodeId)) {
            return {};
          }
          return { unlockedEpisodes: [...state.unlockedEpisodes, episodeId] };
        });
      },

      isUnlocked: (episodeId) => {
        return get().unlockedEpisodes.includes(episodeId);
      },

      saveProgress: (episodeId, position, completed) => {
        set((state) => ({
          listeningProgress: {
            ...state.listeningProgress,
            [episodeId]: {
              position,
              completed,
              lastPlayedAt: new Date().toISOString(),
            },
          },
        }));
      },

      getProgress: (episodeId) => {
        const progress = get().listeningProgress[episodeId];
        return progress ? progress.position : 0;
      },

      addDownload: (episodeId) => {
        set((state) => {
          if (state.downloadedEpisodes.includes(episodeId)) {
            return {};
          }
          return { downloadedEpisodes: [...state.downloadedEpisodes, episodeId] };
        });
      },

      removeDownload: (episodeId) => {
        set((state) => ({
          downloadedEpisodes: state.downloadedEpisodes.filter((id) => id !== episodeId),
        }));
      },

      reset: () => {
        set({
          favorites: [],
          unlockedEpisodes: [],
          listeningProgress: {},
          downloadedEpisodes: [],
        });
      },
    }),
    {
      name: 'levelup-content',
    },
  ),
);
