import type { ContentApi } from '@/services/api/content-api';
import type { Episode, Genre, PaginatedResult, Series } from '@/types';
import { supabase } from '@/services/supabase-client';
import { mapRow, mapRows } from '@/services/supabase/utils';

/**
 * Supabase-backed implementation of the ContentApi interface.
 *
 * All content queries (genres, series, episodes, search, etc.) are public
 * and do not require authentication. Row-Level Security (RLS) policies on
 * the Supabase tables allow anon access for SELECT operations.
 */
export const supabaseContentApi: ContentApi = {
  async getGenres(): Promise<Genre[]> {
    const { data, error } = await supabase
      .from('genres')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return mapRows<Genre>(data ?? []);
  },

  async getSeriesByGenre(
    genreSlug: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Series>> {
    // First resolve the genre slug to a genre ID
    const { data: genreRows, error: genreError } = await supabase
      .from('genres')
      .select('id')
      .eq('slug', genreSlug)
      .single();

    if (genreError) throw genreError;
    if (!genreRows) {
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }

    const genreId = genreRows.id;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from('series')
      .select('*', { count: 'exact' })
      .eq('genre_id', genreId)
      .order('total_plays', { ascending: false })
      .range(start, end);

    if (error) throw error;

    return {
      data: mapRows<Series>(data ?? []),
      total: count ?? 0,
      page,
      pageSize,
      hasMore: (count ?? 0) > end + 1,
    };
  },

  async getSeriesById(id: string): Promise<Series | null> {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return mapRow<Series>(data);
  },

  async getEpisodesBySeries(
    seriesId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Episode>> {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from('episodes')
      .select('*', { count: 'exact' })
      .eq('series_id', seriesId)
      .order('episode_number', { ascending: true })
      .range(start, end);

    if (error) throw error;

    return {
      data: mapRows<Episode>(data ?? []),
      total: count ?? 0,
      page,
      pageSize,
      hasMore: (count ?? 0) > end + 1,
    };
  },

  async getTrendingSeries(limit: number): Promise<Series[]> {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('total_plays', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return mapRows<Series>(data ?? []);
  },

  async getTopRatedSeries(limit: number): Promise<Series[]> {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('avg_rating', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return mapRows<Series>(data ?? []);
  },

  async getNewEpisodes(limit: number): Promise<Episode[]> {
    const { data, error } = await supabase
      .from('episodes')
      .select('*, series(*)')
      .order('released_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // The response includes nested series data. Map episodes only.
    return (data ?? []).map((row) => {
      const episode = mapRow<Episode>(row);
      return episode;
    });
  },

  async searchSeries(query: string): Promise<Series[]> {
    const q = query.trim();
    if (!q) return [];

    const { data, error } = await supabase
      .from('series')
      .select('*')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(50);

    if (error) throw error;
    return mapRows<Series>(data ?? []);
  },

  async getFeaturedSeries(): Promise<Series | null> {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('featured', true)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return mapRow<Series>(data);
  },
};
