import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Series, Episode } from '@/types';
import { apiClient } from '@/services/api/client';
import { usePlayerStore } from '@/stores/player-store';
import { useContentStore } from '@/stores/content-store';
import { BannerCarousel } from '@/components/content/BannerCarousel';
import { DailyBonus } from '@/components/coin/DailyBonus';
import { HorizontalSeriesRow } from '@/components/content/HorizontalSeriesRow';
import { EpisodeItem } from '@/components/content/EpisodeItem';
import { SectionHeader } from '@/components/content/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';

function getEpisodeStatus(
  episode: Episode,
  isUnlocked: (id: string) => boolean,
  hasSubscription: boolean,
): 'free' | 'unlocked' | 'locked' {
  if (episode.isFree || hasSubscription) return 'free';
  if (isUnlocked(episode.id)) return 'unlocked';
  return 'locked';
}

export default function HomePage() {
  const navigate = useNavigate();
  const playEpisode = usePlayerStore((s) => s.playEpisode);
  const isUnlocked = useContentStore((s) => s.isUnlocked);
  const getProgress = useContentStore((s) => s.getProgress);

  const [loading, setLoading] = useState(true);
  const [bannerSeries, setBannerSeries] = useState<Series[]>([]);
  const [trending, setTrending] = useState<Series[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<Episode[]>([]);
  const [topRated, setTopRated] = useState<Series[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [featured, trendingRes, newEpisodesRes, topRatedRes] = await Promise.all([
          apiClient.content.getFeaturedSeries(),
          apiClient.content.getTrendingSeries(10),
          apiClient.content.getNewEpisodes(10),
          apiClient.content.getTopRatedSeries(10),
        ]);

        if (cancelled) return;

        const banner = featured
          ? [featured, ...trendingRes.slice(0, 2)]
          : trendingRes.slice(0, 3);

        setBannerSeries(banner);
        setTrending(trendingRes);
        setNewEpisodes(newEpisodesRes);
        setTopRated(topRatedRes);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSeriesClick = (series: Series) => {
    navigate(`/series/${series.id}`);
  };

  const handlePlayEpisode = async (episode: Episode) => {
    try {
      const series = await apiClient.content.getSeriesById(episode.seriesId);
      if (series) {
        playEpisode(episode, series);
      }
    } catch (err) {
      console.error('Failed to play episode:', err);
    }
  };

  const hasSubscription = false;

  if (loading) {
    return (
      <div className="space-y-6 px-4 pt-4 pb-28">
        <Skeleton variant="rect" className="h-60 w-full rounded-2xl" />
        <Skeleton variant="rect" className="h-24 w-full rounded-xl" />

        <div className="space-y-3">
          <Skeleton variant="text" className="h-6 w-40" />
          <div className="flex gap-3">
            <Skeleton variant="rect" className="h-44 w-40 shrink-0 rounded-xl" />
            <Skeleton variant="rect" className="h-44 w-40 shrink-0 rounded-xl" />
            <Skeleton variant="rect" className="h-44 w-40 shrink-0 rounded-xl" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton variant="text" className="h-6 w-40" />
          <Skeleton variant="rect" className="h-20 w-full rounded-xl" />
          <Skeleton variant="rect" className="h-20 w-full rounded-xl" />
          <Skeleton variant="rect" className="h-20 w-full rounded-xl" />
        </div>

        <div className="space-y-3">
          <Skeleton variant="text" className="h-6 w-40" />
          <div className="flex gap-3">
            <Skeleton variant="rect" className="h-44 w-40 shrink-0 rounded-xl" />
            <Skeleton variant="rect" className="h-44 w-40 shrink-0 rounded-xl" />
            <Skeleton variant="rect" className="h-44 w-40 shrink-0 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pt-4 pb-28">
      {/* Banner */}
      <BannerCarousel series={bannerSeries} onSeriesClick={handleSeriesClick} />

      {/* Daily Bonus */}
      <DailyBonus />

      {/* Trending */}
      <section>
        <SectionHeader title="Trending" />
        <HorizontalSeriesRow series={trending} onSeriesClick={handleSeriesClick} />
      </section>

      {/* New Episodes Today */}
      <section>
        <SectionHeader title="New Episodes Today" />
        <div className="space-y-1">
          {newEpisodes.map((episode) => (
            <EpisodeItem
              key={episode.id}
              episode={episode}
              status={getEpisodeStatus(episode, isUnlocked, hasSubscription)}
              progress={getProgress(episode.id)}
              onPlay={handlePlayEpisode}
            />
          ))}
        </div>
      </section>

      {/* Top Rated */}
      <section>
        <SectionHeader title="Top Rated" />
        <HorizontalSeriesRow series={topRated} onSeriesClick={handleSeriesClick} />
      </section>
    </div>
  );
}
