import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';

export interface VolumeControlProps {
  volume: number; // 0-1
  onChange: (volume: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const computeVolumeFromMouse = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return volume;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(1, ratio));
    },
    [volume],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const newVol = computeVolumeFromMouse(e.clientX);
    onChange(newVol);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newVol = computeVolumeFromMouse(e.clientX);
      onChange(newVol);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, computeVolumeFromMouse, onChange]);

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(volume === 0 ? 1 : 0)}
        className="text-text-secondary transition-colors hover:text-gold-bright"
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon size={18} />
      </button>

      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className="relative h-1.5 w-24 cursor-pointer overflow-hidden rounded-full bg-bg-hover"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Math.round(volume * 100) / 100}
        aria-label="Volume"
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-bright shadow-gold-glow-sm"
          style={{ width: `${volume * 100}%` }}
        />
      </div>
    </div>
  );
}

export default VolumeControl;
