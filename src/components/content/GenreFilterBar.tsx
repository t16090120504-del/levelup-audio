import type { Genre } from '@/types';
import { GenreTag } from '@/components/content/GenreTag';

export interface GenreFilterBarProps {
  genres: Genre[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}

/**
 * Horizontally scrollable genre filter bar. Renders an "All" tag followed by
 * one tag per genre. The scroll container hides its scrollbar.
 */
export function GenreFilterBar({ genres, activeSlug, onSelect }: GenreFilterBarProps) {
  const sorted = [...genres].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      <GenreTag label="All" active={activeSlug === null} onClick={() => onSelect(null)} />
      {sorted.map((genre) => (
        <GenreTag
          key={genre.id}
          label={genre.name}
          active={activeSlug === genre.slug}
          onClick={() => onSelect(genre.slug)}
        />
      ))}
    </div>
  );
}

export default GenreFilterBar;
