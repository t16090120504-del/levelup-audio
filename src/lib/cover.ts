import type { CSSProperties } from 'react';

/**
 * Tailwind default color palette (v3) keyed by color name, then by shade.
 * Only the shades most commonly used for cover gradients are included,
 * but the full standard color set is covered (300–800).
 *
 * Used to resolve `gradient:from-<color>-<shade>-to-<color>-<shade>` pseudo
 * URLs into real CSS gradients via inline styles (which sidesteps Tailwind's
 * static class detection for dynamic values).
 */
const TAILWIND_COLORS: Record<string, Record<string, string>> = {
  red: { 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' },
  orange: { 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412' },
  amber: { 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e' },
  yellow: { 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e' },
  lime: { 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212' },
  green: { 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534' },
  emerald: { 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46' },
  teal: { 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59' },
  cyan: { 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75' },
  sky: { 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985' },
  blue: { 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af' },
  indigo: { 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3' },
  violet: { 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6' },
  purple: { 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8' },
  fuchsia: { 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f' },
  pink: { 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d' },
  rose: { 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239' },
  slate: { 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b' },
  gray: { 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937' },
  zinc: { 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a' },
  neutral: { 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626' },
  stone: { 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524' },
};

/** Fallback gradient used when a cover URL cannot be resolved. */
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #3D2B5E 0%, #1B2845 100%)';

/** Resolves a Tailwind color token (e.g. `purple-600`) to a hex string. */
function resolveColorToken(token: string): string | undefined {
  const match = token.match(/^([a-z]+)-(\d{2,3})$/);
  if (!match) return undefined;
  const [, name, shade] = match;
  return TAILWIND_COLORS[name]?.[shade];
}

/**
 * Parses a gradient pseudo-URL of the form
 * `gradient:from-<color>-to-<color>` (e.g. `gradient:from-purple-600-to-blue-500`)
 * into a two-color `[from, to]` pair of hex strings.
 *
 * Returns `null` when the input is not a valid gradient pseudo-URL or the
 * referenced colors cannot be resolved.
 */
export function parseGradientCover(coverUrl: string): { from: string; to: string } | null {
  if (!coverUrl || !coverUrl.startsWith('gradient:')) {
    return null;
  }

  // Strip the `gradient:` prefix and the leading `from-`.
  const body = coverUrl.slice('gradient:'.length);
  if (!body.startsWith('from-')) {
    return null;
  }

  const withoutFrom = body.slice('from-'.length);
  // The separator between the two colors is the literal `-to-`.
  const toIndex = withoutFrom.indexOf('-to-');
  if (toIndex === -1) {
    return null;
  }

  const fromToken = withoutFrom.slice(0, toIndex);
  const toToken = withoutFrom.slice(toIndex + '-to-'.length);

  const from = resolveColorToken(fromToken);
  const to = resolveColorToken(toToken);

  if (!from || !to) {
    return null;
  }

  return { from, to };
}

/**
 * Converts a series `coverUrl` (which may be a `gradient:from-...-to-...`
 * pseudo-URL or a real image URL) into a `CSSProperties` background style.
 *
 * @param coverUrl   - The cover URL / gradient pseudo-URL.
 * @param angle      - Gradient angle in degrees. Defaults to `135`.
 * @returns A style object with a `backgroundImage` (and `backgroundSize` for
 *          image URLs).
 */
export function getCoverStyle(
  coverUrl: string,
  angle = 135,
): CSSProperties {
  const gradient = parseGradientCover(coverUrl);
  if (gradient) {
    return {
      backgroundImage: `linear-gradient(${angle}deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
    };
  }

  // Treat as a real image URL when it does not match the gradient format.
  return {
    backgroundImage: `url("${coverUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * Returns the two raw hex colors for a gradient cover, falling back to a
 * sensible default pair. Useful when consumers need the colors themselves
 * (e.g. for text-shadow glows).
 */
export function getCoverColors(coverUrl: string): { from: string; to: string } {
  return parseGradientCover(coverUrl) ?? { from: '#3D2B5E', to: '#1B2845' };
}

export { FALLBACK_GRADIENT };
