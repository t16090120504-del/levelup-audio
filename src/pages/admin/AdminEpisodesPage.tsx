import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Headphones,
  Upload,
  FileAudio,
  CheckCircle2,
} from 'lucide-react';
import { adminSupabase } from '@/services/supabase/admin-client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  TextField,
  TextArea,
  NumberField,
  SelectField,
  FieldWrapper,
} from '@/components/admin/AdminInputs';
import { formatDuration } from '@/lib/format';

/** Name of the Supabase Storage bucket that holds episode audio. */
const AUDIO_BUCKET = 'audio';

interface EpisodeRow {
  id: string;
  series_id: string;
  title: string;
  description: string;
  episode_number: number;
  season_number: number;
  duration_seconds: number;
  audio_url: string;
  audio_size_bytes: number | null;
  is_free: boolean;
  unlock_cost_coins: number;
  released_at: string;
  created_at: string;
}

interface SeriesOption {
  id: string;
  title: string;
}

interface EpisodeFormValues {
  title: string;
  description: string;
  episodeNumber: string;
  seasonNumber: string;
  durationSeconds: string;
  isFree: boolean;
  unlockCostCoins: string;
}

const EMPTY_FORM: EpisodeFormValues = {
  title: '',
  description: '',
  episodeNumber: '1',
  seasonNumber: '1',
  durationSeconds: '300',
  isFree: false,
  unlockCostCoins: '10',
};

/**
 * Admin episodes management page. Lets the admin pick a series, then list,
 * create, edit, and delete its episodes. Audio files are uploaded to the
 * Supabase `audio` storage bucket and the resulting public URL is stored on
 * the episode row.
 */
