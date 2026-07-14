import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Pencil,
  Play,
  Pause,
  Square,
  Filter,
  CheckCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Headphones,
  BookOpen,
} from 'lucide-react';
import { adminSupabase } from '@/services/supabase/admin-client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDuration } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface PendingEpisode {
  id: string;
  series_id: string;
  title: string;
  description: string;
  episode_number: number;
  season_number: number;
  duration_seconds: number;
  audio_url: string;
  created_at: string;
  review_status: ReviewStatus;
  review_notes: string | null;
  // Joined series info
  series_title?: string;
  series_genre_id?: string;
}

interface PendingSeries {
  id: string;
  title: string;
  description: string;
  author: string;
  cover_url: string;
  genre_id: string;
  created_at: string;
  review_status: ReviewStatus;
  review_notes: string | null;
  genre_name?: string;
}

interface GenreOption {
  id: string;
  name: string;
  slug: string;
}

interface SeriesOption {
  id: string;
  title: string;
}

type TabKey = 'episodes' | 'series';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'text-status-warning',
  approved: 'text-status-free',
  rejected: 'text-status-danger',
};

const STATUS_BG: Record<ReviewStatus, string> = {
  pending: 'bg-status-warning/10 border-status-warning/30',
  approved: 'bg-status-free/10 border-status-free/30',
  rejected: 'bg-status-danger/10 border-status-danger/30',
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BG[status]} ${STATUS_COLORS[status]}`}
    >
      {status === 'pending' && <Clock size={12} />}
      {status === 'approved' && <CheckCircle2 size={12} />}
      {status === 'rejected' && <XCircle size={12} />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Audio Player Hook
// ---------------------------------------------------------------------------

function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadUrl = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => setPlaying(false));
    audioRef.current = audio;
    setPlaying(false);
    setCurrentTime(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  return { playing, currentTime, duration, loadUrl, togglePlay, stop };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminReviewPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('episodes');

  // Data state
  const [episodes, setEpisodes] = useState<PendingEpisode[]>([]);
  const [series, setSeries] = useState<PendingSeries[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);

  // Loading / error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Expanded item (detail panel)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterGenre, setFilterGenre] = useState('');
  const [filterSeries, setFilterSeries] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState<{
    type: 'episode' | 'series';
    id: string;
    title: string;
    description: string;
    reviewNotes: string;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Reject modal (for notes)
  const [rejectModal, setRejectModal] = useState<{
    type: 'episode' | 'series';
    id: string;
    title: string;
  } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  // Audio player
  const { playing, currentTime, duration, loadUrl, togglePlay, stop } =
    useAudioPlayer();

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadPendingItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load genres for filter
      const { data: genreData } = await adminSupabase
        .from('genres')
        .select('id, name, slug')
        .order('name', { ascending: true });
      setGenres((genreData ?? []) as GenreOption[]);

      // Load series list for filter
      const { data: sList } = await adminSupabase
        .from('series')
        .select('id, title')
        .order('title', { ascending: true });
      setSeriesList((sList ?? []) as SeriesOption[]);

      // Load pending episodes (join series for title & genre)
      const { data: epData, error: epError } = await adminSupabase
        .from('episodes')
        .select('*, series(title, genre_id)')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false });
      if (epError) throw epError;

      const mappedEpisodes = (epData ?? []).map((row: any) => ({
        id: row.id,
        series_id: row.series_id,
        title: row.title,
        description: row.description ?? '',
        episode_number: row.episode_number,
        season_number: row.season_number ?? 1,
        duration_seconds: row.duration_seconds ?? 0,
        audio_url: row.audio_url ?? '',
        created_at: row.created_at,
        review_status: row.review_status,
        review_notes: row.review_notes ?? null,
        series_title: row.series?.title ?? '',
        series_genre_id: row.series?.genre_id ?? '',
      }));
      setEpisodes(mappedEpisodes as PendingEpisode[]);

      // Load pending series (join genre for name)
      const { data: srData, error: srError } = await adminSupabase
        .from('series')
        .select('*, genres(name)')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false });
      if (srError) throw srError;

      const mappedSeries = (srData ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? '',
        author: row.author ?? '',
        cover_url: row.cover_url ?? '',
        genre_id: row.genre_id ?? '',
        created_at: row.created_at,
        review_status: row.review_status,
        review_notes: row.review_notes ?? null,
        genre_name: row.genres?.name ?? '',
      }));
      setSeries(mappedSeries as PendingSeries[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingItems();
  }, [loadPendingItems]);

  // -----------------------------------------------------------------------
  // Filter helpers
  // -----------------------------------------------------------------------

  const filteredEpisodes = episodes.filter((ep) => {
    if (filterGenre && ep.series_genre_id !== filterGenre) return false;
    if (filterSeries && ep.series_id !== filterSeries) return false;
    return true;
  });

  const filteredSeries = series.filter((s) => {
    if (filterGenre && s.genre_id !== filterGenre) return false;
    return true;
  });

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const updateReviewStatus = useCallback(
    async (
      type: 'episode' | 'series',
      id: string,
      status: ReviewStatus,
      notes?: string,
    ) => {
      setActionLoading(id);
      try {
        const payload: any = { review_status: status };
        if (notes !== undefined) payload.review_notes = notes;

        const { error: updateError } = await adminSupabase
          .from(type === 'episode' ? 'episodes' : 'series')
          .update(payload)
          .eq('id', id);
        if (updateError) throw updateError;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status.');
      } finally {
        setActionLoading(null);
        await loadPendingItems();
      }
    },
    [loadPendingItems],
  );

  const handleApprove = (type: 'episode' | 'series', id: string) => {
    void updateReviewStatus(type, id, 'approved');
  };

  const openRejectModal = (type: 'episode' | 'series', id: string, title: string) => {
    setRejectModal({ type, id, title });
    setRejectNotes('');
  };

  const handleReject = () => {
    if (!rejectModal) return;
    setRejectSaving(true);
    updateReviewStatus(rejectModal.type, rejectModal.id, 'rejected', rejectNotes || undefined).then(
      () => {
        setRejectSaving(false);
        setRejectModal(null);
      },
    );
  };

  const openEditModal = (
    type: 'episode' | 'series',
    id: string,
    title: string,
    description: string,
    reviewNotes: string,
  ) => {
    setEditModal({ type, id, title, description, reviewNotes });
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setEditSaving(true);
    try {
      const { error } = await adminSupabase
        .from(editModal.type === 'episode' ? 'episodes' : 'series')
        .update({
          title: editModal.title,
          description: editModal.description,
          review_notes: editModal.reviewNotes || null,
        })
        .eq('id', editModal.id);
      if (error) throw error;
      setEditModal(null);
      await loadPendingItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleApproveAll = () => {
    const items =
      activeTab === 'episodes'
        ? filteredEpisodes.map((e) => ({ type: 'episode' as const, id: e.id }))
        : filteredSeries.map((s) => ({ type: 'series' as const, id: s.id }));

    if (items.length === 0) return;

    void Promise.all(
      items.map((item) => updateReviewStatus(item.type, item.id, 'approved')),
    );
  };

  const handleExpand = (id: string, audioUrl?: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      stop();
    } else {
      setExpandedId(id);
      if (audioUrl) {
        loadUrl(audioUrl);
      } else {
        stop();
      }
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const pendingCount = activeTab === 'episodes' ? filteredEpisodes.length : filteredSeries.length;
  const totalPending = episodes.length + series.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-gold-bright">Content Review</h1>
          <p className="mt-1 text-sm text-text-muted">
            Review and moderate content before it goes live.{' '}
            <span className="font-medium text-gold-bright">
              {totalPending} pending item{totalPending !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <Button
          leftIcon={<CheckCheck size={16} />}
          onClick={handleApproveAll}
          disabled={pendingCount === 0}
        >
          Approve All ({pendingCount})
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Filter size={14} />
          <span>Filter:</span>
        </div>
        <select
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
          className="rounded-lg border border-bg-hover bg-bg-elevated px-3 py-1.5 text-sm text-text-secondary outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={filterSeries}
          onChange={(e) => setFilterSeries(e.target.value)}
          className="rounded-lg border border-bg-hover bg-bg-elevated px-3 py-1.5 text-sm text-text-secondary outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
        >
          <option value="">All Series</option>
          {seriesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        {(filterGenre || filterSeries) && (
          <button
            type="button"
            onClick={() => {
              setFilterGenre('');
              setFilterSeries('');
            }}
            className="text-xs text-gold-bright hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bg-hover">
        <button
          type="button"
          onClick={() => {
            setActiveTab('episodes');
            setExpandedId(null);
            stop();
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'episodes'
              ? 'border-gold-bright text-gold-bright'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          <Headphones size={16} />
          Pending Episodes
          {episodes.length > 0 && (
            <span className="rounded-full bg-status-warning/20 px-2 py-0.5 text-xs text-status-warning">
              {episodes.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('series');
            setExpandedId(null);
            stop();
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'series'
              ? 'border-gold-bright text-gold-bright'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          <BookOpen size={16} />
          Pending Series
          {series.length > 0 && (
            <span className="rounded-full bg-status-warning/20 px-2 py-0.5 text-xs text-status-warning">
              {series.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-jrpg p-4">
              <div className="flex items-center gap-4">
                <Skeleton variant="text" className="h-5 w-48" />
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="ml-auto h-4 w-24" />
              </div>
            </div>
          ))
        ) : activeTab === 'episodes' ? (
          filteredEpisodes.length === 0 ? (
            <div className="card-jrpg flex flex-col items-center gap-3 py-16 text-text-muted">
              <CheckCircle2 size={40} className="opacity-40" />
              <p className="text-sm">
                {episodes.length === 0
                  ? 'No pending episodes to review.'
                  : 'No episodes match the current filters.'}
              </p>
            </div>
          ) : (
            filteredEpisodes.map((ep) => (
              <div key={ep.id} className="card-jrpg overflow-hidden">
                {/* Item row */}
                <button
                  type="button"
                  onClick={() => handleExpand(ep.id, ep.audio_url)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-bg-elevated/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">
                        {ep.title}
                      </span>
                      <StatusBadge status={ep.review_status} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-text-muted">
                      {ep.series_title && (
                        <span className="truncate">
                          Series: <span className="text-text-secondary">{ep.series_title}</span>
                        </span>
                      )}
                      <span>
                        S{ep.season_number}E{ep.episode_number}
                      </span>
                      {ep.audio_url && (
                        <span className="flex items-center gap-1 text-status-free">
                          <Play size={10} /> Has audio
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-xs text-text-muted">
                      {formatDate(ep.created_at)}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatDuration(ep.duration_seconds)}
                    </p>
                  </div>
                  {expandedId === ep.id ? (
                    <ChevronUp size={16} className="shrink-0 text-text-muted" />
                  ) : (
                    <ChevronDown size={16} className="shrink-0 text-text-muted" />
                  )}
                </button>

                {/* Expanded detail panel */}
                {expandedId === ep.id && (
                  <div className="border-t border-bg-hover bg-bg-deep/50 px-4 py-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Left: content */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Description
                          </h3>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                            {ep.description || '(No description provided)'}
                          </p>
                        </div>

                        {/* Audio player */}
                        {ep.audio_url && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                              Audio Preview
                            </h3>
                            <div className="mt-2 flex items-center gap-3 rounded-lg border border-bg-hover bg-bg-elevated px-4 py-3">
                              <button
                                type="button"
                                onClick={togglePlay}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-bright text-bg-deepest transition-transform hover:scale-105"
                              >
                                {playing ? (
                                  <Pause size={16} />
                                ) : (
                                  <Play size={16} className="ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="h-1.5 w-full rounded-full bg-bg-hover">
                                  <div
                                    className="h-full rounded-full bg-gold-bright transition-all"
                                    style={{
                                      width: duration
                                        ? `${(currentTime / duration) * 100}%`
                                        : '0%',
                                    }}
                                  />
                                </div>
                                <div className="mt-1 flex justify-between text-xs text-text-muted">
                                  <span>{formatDuration(Math.floor(currentTime))}</span>
                                  <span>{formatDuration(Math.floor(duration))}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={stop}
                                className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                                aria-label="Stop playback"
                              >
                                <Square size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Review notes */}
                        {ep.review_notes && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                              Review Notes
                            </h3>
                            <p className="mt-1 text-sm text-text-secondary">
                              {ep.review_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div className="flex flex-col gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          Actions
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            leftIcon={<CheckCircle2 size={14} />}
                            onClick={() => handleApprove('episode', ep.id)}
                            loading={actionLoading === ep.id}
                            disabled={actionLoading !== null && actionLoading !== ep.id}
                            className="bg-status-free/20 text-status-free hover:bg-status-free/30 border border-status-free/30"
                          >
                            Approve
                          </Button>
                          <Button
                            leftIcon={<XCircle size={14} />}
                            onClick={() =>
                              openRejectModal('episode', ep.id, ep.title)
                            }
                            disabled={actionLoading !== null && actionLoading !== ep.id}
                            variant="secondary"
                            className="text-status-danger hover:bg-status-danger/10 border border-status-danger/30"
                          >
                            Reject
                          </Button>
                          <Button
                            leftIcon={<Pencil size={14} />}
                            onClick={() =>
                              openEditModal(
                                'episode',
                                ep.id,
                                ep.title,
                                ep.description,
                                ep.review_notes ?? '',
                              )
                            }
                            disabled={actionLoading !== null && actionLoading !== ep.id}
                            variant="secondary"
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        ) : // Series tab
        filteredSeries.length === 0 ? (
          <div className="card-jrpg flex flex-col items-center gap-3 py-16 text-text-muted">
            <CheckCircle2 size={40} className="opacity-40" />
            <p className="text-sm">
              {series.length === 0
                ? 'No pending series to review.'
                : 'No series match the current filters.'}
            </p>
          </div>
        ) : (
          filteredSeries.map((s) => (
            <div key={s.id} className="card-jrpg overflow-hidden">
              {/* Item row */}
              <button
                type="button"
                onClick={() => handleExpand(s.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-bg-elevated/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary truncate">
                      {s.title}
                    </span>
                    <StatusBadge status={s.review_status} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-text-muted">
                    <span>
                      by <span className="text-text-secondary">{s.author}</span>
                    </span>
                    {s.genre_name && (
                      <span>
                        Genre: <span className="text-text-secondary">{s.genre_name}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-xs text-text-muted">
                    {formatDate(s.created_at)}
                  </p>
                </div>
                {expandedId === s.id ? (
                  <ChevronUp size={16} className="shrink-0 text-text-muted" />
                ) : (
                  <ChevronDown size={16} className="shrink-0 text-text-muted" />
                )}
              </button>

              {/* Expanded detail panel */}
              {expandedId === s.id && (
                <div className="border-t border-bg-hover bg-bg-deep/50 px-4 py-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Left: content */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          Synopsis
                        </h3>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                          {s.description || '(No description provided)'}
                        </p>
                      </div>

                      {s.review_notes && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Review Notes
                          </h3>
                          <p className="mt-1 text-sm text-text-secondary">
                            {s.review_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Actions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          leftIcon={<CheckCircle2 size={14} />}
                          onClick={() => handleApprove('series', s.id)}
                          loading={actionLoading === s.id}
                          disabled={actionLoading !== null && actionLoading !== s.id}
                          className="bg-status-free/20 text-status-free hover:bg-status-free/30 border border-status-free/30"
                        >
                          Approve
                        </Button>
                        <Button
                          leftIcon={<XCircle size={14} />}
                          onClick={() =>
                            openRejectModal('series', s.id, s.title)
                          }
                          disabled={actionLoading !== null && actionLoading !== s.id}
                          variant="secondary"
                          className="text-status-danger hover:bg-status-danger/10 border border-status-danger/30"
                        >
                          Reject
                        </Button>
                        <Button
                          leftIcon={<Pencil size={14} />}
                          onClick={() =>
                            openEditModal(
                              'series',
                              s.id,
                              s.title,
                              s.description,
                              s.review_notes ?? '',
                            )
                          }
                          disabled={actionLoading !== null && actionLoading !== s.id}
                          variant="secondary"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reject confirmation modal */}
      <Modal
        isOpen={rejectModal !== null}
        onClose={() => !rejectSaving && setRejectModal(null)}
        title="Reject Content"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Reject{' '}
            <span className="font-semibold text-text-primary">
              {rejectModal?.title}
            </span>
            ? Optionally add a reason below.
          </p>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Rejection reason (optional)..."
            rows={3}
            className="w-full rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRejectModal(null)}
              disabled={rejectSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={rejectSaving}
              onClick={handleReject}
              className="bg-status-danger/20 text-status-danger hover:bg-status-danger/30 border border-status-danger/30"
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={editModal !== null}
        onClose={() => !editSaving && setEditModal(null)}
        title="Edit Content"
        size="lg"
      >
        {editModal && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Title
              </label>
              <input
                type="text"
                value={editModal.title}
                onChange={(e) =>
                  setEditModal({ ...editModal, title: e.target.value })
                }
                className="w-full rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                {editModal.type === 'episode' ? 'Description' : 'Synopsis'}
              </label>
              <textarea
                value={editModal.description}
                onChange={(e) =>
                  setEditModal({ ...editModal, description: e.target.value })
                }
                rows={6}
                className="w-full rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Review Notes
              </label>
              <textarea
                value={editModal.reviewNotes}
                onChange={(e) =>
                  setEditModal({ ...editModal, reviewNotes: e.target.value })
                }
                placeholder="Internal review notes..."
                rows={2}
                className="w-full rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditModal(null)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button type="button" loading={editSaving} onClick={handleEditSave}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
