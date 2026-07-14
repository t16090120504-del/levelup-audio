import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { Episode, Series } from '@/types';
import { supabase } from '@/services/supabase-client';

/**
 * Analytics event types tracked across the application.
 */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  EPISODE_PLAY: 'episode_play',
  EPISODE_COMPLETE: 'episode_complete',
  COIN_PURCHASE: 'coin_purchase',
  SERIES_VIEW: 'series_view',
  SEARCH: 'search',
} as const;

export type AnalyticsEventType =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Internal, awaitable implementation. Resolves once the insert attempt
 * finishes (success or failure). All errors are swallowed so that analytics
 * tracking can never break the user experience.
 */
async function trackEventAsync(
  eventType: string,
  eventData?: Record<string, unknown>,
): Promise<void> {
  try {
    // Resolve the current user so we can associate the event (nullable for anon).
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    const { error } = await supabase.from('analytics_events').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData ?? null,
    });

    if (error) throw error;
  } catch {
    // Fire-and-forget: analytics must never interrupt the app.
    // Silently ignore network, permission, or table-existence errors.
  }
}

/**
 * Track an analytics event. Non-blocking (fire-and-forget): callers do not
 * need to await it, and any failure is caught silently.
 *
 * @example
 * trackEvent('page_view', { path: '/home' });
 * trackEvent('episode_play', { episodeId, title });
 */
export function trackEvent(
  eventType: AnalyticsEventType | string,
  eventData?: Record<string, unknown>,
): void {
  void trackEventAsync(eventType, eventData);
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                         */
/* -------------------------------------------------------------------------- */

/** Track a page/route view. */
export function trackPageView(path: string, extra?: Record<string, unknown>): void {
  trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { path, ...extra });
}

/** Track when a user opens a series detail page or taps a series card. */
export function trackSeriesView(series: Series | Pick<Series, 'id' | 'title'>): void {
  trackEvent(ANALYTICS_EVENTS.SERIES_VIEW, {
    seriesId: series.id,
    title: series.title,
  });
}

/** Track when an episode starts playing. */
export function trackEpisodePlay(
  episode: Episode | Pick<Episode, 'id' | 'title' | 'seriesId' | 'episodeNumber'>,
): void {
  trackEvent(ANALYTICS_EVENTS.EPISODE_PLAY, {
    episodeId: episode.id,
    title: episode.title,
    seriesId: episode.seriesId,
    episodeNumber: episode.episodeNumber,
  });
}

/** Track when an episode finishes (reaches the end). */
export function trackEpisodeComplete(
  episode: Episode | Pick<Episode, 'id' | 'title' | 'seriesId' | 'episodeNumber'>,
): void {
  trackEvent(ANALYTICS_EVENTS.EPISODE_COMPLETE, {
    episodeId: episode.id,
    title: episode.title,
    seriesId: episode.seriesId,
    episodeNumber: episode.episodeNumber,
  });
}

/**
 * Track a coin purchase attempt (either initiated or completed).
 * @param outcome 'initiated' | 'success' | 'failed'
 */
export function trackCoinPurchase(
  packId: string,
  coins: number,
  outcome: 'initiated' | 'success' | 'failed' = 'initiated',
  extra?: Record<string, unknown>,
): void {
  trackEvent(ANALYTICS_EVENTS.COIN_PURCHASE, {
    packId,
    coins,
    outcome,
    ...extra,
  });
}

/** Track a user search query. */
export function trackSearch(query: string, resultCount?: number): void {
  trackEvent(ANALYTICS_EVENTS.SEARCH, {
    query,
    resultCount,
  });
}

/* -------------------------------------------------------------------------- */
/* Auto page-view tracking hook                                                */
/* -------------------------------------------------------------------------- */

/**
 * React hook that automatically tracks a `page_view` event whenever the
 * route changes. Mount this once inside the <BrowserRouter> (e.g. in App).
 *
 * It debounces duplicate consecutive paths and skips programmatic popstate
 * noise by tracking only the pathname.
 */
export function usePageTracking(): void {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;
    trackPageView(path, { search: location.search || undefined });
  }, [location.pathname, location.search]);
}