export default function AdminEpisodesPage() {
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EpisodeFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [deletingEpisode, setDeletingEpisode] = useState<EpisodeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load the series dropdown options once.
  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const { data, error: queryError } = await adminSupabase
          .from('series')
          .select('id, title')
          .order('title', { ascending: true });
        if (queryError) throw queryError;
        const options = (data ?? []) as SeriesOption[];
        if (cancelled) return;
        setSeriesOptions(options);
        if (options.length > 0 && !selectedSeriesId) {
          setSelectedSeriesId(options[0].id);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load series.');
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEpisodes = useCallback(async () => {
    if (!selectedSeriesId) {
      setEpisodes([]);
      return;
    }
    setLoadingEpisodes(true);
    setError(null);
    try {
      const { data, error: queryError } = await adminSupabase
        .from('episodes')
        .select('*')
        .eq('series_id', selectedSeriesId)
        .order('episode_number', { ascending: true });
      if (queryError) throw queryError;
      setEpisodes((data ?? []) as EpisodeRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load episodes.');
    } finally {
      setLoadingEpisodes(false);
    }
  }, [selectedSeriesId]);

  useEffect(() => {
    loadEpisodes();
  }, [loadEpisodes]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      episodeNumber: String(episodes.length + 1),
    });
    setAudioFile(null);
    setExistingAudioUrl(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (row: EpisodeRow) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      description: row.description ?? '',
      episodeNumber: String(row.episode_number),
      seasonNumber: String(row.season_number ?? 1),
      durationSeconds: String(row.duration_seconds ?? 300),
      isFree: row.is_free,
      unlockCostCoins: String(row.unlock_cost_coins ?? 10),
    });
    setAudioFile(null);
    setExistingAudioUrl(row.audio_url);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAudioFile(file);
  };

  /**
   * Uploads the selected audio file to the `audio` storage bucket and returns
   * its public URL. Falls back to the existing audio URL when no new file is
   * selected.
   */
  const resolveAudioUrl = async (): Promise<{
    url: string;
    size: number | null;
  } | null> => {
    if (!audioFile) {
      return { url: existingAudioUrl ?? '', size: null };
    }
    setUploading(true);
    try {
      const ext = audioFile.name.split('.').pop() ?? 'mp3';
      const path = `${selectedSeriesId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: uploadError } = await adminSupabase.storage
        .from(AUDIO_BUCKET)
        .upload(path, audioFile, {
          contentType: audioFile.type || 'audio/mpeg',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = adminSupabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(path);

      return { url: publicUrlData.publicUrl, size: audioFile.size };
    } finally {
      setUploading(false);
    }
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSeriesId) {
      setFormError('Please select a series first.');
      return;
    }
    if (!form.title.trim()) {
      setFormError('Episode title is required.');
      return;
    }
    const episodeNumber = Number(form.episodeNumber);
    if (!Number.isFinite(episodeNumber) || episodeNumber < 1) {
      setFormError('Episode number must be a positive integer.');
      return;
    }

    setSaving(true);
    try {
      const audio = await resolveAudioUrl();
      if (!audio || !audio.url) {
        setFormError(
          'An audio file is required. Please upload an audio file for this episode.',
        );
        setSaving(false);
        return;
      }

      const payload = {
        series_id: selectedSeriesId,
        title: form.title.trim(),
        description: form.description.trim(),
        episode_number: episodeNumber,
        season_number: Number(form.seasonNumber) || 1,
        duration_seconds: Number(form.durationSeconds) || 300,
        audio_url: audio.url,
        audio_size_bytes: audio.size,
        is_free: form.isFree,
        unlock_cost_coins: Number(form.unlockCostCoins) || 10,
      };

      if (editingId) {
        const { error: updateError } = await adminSupabase
          .from('episodes')
          .update(payload)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await adminSupabase
          .from('episodes')
          .insert(payload);
        if (insertError) throw insertError;
      }

      // Keep the series.total_episodes count in sync with the actual row count.
      const { count } = await adminSupabase
        .from('episodes')
        .select('*', { count: 'exact', head: true })
        .eq('series_id', selectedSeriesId);
      await adminSupabase
        .from('series')
        .update({ total_episodes: count ?? 0 })
        .eq('id', selectedSeriesId);

      setIsFormOpen(false);
      await loadEpisodes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save episode.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEpisode) return;
    setDeleting(true);
    try {
      const { error: deleteError } = await adminSupabase
        .from('episodes')
        .delete()
        .eq('id', deletingEpisode.id);
      if (deleteError) throw deleteError;

      // Re-sync the series.total_episodes count.
      const { count } = await adminSupabase
        .from('episodes')
        .select('*', { count: 'exact', head: true })
        .eq('series_id', deletingEpisode.series_id);
      await adminSupabase
        .from('series')
        .update({ total_episodes: count ?? 0 })
        .eq('id', deletingEpisode.series_id);

      setDeletingEpisode(null);
      await loadEpisodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete episode.');
    } finally {
      setDeleting(false);
    }
  };

  const selectedSeriesTitle =
    seriesOptions.find((s) => s.id === selectedSeriesId)?.title ?? '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-gold-bright">Episodes</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage episodes and upload audio files per series.
          </p>
        </div>
        <Button
          leftIcon={<Plus size={16} />}
          onClick={openCreateForm}
          disabled={!selectedSeriesId}
        >
          Add Episode
        </Button>
      </div>

      {/* Series selector */}
      <div className="max-w-sm">
        <SelectField
          id="episode-series-select"
          label="Select Series"
          value={selectedSeriesId}
          onChange={(e) => setSelectedSeriesId(e.target.value)}
          options={seriesOptions.map((s) => ({ value: s.id, label: s.title }))}
          placeholder={loadingOptions ? 'Loading series...' : 'Select a series'}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      {/* Episodes table */}
      <div className="card-jrpg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-bg-hover text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 text-center font-semibold">Duration</th>
                <th className="px-4 py-3 text-center font-semibold">Access</th>
                <th className="px-4 py-3 text-center font-semibold">Audio</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!selectedSeriesId ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                    Select a series to view its episodes.
                  </td>
                </tr>
              ) : loadingEpisodes ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-bg-hover/50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton variant="text" className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : episodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <Headphones size={32} className="opacity-50" />
                      <p>
                        No episodes yet for{' '}
                        <span className="text-text-secondary">
                          {selectedSeriesTitle}
                        </span>
                        .
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                episodes.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-bg-hover/50 transition-colors hover:bg-bg-elevated/50"
                  >
                    <td className="px-4 py-3 text-text-muted">
                      {row.episode_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">
                        {row.title}
                      </span>
                      <p className="text-xs text-text-muted">
                        Season {row.season_number}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">
                      {formatDuration(row.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.is_free ? (
                        <Badge variant="free">Free</Badge>
                      ) : (
                        <Badge variant="locked">
                          {row.unlock_cost_coins} coins
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.audio_url ? (
                        <span className="inline-flex items-center gap-1 text-xs text-status-free">
                          <CheckCircle2 size={14} /> Uploaded
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-gold-bright"
                          aria-label="Edit episode"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEpisode(row)}
                          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-status-warning/10 hover:text-status-warning"
                          aria-label="Delete episode"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit episode modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !saving && !uploading && setIsFormOpen(false)}
        title={editingId ? 'Edit Episode' : 'Add Episode'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <TextField
            id="episode-title"
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. The Awakening"
            required
          />
          <TextArea
            id="episode-description"
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Episode synopsis..."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField
              id="episode-number"
              label="Episode Number"
              value={form.episodeNumber}
              onChange={(e) => setForm({ ...form, episodeNumber: e.target.value })}
              min={1}
              required
            />
            <NumberField
              id="episode-season"
              label="Season"
              value={form.seasonNumber}
              onChange={(e) => setForm({ ...form, seasonNumber: e.target.value })}
              min={1}
            />
            <NumberField
              id="episode-duration"
              label="Duration (sec)"
              value={form.durationSeconds}
              onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
              min={1}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              id="episode-cost"
              label="Unlock Cost (coins)"
              value={form.unlockCostCoins}
              onChange={(e) => setForm({ ...form, unlockCostCoins: e.target.value })}
              min={0}
            />
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                  className="h-4 w-4 rounded border-bg-hover bg-bg-elevated accent-gold-bright"
                />
                Free episode (no unlock cost)
              </label>
            </div>
          </div>

          {/* Audio upload */}
          <FieldWrapper
            label="Audio File"
            hint={
              existingAudioUrl && !audioFile
                ? 'A new file will replace the existing audio.'
                : 'Upload an MP3 / M4A / WAV file to Supabase Storage.'
            }
          >
            <div className="space-y-2">
              {existingAudioUrl && !audioFile && (
                <div className="flex items-center gap-2 rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2 text-xs text-status-free">
                  <FileAudio size={14} />
                  <span className="truncate">Current: {existingAudioUrl}</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="episode-audio"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-gold-bright file:px-4 file:py-2 file:text-xs file:font-semibold file:text-bg-deepest hover:file:bg-gold-light"
              />
              {audioFile && (
                <p className="text-xs text-text-muted">
                  Selected: {audioFile.name} (
                  {(audioFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </FieldWrapper>

          {uploading && (
            <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-bright">
              <Upload size={16} className="animate-pulse" />
              Uploading audio to storage...
            </div>
          )}

          {formError && (
            <p className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-sm text-status-warning">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={saving || uploading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving || uploading}>
              {editingId ? 'Save Changes' : 'Create Episode'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deletingEpisode !== null}
        onClose={() => !deleting && setDeletingEpisode(null)}
        title="Delete Episode"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-text-primary">
              {deletingEpisode?.title}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingEpisode(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
