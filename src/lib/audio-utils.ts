import type { Episode } from '@/types';

/**
 * Formats a duration in seconds into a human-readable time string.
 *
 * - Durations under one hour produce `"MM:SS"` (e.g. `125` -> `"02:05"`).
 * - Durations of one hour or more produce `"H:MM:SS"` (e.g. `3725` -> `"1:02:05"`).
 *
 * @param seconds - The duration in seconds.
 * @returns The formatted time string, or `"0:00"` for invalid input.
 */
export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(secs).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Determines the playback status of an episode for the current user.
 *
 * @param episode         - The episode to check.
 * @param isUnlocked      - Whether the user has unlocked this episode with coins.
 * @param hasSubscription - Whether the user has an active subscription.
 * @returns `'free'` if the episode is free, `'unlocked'` if accessible via
 *          coins or subscription, or `'locked'` if not yet accessible.
 */
export function getEpisodeStatus(
  episode: Episode,
  isUnlocked: boolean,
  hasSubscription: boolean,
): 'free' | 'unlocked' | 'locked' {
  if (episode.isFree) {
    return 'free';
  }
  if (isUnlocked || hasSubscription) {
    return 'unlocked';
  }
  return 'locked';
}

/**
 * Checks whether an episode can be played by the current user.
 *
 * An episode is playable when it is free, unlocked with coins, or the user
 * has an active subscription.
 *
 * @param episode         - The episode to check.
 * @param isUnlocked      - Whether the user has unlocked this episode with coins.
 * @param hasSubscription - Whether the user has an active subscription.
 * @returns `true` if the episode can be played, `false` otherwise.
 */
export function isEpisodePlayable(
  episode: Episode,
  isUnlocked: boolean,
  hasSubscription: boolean,
): boolean {
  return getEpisodeStatus(episode, isUnlocked, hasSubscription) !== 'locked';
}
