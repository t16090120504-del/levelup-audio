import type { UserApi } from '@/services/api/user-api';
import type { ListeningProgress } from '@/types';
import { supabase } from '@/services/supabase-client';
import { mapRow } from '@/services/supabase/utils';

/**
 * Helper: get the current authenticated user's ID.
 * Returns `null` if no session is active.
 */
async function getUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Supabase-backed implementation of the UserApi interface.
 *
 * All user-specific operations (favorites, progress, downloads) require
 * an authenticated user. When the user is not logged in, methods return
 * empty data.
 */
export const supabaseUserApi: UserApi = {
  async getFavorites(): Promise<string[]> {
    const userId = await getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('favorites')
      .select('series_id')
      .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map((row) => row.series_id as string);
  },

  async toggleFavorite(seriesId: string): Promise<boolean> {
    const userId = await getUserId();
    if (!userId) throw new Error('User must be authenticated to toggle favorites');

    // Check if already favorited
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('series_id', seriesId)
      .limit(1);

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('series_id', seriesId);
      if (deleteError) throw deleteError;
      return false;
    }

    // Add to favorites
    const { error: insertError } = await supabase.from('favorites').insert({
      user_id: userId,
      series_id: seriesId,
    });
    if (insertError) throw insertError;
    return true;
  },

  async getListeningProgress(): Promise<Record<string, ListeningProgress>> {
    const userId = await getUserId();
    if (!userId) return {};

    const { data, error } = await supabase
      .from('listening_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const result: Record<string, ListeningProgress> = {};
    for (const row of data ?? []) {
      const mapped = mapRow<ListeningProgress>(row);
      result[mapped.episodeId] = mapped;
    }
    return result;
  },

  async saveProgress(
    episodeId: string,
    position: number,
    completed: boolean,
  ): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    // Upsert: use onConflict to handle existing records
    const { error } = await supabase.from('listening_progress').upsert(
      {
        user_id: userId,
        episode_id: episodeId,
        position_seconds: position,
        completed,
        last_played_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,episode_id' },
    );

    if (error) throw error;
  },

  async getDownloadedEpisodes(): Promise<string[]> {
    // Download functionality is not supported yet
    return [];
  },
};
