/**
 * Utility functions for converting Supabase snake_case rows
 * to frontend camelCase objects.
 */

/**
 * Convert a snake_case string to camelCase.
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Convert all keys of a plain object from snake_case to camelCase.
 * Handles nested objects recursively. Arrays are mapped element-wise.
 */
export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? toCamelCase(item as Record<string, unknown>)
          : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      result[camelKey] = toCamelCase(value as Record<string, unknown>);
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

/**
 * Map a single Supabase row to a typed frontend object,
 * converting all snake_case keys to camelCase.
 */
export function mapRow<T>(row: Record<string, unknown>): T {
  return toCamelCase(row) as T;
}

/**
 * Map an array of Supabase rows to typed frontend objects.
 */
export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => mapRow<T>(row));
}
