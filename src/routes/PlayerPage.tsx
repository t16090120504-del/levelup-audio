import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FullPlayer } from '@/components/audio/FullPlayer';
import { EpisodeEndOverlay } from '@/components/audio/EpisodeEndOverlay';
import { usePlayerStore } from '@/stores/player-store';
import { useContentStore } from '@/stores/content-store';
import { audioEngine } from '@/services/audio-engine';
import { apiClient } from '@/services/api/client';
import { trackEpisodePlay, trackEpisodeComplete } from '@/services/analytics';
import type { Episode, Series } from '@/types';

import { Skeleton } from '@/components/ui/Skeleton';

/* ------------------------------------------------------------------ */
// Media Session helpers (no-op when browser doesn't support it)
/* ------------------------------------------------------------------ */
function hasMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

function setMediaMetadata(episode: Episode, series: Series, coverUrl?: string) {
  if (!hasMediaSession()) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: episode.title,
    artist: series.author || 'LevelUp Audio',
    album: series.title,
    artwork: coverUrl
      ? [
          { src: coverUrl, sizes: '96x96', type: 'image/png' },
          { src: coverUrl, sizes: '128x128', type: 'image/png' },
          { src: coverUrl, sizes: '192x192', type: 'image/png' },
          { src: coverUrl, sizes: '256x256', type: 'image/png' },
          { src: coverUrl, sizes: '384x384', type: 'image/png' },
          { src: coverUrl, sizes: '512x512', type: 'image/png' },
        ]
      : [],
  });
}

function setMediaPlaybackState(state: 'playing' | 'paused') {
  if (!hasMediaSession()) return;
  navigator.mediaSession.playbackState = state;
}

function setMediaPositionState(duration: number, position: number, playbackRate: number) {
  if (!hasMediaSession()) return;
  try {
    navigator.mediaSession.setPositionState?.({
      duration: Math.max(0, Number.isFinite(duration) ? duration : 0),
      playbackRate,
      position: Math.max(0, Math.min(position, duration)),
    });
  } catch {
    // Some browsers throw if called too early
  }
}

function clearMediaSession() {
  if (!hasMediaSession()) return;
  navigator.mediaSession.metadata = null;
  try {
    navigator.mediaSession.setPositionState?.({
      duration: 0,
      playbackRate: 1,
      position: 0,
    });
  } catch {
    // ignore
  }
}

function registerMediaSessionHandlers(
  handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
    onSkipBack: () => void;
    onSkipForward: () => void;
  },
) {
  if (!hasMediaSession()) return () => {};
  const s = navigator.mediaSession;
  s.setActionHandler('play', handlers.onPlay);
  s.setActionHandler('pause', handlers.onPause);
  s.setActionHandler('nexttrack', handlers.onNext);
  s.setActionHandler('previoustrack', handlers.onPrev);
  s.setActionHandler('seekto', (details) => {
    if (details.seekTime != null) handlers.onSeek(details.seekTime);
  });
  s.setActionHandler('seekbackward', () => handlers.onSkipBack());
  s.setActionHandler('seekforward', () => handlers.onSkipForward());

  return () => {
    s.setActionHandler('play', null);
    s.setActionHandler('pause', null);
    s.setActionHandler('nexttrack', null);
    s.setActionHandler('previoustrack', null);
    s.setActionHandler('seekto', null);
    s.setActionHandler('seekbackward', null);
    s.setActionHandler('seekforward', null);
  };
}

