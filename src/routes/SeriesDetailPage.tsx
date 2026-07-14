import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, Play, Headphones, BookOpen } from 'lucide-react';
import type { Episode, Series, EpisodeStatus } from '@/types';
import { apiClient } from '@/services/api/client';
import { CONFIG } from '@/constants/config';
import { getCoverStyle } from '@/lib/cover';
import { formatDuration } from '@/lib/format';
import { usePlayerStore } from '@/stores/player-store';
import { useContentStore } from '@/stores/content-store';
import { useCoinStore } from '@/stores/coin-store';
import { useToastStore } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EpisodeItem } from '@/components/content/EpisodeItem';
import { RatingStars } from '@/components/content/RatingStars';
import { PremiumDivider } from '@/components/content/PremiumDivider';
import { UnlockConfirmModal } from '@/components/coin/UnlockConfirmModal';
import { ROUTES } from '@/constants/routes';

function getEpisodeStatus(
  episode: Episode,
  unlocked: boolean,
  hasSubscription: boolean,
): EpisodeStatus {
  if (episode.isFree || hasSubscription || unlocked) {
    return episode.isFree ? 'free' : 'unlocked';
  }
  return 'locked';
}

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [unlockEpisode, setUnlockEpisode] = useState<Episode | null>(null);

  const playEpisode = usePlayerStore((s) => s.playEpisode);
  const isUnlocked = useContentStore((s) => s.isUnlocked);
  const unlockEpisodeStore = useContentStore((s) => s.unlockEpisode);
  const toggleFavorite = useContentStore((s) => s.toggleFavorite);
  const isFavorited = useContentStore((s) => s.isFavorited);
  const getProgress = useContentStore((s) => s.getProgress);
  const spendCoins = useCoinStore((s) => s.spendCoins);
  const addToast = useToastStore((s) => s.addToast);

  const hasSubscription = false; // mocked

  // Load series info
  useEffect(() => {
    if (!id) return;
    setLoadingSeries(true);
    apiClient.content
      .getSeriesById(id)
      .then((s) => {
        setSeries(s);
      })
      .finally(() => setLoadingSeries(false));
  }, [id]);

  // Load initial episodes
  useEffect(() => {
    if (!id) return;
    setLoadingEpisodes(true);
    setPage(1);
    apiClient.content
      .getEpisodesBySeries(id, 1, CONFIG.PAGE_SIZE)
      .then((res) => {
        setEpisodes(res.data);
        setHasMore(res.hasMore);
      })
      .finally(() => setLoadingEpisodes(false));
  }, [id]);

  const loadMore = useCallback(() => {
    if (!id || loadingEpisodes || !hasMore) return;
    setLoadingEpisodes(true);
    const nextPage = page + 1;
    apiClient.content
      .getEpisodesBySeries(id, nextPage, CONFIG.PAGE_SIZE)
      .then((res) => {
        setEpisodes((prev) => [...prev, ...res.data]);
        setHasMore(res.hasMore);
        setPage(nextPage);
      })
      .finally(() => setLoadingEpisodes(false));
  }, [id, page, hasMore, loadingEpisodes]);

  // IntersectionObserver for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '100px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const handlePlay = useCallback(
    (episode: Episode) => {
      if (!series) return;
      playEpisode(episode, series);
      navigate(ROUTES.PLAYER_BY_ID(episode.id));
    },
    [series, playEpisode, navigate],
  );

  const handleUnlock = useCallback((episode: Episode) => {
    setUnlockEpisode(episode);
  }, []);

  const handleConfirmUnlock = useCallback(
    (episode: Episode) => {
      const success = spendCoins(
        episode.unlockCostCoins,
        episode.id,
        `Unlocked ${episode.title}`,
      );
      if (success) {
        unlockEpisodeStore(episode.id);
        addToast({
          type: 'success',
          title: 'Episode Unlocked',
          message: `"${episode.title}" is now available to listen.`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Insufficient Coins',
          message: `You need ${episode.unlockCostCoins} coins to unlock this episode. Visit the store to get more coins.`,
          duration: 6000,
        });
      }
      setUnlockEpisode(null);
    },
    [spendCoins, unlockEpisodeStore, addToast],
  );

  const handleStartListening = useCallback(() => {
    if (!series || episodes.length === 0) return;
    // Find first playable episode (free or unlocked)
    const firstPlayable = episodes.find(
      (ep) =>
        ep.isFree ||
        hasSubscription ||
        isUnlocked(ep.id),
    );
    if (firstPlayable) {
      handlePlay(firstPlayable);
    } else {
      // If nothing playable, unlock first locked episode if possible
      const firstLocked = episodes.find((ep) => !ep.isFree && !isUnlocked(ep.id));
      if (firstLocked) {
        setUnlockEpisode(firstLocked);
      }
    }
  }, [series, episodes, hasSubscription, isUnlocked, handlePlay]);

  const handleContinue = useCallback(() => {
    if (!series || episodes.length === 0) return;
    // Find episode with most recent progress that isn't completed
    let bestEpisode: Episode | null = null;
    let bestProgress = -1;
    for (const ep of episodes) {
      const prog = getProgress(ep.id);
      if (prog > 0 && prog < ep.durationSeconds - 10) {
        if (prog > bestProgress) {
          bestProgress = prog;
          bestEpisode = ep;
        }
      }
    }
    if (bestEpisode) {
      handlePlay(bestEpisode);
    } else {
      handleStartListening();
    }
  }, [series, episodes, getProgress, handlePlay, handleStartListening]);

  const hasProgress = useMemo(() => {
    if (!episodes.length) return false;
    return episodes.some((ep) => {
      const prog = getProgress(ep.id);
      return prog > 0 && prog < ep.durationSeconds - 10;
    });
  }, [episodes, getProgress]);

  const coverStyle = useMemo(
    () => (series ? getCoverStyle(series.coverUrl) : {}),
    [series],
  );

  // Virtualized episodes list
  const listParentRef = useRef<HTMLDivElement | null>(null);

  // Build virtual items: episodes + optional premium divider
  type VirtualItemData =
    | { type: 'episode'; episode: Episode }
    | { type: 'divider' };

  const virtualItems = useMemo<VirtualItemData[]>(() => {
    const items: VirtualItemData[] = [];
    const lastFreeIdx = episodes.findLastIndex((ep) => ep.isFree);
    const showDivider = lastFreeIdx >= 0 && lastFreeIdx < episodes.length - 1;

    for (let i = 0; i < episodes.length; i++) {
      if (showDivider && i === lastFreeIdx + 1) {
        items.push({ type: 'divider' });
      }
      items.push({ type: 'episode', episode: episodes[i] });
    }
    return items;
  }, [episodes]);

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 76,
    overscan: 5,
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  });

  if (loadingSeries && !series) {
    return (
      <div className="space-y-4 px-2">
        <Skeleton className="h-60 w-full" />
        <Skeleton variant="text" className="h-8 w-2/3" />
        <Skeleton variant="text" className="h-4 w-1/2" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-xl text-gold-bright">Series Not Found</h1>
        <p className="mt-2 text-sm text-text-secondary">
          The series you are looking for does not exist.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(ROUTES.BROWSE)}>
          Browse Series
        </Button>
      </div>
    );
  }

  const favorited = isFavorited(series.id);

  // Determine where to place PremiumDivider (after last free episode)
  // Premium divider logic moved into virtualItems

  return (
    <div className="-mx-4 -mt-4">
      {/* Hero cover */}
      <div
        className="relative h-60 w-full"
        style={coverStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deepest via-bg-deepest/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-wrap gap-2">
              {series.tags.map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
              {series.title}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{series.author}</p>
            <div className="mt-2 flex items-center gap-3">
              <RatingStars rating={series.avgRating} showNumber />
              <span className="text-xs text-text-muted">
                {series.totalEpisodes} episodes
              </span>
              <Badge
                variant={
                  series.status === 'completed'
                    ? 'free'
                    : series.status === 'hiatus'
                      ? 'warning'
                      : 'default'
                }
              >
                {series.status}
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <Button
            variant="primary"
            fullWidth
            leftIcon={hasProgress ? <Headphones size={18} /> : <Play size={18} />}
            onClick={hasProgress ? handleContinue : handleStartListening}
          >
            {hasProgress ? 'Continue' : 'Start Listening'}
          </Button>
          <Button
            variant="secondary"
            className="shrink-0 px-4"
            onClick={() => toggleFavorite(series.id)}
            leftIcon={
              <Heart
                size={18}
                className={favorited ? 'fill-red-500 text-red-500' : 'text-text-secondary'}
              />
            }
          >
            {favorited ? 'Saved' : 'Library'}
          </Button>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-4 text-sm leading-relaxed text-text-secondary"
        >
          {series.description}
        </motion.p>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-4 flex items-center gap-4 rounded-lg border border-bg-hover bg-bg-elevated px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-gold-bright" />
            <span className="text-xs text-text-muted">
              Total Plays:{' '}
              <span className="font-mono font-semibold text-text-primary">
                {series.totalPlays.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="h-4 w-px bg-bg-hover" />
          <div className="flex items-center gap-2">
            <Headphones size={16} className="text-gold-bright" />
            <span className="text-xs text-text-muted">
              Avg Duration:{' '}
              <span className="font-mono font-semibold text-text-primary">
                {episodes.length > 0
                  ? formatDuration(
                      episodes.reduce((sum, ep) => sum + ep.durationSeconds, 0) /
                        episodes.length,
                    )
                  : '--'}
              </span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Episodes list — virtualized */}
      <div className="px-4 pt-6">
        <h2 className="mb-3 font-display text-xl text-gold-bright">Episodes</h2>
        <div
          ref={listParentRef}
          className="space-y-1"
          style={{ maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = virtualItems[virtualItem.index];
              if (!item) return null;

              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${virtualItem.index}`}
                    ref={virtualizer.measureElement}
                    data-index={virtualItem.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <PremiumDivider />
                  </div>
                );
              }

              const ep = item.episode;
              const status = getEpisodeStatus(
                ep,
                isUnlocked(ep.id),
                hasSubscription,
              );
              const progressPercent =
                ep.durationSeconds > 0
                  ? Math.min(
                      100,
                      (getProgress(ep.id) / ep.durationSeconds) * 100,
                    )
                  : 0;

              return (
                <div
                  key={ep.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <EpisodeItem
                    episode={ep}
                    status={status}
                    progress={progressPercent}
                    onPlay={handlePlay}
                    onUnlock={handleUnlock}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Load more sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="py-4 text-center">
            {loadingEpisodes ? (
              <span className="inline-flex items-center gap-2 text-sm text-text-muted">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold/30 border-t-gold-bright" />
                Loading more...
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={loadMore}>
                Load More
              </Button>
            )}
          </div>
        )}

        {!loadingEpisodes && episodes.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">
            No episodes available yet.
          </div>
        )}
      </div>

      {/* Unlock modal */}
      <UnlockConfirmModal
        isOpen={unlockEpisode !== null}
        onClose={() => setUnlockEpisode(null)}
        episode={unlockEpisode}
        onConfirm={handleConfirmUnlock}
      />
    </div>
  );
}
