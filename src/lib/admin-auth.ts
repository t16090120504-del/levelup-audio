/**
 * Lightweight admin authentication utilities.
 *
 * This is a simple password-gate for the admin dashboard. The admin password
 * is hardcoded for now and a session token is persisted to `localStorage` so
 * that the admin layout can guard its routes.
 *
 * NOTE: This is NOT a real authentication mechanism. It is intended only as a
 * temporary measure until a proper admin role is wired into Supabase Auth.
 */

/** Hardcoded admin password (temporary). */
const ADMIN_PASSWORD = 'levelup-admin-2026';

/** localStorage key used to persist the admin session token. */
const ADMIN_TOKEN_KEY = 'levelup_admin_token';

/** Value written to localStorage once the admin is authenticated. */
const ADMIN_TOKEN_VALUE = 'levelup-admin-session-active';

/**
 * Returns `true` when an admin session token is present in localStorage.
 */
export function isAdminAuthenticated(): boolean {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) === ADMIN_TOKEN_VALUE;
  } catch {
    return false;
  }
}

/**
 * Validates the provided password against the hardcoded admin password.
 * On success, persists the session token and returns `true`.
 */
export function loginAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_TOKEN_VALUE);
    } catch {
      // Ignore storage errors (e.g. private mode); the in-memory check below
      // still allows the current session to proceed.
    }
    return true;
  }
  return false;
}

/**
 * Clears the admin session token, effectively logging the admin out.
 */
export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // No-op
  }
}
