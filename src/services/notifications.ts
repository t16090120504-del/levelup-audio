import { useCoinStore } from '@/stores/coin-store';

/**
 * Browser-notification based daily reminder system.
 *
 * The Web Notifications API cannot truly "schedule" a notification to fire
 * while the page is closed, so this module implements a practical equivalent:
 * on each app load (and periodically while the tab is open) it checks whether
 * a daily reminder should be shown, and if so fires it immediately.
 *
 * Rules:
 *  - Notification permission is requested once on first visit (tracked in
 *    localStorage so we don't pester the user repeatedly).
 *  - The daily reminder is only scheduled for users who have claimed a daily
 *    bonus before (a strong engagement signal).
 *  - The reminder fires at most once per day (tracked in localStorage) and
 *    only when today's bonus has not yet been claimed.
 */

const LS_PERMISSION_REQUESTED = 'lu-notif-permission-requested';
const LS_DAILY_REMINDER_DATE = 'lu-daily-reminder-date';

const REMINDER_TITLE = 'LevelUp Audio';
const REMINDER_BODY = 'Your daily bonus coins are waiting! Claim them now.';
/** Re-check interval while the tab stays open (every 30 minutes). */
const RECHECK_INTERVAL_MS = 30 * 60 * 1000;

/** Whether the browser supports the Notifications API. */
function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Read a value from localStorage, tolerating private-mode failures. */
function readLS(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a value to localStorage, tolerating private-mode failures. */
function writeLS(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore — reminders are a best-effort feature.
  }
}

/** Today's date as YYYY-MM-DD (UTC, matching the coin store's day boundary). */
function getTodayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Request notification permission, but only once per browser (tracked via
 * localStorage). Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';

  // Don't ask again if we've already asked before.
  if (readLS(LS_PERMISSION_REQUESTED) === 'true') {
    return Notification.permission;
  }

  writeLS(LS_PERMISSION_REQUESTED, 'true');

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // Some browsers throw if called without a user gesture.
    }
  }
  return Notification.permission;
}

/**
 * Fire the daily reminder notification immediately (if permission is granted
 * and today's bonus has not yet been claimed).
 */
function showDailyReminderNotification(): void {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;

  const coinStore = useCoinStore.getState();
  // Only remind engaged users (those who have claimed a bonus before).
  if (!coinStore.lastBonusClaimDate) return;
  // Don't remind if today's bonus is already claimed.
  if (!coinStore.canClaimDailyBonus()) return;

  // Only fire once per day.
  if (readLS(LS_DAILY_REMINDER_DATE) === getTodayUtc()) return;

  writeLS(LS_DAILY_REMINDER_DATE, getTodayUtc());

  try {
    const notification = new Notification(REMINDER_TITLE, {
      body: REMINDER_BODY,
      icon: '/favicon.svg',
      tag: 'daily-bonus-reminder',
    });

    // Focus the tab when the user clicks the notification.
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some browsers require a Service Worker registration for notifications.
    // Ignore failures silently.
  }
}

/**
 * Schedule the daily reminder. Because web notifications can't be queued for
 * a future time while the page is closed, this checks on load and sets an
 * interval to re-evaluate periodically while the tab remains open.
 *
 * Uses localStorage to track that a reminder has been scheduled/shown today.
 */
export function scheduleDailyReminder(): void {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;

  const coinStore = useCoinStore.getState();
  // Only schedule for engaged users who have claimed a bonus before.
  if (!coinStore.lastBonusClaimDate) return;

  // Fire immediately if eligible (once-per-day guard is inside the helper).
  showDailyReminderNotification();

  // Re-check periodically while the tab is open (covers the case where the
  // bonus resets at UTC midnight during the session).
  if (typeof window !== 'undefined') {
    window.setInterval(showDailyReminderNotification, RECHECK_INTERVAL_MS);
  }
}

/**
 * Initialize the notification system. Called once on app startup.
 *
 * 1. Requests permission on the first visit.
 * 2. Schedules the daily reminder for engaged users.
 */
export async function initNotifications(): Promise<void> {
  await requestNotificationPermission();
  scheduleDailyReminder();
}

/** Convenience: the reminder message used (exposed for testing/preview). */
export const DAILY_REMINDER_MESSAGE = REMINDER_BODY;

/** Re-exported config value for the re-check cadence. */
export const RECHECK_INTERVAL = RECHECK_INTERVAL_MS;