export default function PlayerPage() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const autoPlayNext = usePlayerStore((s) => s.autoPlayNext);
  const showEndOverlay = usePlayerStore((s) => s.showEndOverlay);
  const storeCurrentEpisode = usePlayerStore((s) => s.currentEpisode);
  const storeCurrentSeries = usePlayerStore((s) => s.currentSeries);

  const playEpisode = usePlayerStore((s) => s.playEpisode);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const setAutoPlayNext = usePlayerStore((s) => s.setAutoPlayNext);
  const setShowEndOverlay = usePlayerStore((s) => s.setShowEndOverlay);
  const _onTimeUpdate = usePlayerStore((s) => s._onTimeUpdate);
  const _onEnded = usePlayerStore((s) => s._onEnded);
  const _onLoadedMetadata = usePlayerStore((s) => s._onLoadedMetadata);
  const _onError = usePlayerStore((s) => s._onError);
  const _onPlayStateChange = usePlayerStore((s) => s._onPlayStateChange);

  const isUnlocked = useContentStore((s) => s.isUnlocked);
  const saveProgress = useContentStore((s) => s.saveProgress);
  const unlockEpisode = useContentStore((s) => s.unlockEpisode);

  // Load episode & series data
  useEffect(() => {
    if (!episodeId) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Try to reuse store data first
        if (storeCurrentEpisode?.id === episodeId && storeCurrentSeries) {
          if (!cancelled) {
            setEpisode(storeCurrentEpisode);
            setSeries(storeCurrentSeries);
          }
        }

        // Fetch all episodes to build queue and find the target episode
        // Since we don't have a direct getEpisodeById API, we scan all series
        const allSeriesRes = await apiClient.content.getTrendingSeries(100);
        let foundEpisode: Episode | null = null;
        let foundSeries: Series | null = null;
        let allEpisodes: Episode[] = [];

        for (const s of allSeriesRes) {
          const epsRes = await apiClient.content.getEpisodesBySeries(s.id, 1, 100);
          const ep = epsRes.data.find((e) => e.id === episodeId);
          if (ep) {
            foundEpisode = ep;
            foundSeries = s;
            allEpisodes = epsRes.data;
            break;
          }
        }

        if (cancelled) return;

        if (foundEpisode && foundSeries) {
          setEpisode(foundEpisode);
          setSeries(foundSeries);
          setQueue(allEpisodes);
          // Auto-play if not already playing this episode
          if (storeCurrentEpisode?.id !== foundEpisode.id) {
            playEpisode(foundEpisode, foundSeries);
          }
        }
      } catch (err) {
        console.error('Failed to load episode', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [episodeId, storeCurrentEpisode, storeCurrentSeries, playEpisode]);

  // Track an "episode_play" analytics event once per episode when it starts playing.
  const trackedPlayIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!episode || !isPlaying) return;
    if (trackedPlayIdRef.current === episode.id) return;
    trackedPlayIdRef.current = episode.id;
    trackEpisodePlay(episode);
  }, [episode, isPlaying]);

  // Keep a ref to the current episode so the audio 'ended' handler can read
  // the latest value without re-subscribing on every episode change.
  const episodeRef = useRef<Episode | null>(null);
  useEffect(() => {
    episodeRef.current = episode;
  }, [episode]);

  // Subscribe to audio engine events
  useEffect(() => {
    const onTimeUpdate = (time: number | Event | undefined) => {
      if (typeof time === 'number') _onTimeUpdate(time);
    };
    const onEnded = () => {
      // Track completion for the episode that just finished (before the store
      // possibly advances to the next one via auto-play).
      if (episodeRef.current) trackEpisodeComplete(episodeRef.current);
      _onEnded();
    };
    const onLoadedMetadata = (duration: number | Event | undefined) => {
      if (typeof duration === 'number') _onLoadedMetadata(duration);
    };
    const onError = (err: number | Event | undefined) => {
      _onError(err instanceof Event ? 'Audio playback error' : String(err ?? 'Unknown error'));
    };
    const onPlay = () => _onPlayStateChange(true);
    const onPause = () => _onPlayStateChange(false);

    audioEngine.on('timeupdate', onTimeUpdate);
    audioEngine.on('ended', onEnded);
    audioEngine.on('loadedmetadata', onLoadedMetadata);
    audioEngine.on('error', onError);
    audioEngine.on('play', onPlay);
    audioEngine.on('pause', onPause);

    return () => {
      audioEngine.off('timeupdate', onTimeUpdate);
      audioEngine.off('ended', onEnded);
      audioEngine.off('loadedmetadata', onLoadedMetadata);
      audioEngine.off('error', onError);
      audioEngine.off('play', onPlay);
      audioEngine.off('pause', onPause);
    };
  }, [_onTimeUpdate, _onEnded, _onLoadedMetadata, _onError, _onPlayStateChange]);

  // --- Media Session API integration ---
  // 1. Set metadata when episode/series changes
  useEffect(() => {
    if (!episode || !series) return;
    setMediaMetadata(episode, series);
  }, [episode, series]);

  // 2. Register action handlers once
  useEffect(() => {
    if (!episode || !series) return;
    const unregister = registerMediaSessionHandlers({
      onPlay: togglePlayPause,
      onPause: togglePlayPause,
      onNext: playNext,
      onPrev: playPrev,
      onSeek: seek,
      onSkipBack: handleSkipBack,
      onSkipForward: handleSkipForward,
    });
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id, series?.id]);

  // 3. Sync playback state
  useEffect(() => {
    setMediaPlaybackState(isPlaying ? 'playing' : 'paused');
  }, [isPlaying]);

  // 4. Sync position state (throttled via requestAnimationFrame)
  useEffect(() => {
    setMediaPositionState(duration, currentTime, playbackRate);
  }, [duration, currentTime, playbackRate]);

  // Save progress every 10 seconds
  const lastSaveRef = useRef(0);
  useEffect(() => {
    if (!episode || !currentTime || currentTime < 1) return;
    const now = Date.now();
    if (now - lastSaveRef.current >= 10000) {
      lastSaveRef.current = now;
      saveProgress(episode.id, currentTime, currentTime >= duration * 0.95);
    }
  }, [currentTime, episode, duration, saveProgress]);

  const handleSkipBack = useCallback(() => {
    const t = Math.max(0, currentTime - 15);
    seek(t);
  }, [currentTime, seek]);

  const handleSkipForward = useCallback(() => {
    const t = Math.min(duration || Infinity, currentTime + 30);
    seek(t);
  }, [currentTime, duration, seek]);

  const handleUnlockNext = useCallback(
    async (ep: Episode) => {
      const res = await apiClient.coin.unlockEpisode(ep.id, ep.unlockCostCoins);
      if (res.success) {
        unlockEpisode(ep.id);
      }
    },
    [unlockEpisode],
  );

  const handlePlayNext = useCallback(
    (ep: Episode) => {
      if (series) {
        playEpisode(ep, series);
      }
    },
    [series, playEpisode],
  );

  const currentIndex = queue.findIndex((e) => e.id === episode?.id);
  const nextEpisode = currentIndex >= 0 && currentIndex < queue.length - 1 ? queue[currentIndex + 1] : null;

  // Cleanup Media Session on unmount
  useEffect(() => {
    return () => {
      clearMediaSession();
    };
  }, []);

  const handleSkipOverlay = useCallback(() => {
    setShowEndOverlay(false);
  }, [setShowEndOverlay]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <Skeleton className="h-64 w-64 rounded-xl" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!episode || !series) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="mb-2 font-display text-2xl text-gold-bright">Episode Not Found</h1>
          <p className="text-text-secondary">The episode you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <FullPlayer
        episode={episode}
        series={series}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        playbackRate={playbackRate}
        autoPlayNext={autoPlayNext}
        onTogglePlay={togglePlayPause}
        onPrev={playPrev}
        onNext={playNext}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onSeek={seek}
        onVolumeChange={setVolume}
        onSpeedChange={setPlaybackRate}
        onAutoPlayToggle={() => setAutoPlayNext(!autoPlayNext)}
        onBack={() => navigate(-1)}
      />

      <AnimatePresence>
        {showEndOverlay && nextEpisode && (
          <EpisodeEndOverlay
            nextEpisode={nextEpisode}
            isUnlocked={isUnlocked(nextEpisode.id)}
            onUnlock={handleUnlockNext}
            onSkip={handleSkipOverlay}
            onPlayNext={handlePlayNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
