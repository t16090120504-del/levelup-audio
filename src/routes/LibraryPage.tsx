import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Headphones,
  Coins,
  Download,
  Play,
  Trash2,
  Crown,
} from 'lucide-react';
import type { Series, Episode } from '@/types';
import { useContentStore } from '@/stores/content-store';
import { useCoinStore } from '@/stores/coin-store';
import { usePlayerStore } from '@/stores/player-store';
import { ROUTES } from '@/constants/routes';
import { formatDuration, formatCoinAmount } from '@/lib/format';
import { getCoverStyle } from '@/lib/cover';
import { apiClient } from '@/services/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/content/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';

type LibraryTab = 'favorites' | 'continue' | 'coins' | 'downloads';

const TABS: { key: LibraryTab; label: string; icon: typeof Heart }[] = [
  { key: 'favorites', label: 'Favorites', icon: Heart },
  { key: 'continue', label: 'Continue', icon: Headphones },
  { key: 'coins', label: 'My Coins', icon: Coins },
  { key: 'downloads', label: 'Downloads', icon: Download },
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryTab>('favorites');
  const [favoriteSeries, setFavoriteSeries] = useState<Series[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const favorites = useContentStore((s) => s.favorites);
  const listeningProgress = useContentStore((s) => s.listeningProgress);
  const downloadedEpisodes = useContentStore((s) => s.downloadedEpisodes);
  const removeDownload = useContentStore((s) => s.removeDownload);
  const toggleFavorite = useContentStore((s) => s.toggleFavorite);
  const balance = useCoinStore((s) => s.balance);
  const playEpisode = usePlayerStore((s) => s.playEpisode);

  // Fetch all series and episodes on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoadingData(true);
      try {
        const seriesList = await apiClient.content.getTrendingSeries(100);

        if (cancelled) return;

        // Fetch episodes for each series
        const episodes: Episode[] = [];
        const seriesWithEpisodes: Series[] = [];

        for (const s of seriesList) {
          try {
            const epResult = await apiClient.content.getEpisodesBySeries(s.id, 1, 100);
            episodes.push(...epResult.data);
          } catch {
            // skip series that fail
          }
          seriesWithEpisodes.push(s);
        }

        if (cancelled) return;
        setAllSeries(seriesWithEpisodes);
        setAllEpisodes(episodes);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load favorite series details
  useEffect(() => {
    if (loadingData) return;
    setLoadingFavorites(true);
    const filtered = allSeries.filter((s) => favorites.includes(s.id));
    setFavoriteSeries(filtered);
    setLoadingFavorites(false);
  }, [favorites, allSeries, loadingData]);

  // Resolve continue listening items
  const continueItems = useMemo(() => {
    if (loadingData) return [];
    const items: {
      episode: Episode;
      series: Series;
      progress: number;
      progressPercent: number;
    }[] = [];

    for (const [episodeId, entry] of Object.entries(listeningProgress)) {
      if (entry.completed) continue;
      const episode = allEpisodes.find((e) => e.id === episodeId);
      if (!episode) continue;
      const series = allSeries.find((s) => s.id === episode.seriesId);
      if (!series) continue;
      const progressPercent = Math.min(
        100,
        (entry.position / episode.durationSeconds) * 100,
      );
      items.push({ episode, series, progress: entry.position, progressPercent });
    }

    // Sort by most recently played
    items.sort((a, b) => {
      const aTime = listeningProgress[a.episode.id]?.lastPlayedAt ?? '';
      const bTime = listeningProgress[b.episode.id]?.lastPlayedAt ?? '';
      return bTime.localeCompare(aTime);
    });

    return items;
  }, [listeningProgress, allEpisodes, allSeries, loadingData]);

  // Resolve downloaded episodes
  const downloadItems = useMemo(() => {
    if (loadingData) return [];
    return downloadedEpisodes
      .map((id) => {
        const episode = allEpisodes.find((e) => e.id === id);
        if (!episode) return null;
        const series = allSeries.find((s) => s.id === episode.seriesId);
        if (!series) return null;
        return { episode, series };
      })
      .filter(Boolean) as { episode: Episode; series: Series }[];
  }, [downloadedEpisodes, allEpisodes, allSeries, loadingData]);

  const handleContinuePlay = useCallback(
    (episode: Episode, series: Series) => {
      playEpisode(episode, series);
      navigate(ROUTES.PLAYER_BY_ID(episode.id));
    },
    [playEpisode, navigate],
  );

  return (
    <div className="space-y-6 pb-8">
      <h1 className="font-display text-3xl text-gold-bright">My Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'border-gold/40 bg-gold/10 text-gold-bright'
                  : 'border-bg-hover bg-bg-elevated text-text-secondary hover:border-gold/30 hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'favorites' && (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SectionHeader title="Your Favorites" />
            {loadingFavorites ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : favoriteSeries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-bg-hover bg-bg-elevated py-12 text-center">
                <Heart size={40} className="text-text-muted" />
                <p className="mt-3 text-sm text-text-secondary">No favorites yet</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(ROUTES.BROWSE)}
                >
                  Browse Series
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {favoriteSeries.map((s) => (
                  <motion.div
                    key={s.id}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      hover
                      className="relative flex cursor-pointer gap-4 overflow-hidden p-4"
                      onClick={() => navigate(ROUTES.SERIES_BY_ID(s.id))}
                    >
                      <div
                        className="h-24 w-16 shrink-0 rounded-md"
                        style={getCoverStyle(s.coverUrl)}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-base font-semibold text-text-primary">
                          {s.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-text-secondary">{s.author}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="default" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(s.id);
                        }}
                        className="absolute right-3 top-3 rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'continue' && (
          <motion.div
            key="continue"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SectionHeader title="Continue Listening" />
            {continueItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-bg-hover bg-bg-elevated py-12 text-center">
                <Headphones size={40} className="text-text-muted" />
                <p className="mt-3 text-sm text-text-secondary">
                  No episodes in progress
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(ROUTES.BROWSE)}
                >
                  Start Listening
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {continueItems.map(({ episode, series, progressPercent }) => (
                  <Card key={episode.id} className="flex items-center gap-4 p-4">
                    <div
                      className="h-16 w-12 shrink-0 rounded-md"
                      style={getCoverStyle(series.coverUrl)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-muted">{series.title}</p>
                      <h4 className="font-display text-sm font-semibold text-text-primary">
                        {episode.title}
                      </h4>
                      <div className="mt-2">
                        <ProgressBar value={progressPercent} variant="gold" height="sm" />
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      leftIcon={<Play size={14} />}
                      onClick={() => handleContinuePlay(episode, series)}
                    >
                      Continue
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'coins' && (
          <motion.div
            key="coins"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <SectionHeader title="My Coins" />

            <Card glow className="relative overflow-hidden border-gold/30 p-6 text-center">
              <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
              <p className="text-xs uppercase tracking-wide text-text-muted">
                Current Balance
              </p>
              <p className="mt-2 font-display text-5xl font-bold text-gold-bright">
                {formatCoinAmount(balance)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">coins available</p>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                variant="primary"
                fullWidth
                leftIcon={<Coins size={18} />}
                onClick={() => navigate(ROUTES.STORE)}
              >
                Get More Coins
              </Button>
              <Button
                variant="secondary"
                fullWidth
                leftIcon={<Crown size={18} />}
                onClick={() => navigate(ROUTES.STORE)}
              >
                Subscribe for Unlimited
              </Button>
            </div>
          </motion.div>
        )}

        {activeTab === 'downloads' && (
          <motion.div
            key="downloads"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SectionHeader title="Downloads" />
            {downloadItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-bg-hover bg-bg-elevated py-12 text-center">
                <Download size={40} className="text-text-muted" />
                <p className="mt-3 text-sm text-text-secondary">
                  No downloaded episodes
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Download episodes to listen offline
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {downloadItems.map(({ episode, series }) => (
                  <Card
                    key={episode.id}
                    className="flex items-center gap-4 p-4"
                  >
                    <div
                      className="h-16 w-12 shrink-0 rounded-md"
                      style={getCoverStyle(series.coverUrl)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-muted">{series.title}</p>
                      <h4 className="font-display text-sm font-semibold text-text-primary">
                        {episode.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatDuration(episode.durationSeconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Play size={14} />}
                        onClick={() => handleContinuePlay(episode, series)}
                      >
                        Play
                      </Button>
                      <button
                        type="button"
                        onClick={() => removeDownload(episode.id)}
                        className="rounded-md p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-status-warning"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
