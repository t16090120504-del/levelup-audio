import { useRef, useState, useCallback, useEffect } from 'react';
import { formatTime } from '@/lib/format';

export interface AudioProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

export function AudioProgressBar({ currentTime, duration, onSeek, className = '' }: AudioProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progress = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || safeDuration <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(safeDuration, ratio * safeDuration));
    },
    [safeDuration],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const t = timeFromClientX(e.clientX);
    onSeek(t);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    setHoverTime(timeFromClientX(e.clientX));
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const t = timeFromClientX(e.clientX);
      onSeek(t);
    };
    const onUp = () => {
      setIsDragging(false);
      setHoverTime(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, timeFromClientX, onSeek]);

  return (
    <div className={`select-none ${className}`}>
      {/* Track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group relative h-3 cursor-pointer rounded-full bg-bg-hover"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={Math.floor(safeDuration)}
        aria-valuenow={Math.floor(currentTime)}
        aria-label="Audio progress"
      >
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {/* Hover preview */}
          {hoverTime !== null && !isDragging && (
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-bg-elevated"
              style={{ width: `${(hoverTime / safeDuration) * 100}%` }}
            />
          )}

          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-bright shadow-gold-glow-sm transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-gold-bright bg-bg-deepest shadow-gold-glow-sm opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `calc(${progress}% - 8px)` }}
        />

        {/* Tooltip */}
        {(isDragging || hoverTime !== null) && safeDuration > 0 && (
          <div
            className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-md border border-gold/20 bg-bg-elevated px-2 py-0.5 text-xs font-mono font-semibold text-gold-bright shadow-card"
            style={{ left: `${((hoverTime ?? currentTime) / safeDuration) * 100}%` }}
          >
            {formatTime(hoverTime ?? currentTime)}
          </div>
        )}
      </div>

      {/* Time labels */}
      <div className="mt-1.5 flex justify-between text-[11px] font-mono text-text-muted">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(safeDuration)}</span>
      </div>
    </div>
  );
}

export default AudioProgressBar;
