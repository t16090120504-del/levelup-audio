/**
 * Simulates network latency for mock API calls.
 * Returns a Promise that resolves after a random delay between `min` and `max` milliseconds.
 *
 * @param min - Minimum delay in milliseconds (default 200).
 * @param max - Maximum delay in milliseconds (default 800).
 */
export function mockDelay(min = 200, max = 800): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
