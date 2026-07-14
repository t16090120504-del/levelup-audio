import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { adminSupabase } from '@/services/supabase/admin-client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import {
  TextField,
  TextArea,
  SelectField,
  NumberField,
} from '@/components/admin/AdminInputs';

/** A series row joined with its genre name for display. */
interface SeriesRow {
  id: string;
  title: string;
  description: string;
  author: string;
  cover_url: string;
  genre_id: string;
  is_completed: boolean;
  total_episodes: number;
  avg_rating: number;
  total_plays: number;
  tags: string[];
  status: string;
  featured: boolean;
  created_at: string;
}

interface GenreRow {
  id: string;
  name: string;
  slug: string;
}

const STATUS_OPTIONS = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
];

const STATUS_BADGE: Record<string, 'free' | 'unlocked' | 'locked' | 'warning'> = {
  ongoing: 'free',
  completed: 'unlocked',
  hiatus: 'warning',
};

interface SeriesFormValues {
  title: string;
  description: string;
  author: string;
  coverUrl: string;
  genreId: string;
  status: string;
  avgRating: string;
  totalPlays: string;
  tags: string;
  featured: boolean;
}

const EMPTY_FORM: SeriesFormValues = {
  title: '',
  description: '',
  author: '',
  coverUrl: '',
  genreId: '',
  status: 'ongoing',
  avgRating: '0',
  totalPlays: '0',
  tags: '',
  featured: false,
};

/**
 * Admin series management page. Lists all series in a table and provides
 * create / edit / delete operations via the service-role Supabase client.
 */
export default function AdminSeriesPage() {
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [genres, setGenres] = useState<GenreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SeriesFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deletingSeries, setDeletingSeries] = useState<SeriesRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const genreNameById = useCallback(
    (genreId: string) =>
      genres.find((g) => g.id === genreId)?.name ?? 'Unknown',
    [genres],
  );

  const loadSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await adminSupabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setSeries((data ?? []) as SeriesRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load series.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGenres = useCallback(async () => {
    try {
      const { data, error: queryError } = await adminSupabase
        .from('genres')
        .select('id, name, slug')
        .order('sort_order', { ascending: true });

      if (queryError) throw queryError;
      setGenres((data ?? []) as GenreRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load genres.');
    }
  }, []);

  useEffect(() => {
    loadSeries();
    loadGenres();
  }, [loadSeries, loadGenres]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (row: SeriesRow) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      description: row.description,
      author: row.author,
      coverUrl: row.cover_url,
      genreId: row.genre_id,
      status: row.status,
      avgRating: String(row.avg_rating ?? 0),
      totalPlays: String(row.total_plays ?? 0),
      tags: (row.tags ?? []).join(', '),
      featured: row.featured ?? false,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim() || !form.author.trim() || !form.description.trim()) {
      setFormError('Title, author, and description are required.');
      return;
    }
    if (!form.genreId) {
      setFormError('Please select a genre.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      author: form.author.trim(),
      cover_url: form.coverUrl.trim() || 'gradient:from-purple-600-to-blue-500',
      genre_id: form.genreId,
      status: form.status,
      avg_rating: Math.min(5, Math.max(0, Number(form.avgRating) || 0)),
      total_plays: Math.max(0, Number(form.totalPlays) || 0),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      featured: form.featured,
      is_completed: form.status === 'completed',
    };

    setSaving(true);
    try {
      if (editingId) {
        const { error: updateError } = await adminSupabase
          .from('series')
          .update(payload)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await adminSupabase
          .from('series')
          .insert({ ...payload, total_episodes: 0 });
        if (insertError) throw insertError;
      }
      setIsFormOpen(false);
      await loadSeries();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save series.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSeries) return;
    setDeleting(true);
    try {
      const { error: deleteError } = await adminSupabase
        .from('series')
        .delete()
        .eq('id', deletingSeries.id);
      if (deleteError) throw deleteError;
      setDeletingSeries(null);
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete series.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-gold-bright">Series</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage all audio series in the catalog.
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreateForm}>
          Add New Series
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card-jrpg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-bg-hover text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Author</th>
                <th className="px-4 py-3 font-semibold">Genre</th>
                <th className="px-4 py-3 text-center font-semibold">Episodes</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Rating</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-bg-hover/50">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton variant="text" className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : series.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <BookOpen size={32} className="opacity-50" />
                      <p>No series found. Create your first series.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                series.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-bg-hover/50 transition-colors hover:bg-bg-elevated/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">
                        {row.title}
                      </span>
                      {row.featured && (
                        <Badge variant="new" className="ml-2">
                          Featured
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {row.author}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {genreNameById(row.genre_id)}
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">
                      {row.total_episodes}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[row.status] ?? 'default'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-gold-bright">
                      {Number(row.avg_rating).toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-gold-bright"
                          aria-label="Edit series"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSeries(row)}
                          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-status-warning/10 hover:text-status-warning"
                          aria-label="Delete series"
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

      {/* Create / Edit form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !saving && setIsFormOpen(false)}
        title={editingId ? 'Edit Series' : 'Add New Series'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <TextField
            id="series-title"
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. The Ascendant"
            required
          />
          <TextArea
            id="series-description"
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Series synopsis..."
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="series-author"
              label="Author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="Author name"
              required
            />
            <TextField
              id="series-cover"
              label="Cover URL"
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              placeholder="gradient:from-purple-600-to-blue-500"
              hint="Use gradient:from-<color>-to-<color> or an image URL."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="series-genre"
              label="Genre"
              value={form.genreId}
              onChange={(e) => setForm({ ...form, genreId: e.target.value })}
              options={genres.map((g) => ({ value: g.id, label: g.name }))}
              placeholder="Select a genre"
              required
            />
            <SelectField
              id="series-status"
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              id="series-rating"
              label="Average Rating (0-5)"
              value={form.avgRating}
              onChange={(e) => setForm({ ...form, avgRating: e.target.value })}
              min={0}
              max={5}
              step={0.1}
            />
            <NumberField
              id="series-plays"
              label="Total Plays"
              value={form.totalPlays}
              onChange={(e) => setForm({ ...form, totalPlays: e.target.value })}
              min={0}
            />
          </div>
          <TextField
            id="series-tags"
            label="Tags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="leveling, magic, academy"
            hint="Comma-separated list of tags."
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="h-4 w-4 rounded border-bg-hover bg-bg-elevated accent-gold-bright"
            />
            Featured on home page
          </label>

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
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? 'Save Changes' : 'Create Series'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deletingSeries !== null}
        onClose={() => !deleting && setDeletingSeries(null)}
        title="Delete Series"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-text-primary">
              {deletingSeries?.title}
            </span>
            ? This will also delete all of its episodes. This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingSeries(null)}
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

      {/* Saving overlay spinner (accessibility hint while mutating) */}
      {(saving || deleting) && (
        <div className="sr-only" aria-live="polite">
          <Spinner size="sm" /> Processing...
        </div>
      )}
    </div>
  );
}
