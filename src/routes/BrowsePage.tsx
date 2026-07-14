import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Series, Genre } from '@/types';
import { apiClient } from '@/services/api/client';
import { trackSearch } from '@/services/analytics';
import { SearchBar } from '@/components/ui/SearchBar';
import { GenreFilterBar } from '@/components/content/GenreFilterBar';
import { SeriesCard } from '@/components/content/SeriesCard';
import { SectionHeader } from '@/components/content/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';

const PAGE_SIZE = 20;

export default function BrowsePage() {
  const navigate = useNavigate();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenreSlug, setActiveGenreSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Series[] | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Load genres on mount
  useEffect(() => {
    apiClient.content
      .getGenres()
      .then(setGenres)
      .catch((err) => console.error('Failed to load genres:', err));
  }, []);

  // Load series when genre changes
  useEffect(() => {
    setLoading(true);
    setSeriesList([]);
    setPage(1);
    setHasMore(true);
    setSearchResults(null);
    setSearchQuery('');

    async function load() {
      try {
        if (activeGenreSlug) {
          const result = await apiClient.content.getSeriesByGenre(activeGenreSlug, 1, PAGE_SIZE);
          setSeriesList(result.data);
          setHasMore(result.hasMore);
        } else {
          // "All" — fall back to trending as an approximation since there is no global list endpoint
          const all = await apiClient.content.getTrendingSeries(100);
          setSeriesList(all);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to load series:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeGenreSlug]);

  // Debounced search (300ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      apiClient.content
        .searchSeries(trimmed)
        .then((results) => {
          setSearchResults(results);
          trackSearch(trimmed, results.length);
        })
        .catch((err) => console.error('Search failed:', err))
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite scroll — load more
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || activeGenreSlug === null) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await apiClient.content.getSeriesByGenre(
        activeGenreSlug,
        nextPage,
        PAGE_SIZE,
      );
      setSeriesList((prev) => [...prev, ...result.data]);
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load more series:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, activeGenreSlug, page]);

  // IntersectionObserver for pagination
  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMore();
          }
        },
        { rootMargin: '200px' },
      );
      observerRef.current.observe(loadMoreRef.current);
    }
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  const handleSeriesClick = (series: Series) => {
    navigate(`/series/${series.id}`);
  };

  const handleGenreSelect = (slug: string | null) => {
    setSearchQuery('');
    setSearchResults(null);
    setActiveGenreSlug(slug);
  };

  const activeGenreName =
    activeGenreSlug ? genres.find((g) => g.slug === activeGenreSlug)?.name ?? 'Browse' : 'All Series';

  const displaySeries = searchResults !== null ? searchResults : seriesList;
  const isLoading = loading || searching;

  return (
    <div className="space-y-4 pb-28">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search series, authors, tags..."
      />

      <GenreFilterBar
        genres={genres}
        activeSlug={activeGenreSlug}
        onSelect={handleGenreSelect}
      />

      {searchResults !== null ? (
        <section>
          <SectionHeader title={`Search Results (${searchResults.length})`} />
          {searching ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-56 w-full rounded-xl" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <p className="text-text-secondary">No results found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {searchResults.map((s) => (
                <SeriesCard key={s.id} series={s} onClick={handleSeriesClick} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <SectionHeader title={activeGenreName} />
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-56 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {displaySeries.map((s) => (
                  <SeriesCard key={s.id} series={s} onClick={handleSeriesClick} />
                ))}
              </div>

              {hasMore && activeGenreSlug !== null && (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                  <Skeleton variant="rect" className="h-10 w-full max-w-xs rounded-lg" />
                </div>
              )}

              {displaySeries.length === 0 && (
                <div className="flex min-h-[30vh] items-center justify-center">
                  <p className="text-text-secondary">No series found.</p>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
