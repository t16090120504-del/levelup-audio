import type { Episode, Genre, PaginatedResult, Series } from '@/types';

/**
 * Content API interface.
 *
 * Defines all content-related operations (genres, series, episodes, search).
 * The mock client ({@link mockClient}) and any future real API client must
 * implement this interface.
 */
export interface ContentApi {
  /** Fetch all available genres. */
  getGenres(): Promise<Genre[]>;

  /** Fetch a paginated list of series within a genre. */
  getSeriesByGenre(
    genreSlug: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Series>>;

  /** Fetch a single series by its ID. */
  getSeriesById(id: string): Promise<Series | null>;

  /** Fetch a paginated list of episodes for a given series. */
  getEpisodesBySeries(
    seriesId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Episode>>;

  /** Fetch trending series (sorted by total plays). */
  getTrendingSeries(limit: number): Promise<Series[]>;

  /** Fetch top-rated series (sorted by average rating). */
  getTopRatedSeries(limit: number): Promise<Series[]>;

  /** Fetch the most recently released episodes. */
  getNewEpisodes(limit: number): Promise<Episode[]>;

  /** Search series by query (title, author, or tags). */
  searchSeries(query: string): Promise<Series[]>;

  /** Fetch the featured series for the home page. */
  getFeaturedSeries(): Promise<Series | null>;
}
