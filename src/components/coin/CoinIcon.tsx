import { useId } from 'react';

export interface CoinIconProps {
  size?: number;
  className?: string;
  spinning?: boolean;
}

/** 5-point star polygon points (viewBox 24x24, centered at 12,12). */
const STAR_POINTS =
  '12,5 13.65,9.74 18.66,9.84 14.66,12.87 16.12,17.66 12,14.8 7.88,17.66 9.34,12.87 5.34,9.84 10.35,9.74';

/**
 * Gold-gradient coin SVG with a centered star. When `spinning` is set the
 * icon is wrapped in an element using the `animate-coin-spin` keyframes
 * (a Y-axis rotation that reads as a spinning coin).
 */
export function CoinIcon({ size = 16, className = '', spinning = false }: CoinIconProps) {
  const gradientId = useId();

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD067" />
          <stop offset="55%" stopColor="#F5B544" />
          <stop offset="100%" stopColor="#D4941E" />
        </linearGradient>
        <radialGradient id={`${gradientId}-shine`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Rim */}
      <circle cx="12" cy="12" r="11" fill="#8B6914" />
      {/* Face */}
      <circle cx="12" cy="12" r="9.5" fill={`url(#${gradientId})`} />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#FFD067" strokeWidth="0.5" opacity="0.6" />
      {/* Shine */}
      <circle cx="12" cy="12" r="9.5" fill={`url(#${gradientId}-shine)`} />
      {/* Star */}
      <polygon points={STAR_POINTS} fill="#8B6914" opacity="0.9" />
    </svg>
  );

  if (!spinning) return svg;

  return (
    <span className="inline-block animate-coin-spin" style={{ transformStyle: 'preserve-3d' }}>
      {svg}
    </span>
  );
}

export default CoinIcon;
