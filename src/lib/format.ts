/**
 * Formats a time value in seconds into a time string.
 * Returns "MM:SS" for durations under an hour, or "HH:MM:SS" for an hour or more.
 *
 * @example
 * formatTime(83); // "1:23"
 * formatTime(3723); // "1:02:03"
 */
export function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

/**
 * Formats a duration in seconds into a human-readable string.
 *
 * @example
 * formatDuration(300); // "5 min"
 * formatDuration(4980); // "1 hr 23 min"
 */
export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${hours} hr`;
  }

  return `${minutes} min`;
}

/**
 * Formats a coin amount with locale-aware thousands separators.
 *
 * @example
 * formatCoinAmount(1234); // "1,234"
 * formatCoinAmount(20); // "20"
 */
export function formatCoinAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

/**
 * Formats a date into a relative time string.
 *
 * @example
 * formatDate(new Date(Date.now() - 2 * 3600 * 1000)); // "2 hours ago"
 * formatDate(new Date(Date.now() - 3 * 86400 * 1000)); // "3 days ago"
 */
export function formatDate(date: string | Date): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - target.getTime();

  // Future dates fall back to absolute formatting
  if (diffMs < 0) {
    return target.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  if (weeks < 5) {
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Formats a numeric price into a USD currency string.
 *
 * @example
 * formatPrice(4.99); // "$4.99"
 * formatPrice(10); // "$10.00"
 */
export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
