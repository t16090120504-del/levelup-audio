import type { Episode, Genre, PaginatedResult, Series } from '@/types';
import { genres } from './data/genres';
import { series } from './data/series';
import { getAllEpisodes, getEpisodesBySeries } from './data/episodes';
import { mockDelay } from './mock-delay';

/**
 * Mock content API client.
 *
 * Every method simulates network latency via {@link mockDelay} and returns
 * data sourced from the static mock data modules. This client implements the
 * {@link ContentApi} interface so it can be swapped in for a real API client.
 */
export const mockClient = {
  /** Returns all genres sorted by `sortOrder`. */
  async getGenres(): Promise<Genre[]> {
    await mockDelay();
    return [...genres].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /** Returns a paginated list of series belonging to the given genre slug. */
  async getSeriesByGenre(
    genreSlug: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Series>> {
    await mockDelay();
    const genre = genres.find((g) => g.slug === genreSlug);

    if (!genre) {
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }

    const filtered = series.filter((s) => s.genreId === genre.id);
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      total: filtered.length,
      page,
      pageSize,
      hasMore: start + pageSize < filtered.length,
    };
  },

  /** Returns a single series by ID, or `null` if not found. */
  async getSeriesById(id: string): Promise<Series | null> {
    await mockDelay();
    return series.find((s) => s.id === id) ?? null;
  },

  /** Returns a paginated list of episodes for the given series. */
  async getEpisodesBySeries(
    seriesId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Episode>> {
    await mockDelay();
    const all = getEpisodesBySeries(seriesId);
    const start = (page - 1) * pageSize;
    const data = all.slice(start, start + pageSize);

    return {
      data,
      total: all.length,
      page,
      pageSize,
      hasMore: start + pageSize < all.length,
    };
  },

  /** Returns the top `limit` series by total plays (trending). */
  async getTrendingSeries(limit: number): Promise<Series[]> {
    await mockDelay();
    return [...series]
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .slice(0, limit);
  },

  /** Returns the top `limit` series by average rating. */
  async getTopRatedSeries(limit: number): Promise<Series[]> {
    await mockDelay();
    return [...series]
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, limit);
  },

  /** Returns the `limit` most recently released episodes across all series. */
  async getNewEpisodes(limit: number): Promise<Episode[]> {
    await mockDelay();
    const all = getAllEpisodes();
    return [...all]
      .sort(
        (a, b) =>
          new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime(),
      )
      .slice(0, limit);
  },

  /** Searches series by title, author, or tags (case-insensitive). */
  async searchSeries(query: string): Promise<Series[]> {
    await mockDelay();
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return series.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)),
    );
  },

  /** Returns the featured series (first in the list), or `null` if empty. */
  async getFeaturedSeries(): Promise<Series | null> {
    await mockDelay();
    return series[0] ?? null;
  },
};
