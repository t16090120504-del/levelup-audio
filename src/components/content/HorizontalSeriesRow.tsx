import { useRef, type MouseEvent as ReactMouseEvent } from 'react';
import type { Series } from '@/types';
import { SeriesCardCompact } from '@/components/content/SeriesCardCompact';

export interface HorizontalSeriesRowProps {
  series: Series[];
  onSeriesClick?: (series: Series) => void;
}

/**
 * Horizontally scrolling row of compact series cards. Supports click-and-drag
 * scrolling with the mouse: press, move, and release to scrub through the row.
 * The native scrollbar is hidden for a clean look.
 */
export function HorizontalSeriesRow({ series, onSeriesClick }: HorizontalSeriesRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.style.cursor = 'grabbing';
  };

  const handleMouseLeave = () => {
    const el = containerRef.current;
    if (el) el.style.cursor = '';
    dragState.current.isDown = false;
  };

  const handleMouseUp = () => {
    const el = containerRef.current;
    if (el) el.style.cursor = '';
    dragState.current.isDown = false;
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el || !dragState.current.isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    el.scrollLeft = dragState.current.scrollLeft - walk;
    if (Math.abs(walk) > 4) dragState.current.moved = true;
  };

  // Suppress click navigation when the user actually dragged.
  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  if (series.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onClickCapture={handleClickCapture}
      className="scrollbar-hide flex cursor-grab gap-3 overflow-x-auto pb-1"
    >
      {series.map((s) => (
        <SeriesCardCompact key={s.id} series={s} onClick={onSeriesClick} />
      ))}
    </div>
  );
}

export default HorizontalSeriesRow;
