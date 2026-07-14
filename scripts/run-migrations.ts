/**
 * LevelUp Audio - Migration Runner
 *
 * Runs the SQL migration files in `supabase/migrations/` against a Supabase
 * project via the Supabase Management REST API (`/v1/projects/{ref}/database/query`).
 *
 * Authentication:
 *   The Management API requires a Supabase Personal Access Token (PAT).
 *   Provide it via the `SUPABASE_ACCESS_TOKEN` environment variable.
 *   If not set, the script falls back to `SUPABASE_SERVICE_ROLE_KEY` (note:
 *   the service role key can bypass RLS for data, but the Management API
 *   typically requires a PAT — if you get a 401/403, generate a PAT at
 *   https://supabase.com/dashboard/account/tokens and set SUPABASE_ACCESS_TOKEN).
 *
 * Configuration (env vars, with defaults matching this project):
 *   SUPABASE_URL             (default: https://ihfaoksiurmucryfzfvd.supabase.co)
 *   SUPABASE_ACCESS_TOKEN    (preferred — a Personal Access Token)
 *   SUPABASE_SERVICE_ROLE_KEY (fallback bearer token)
 *
 * Usage:
 *   npx tsx scripts/run-migrations.ts                 # run all migrations
 *   npx tsx scripts/run-migrations.ts 002_analytics   # run a specific migration (by name fragment)
 *   npx tsx scripts/run-migrations.ts --list          # list available migrations
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://ihfaoksiurmucryfzfvd.supabase.co';

const ACCESS_TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'sb_secret_HR5YZxJ2j0PmWExOQySlTA_hBc_B1Hy';

const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
);

/**
 * Extract the project ref from the Supabase URL.
 * e.g. "https://ihfaoksiurmucryfzfvd.supabase.co" -> "ihfaoksiurmucryfzfvd"
 */
function getProjectRef(url: string): string {
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.(co|in|net)/);
  if (!match) {
    throw new Error(
      `Could not extract project ref from SUPABASE_URL: "${url}". ` +
        'Expected a URL like https://<ref>.supabase.co',
    );
  }
  return match[1];
}

interface MigrationFile {
  name: string;
  path: string;
  sql: string;
}

function listMigrations(): MigrationFile[] {
  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => ({
      name: e.name,
      path: join(MIGRATIONS_DIR, e.name),
      sql: readFileSync(join(MIGRATIONS_DIR, e.name), 'utf8'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

/**
 * Execute a single SQL migration via the Supabase Management API.
 * Returns the raw response and status.
 */
async function runMigration(
  ref: string,
  token: string,
  migration: MigrationFile,
): Promise<{ ok: boolean; status: number; body: string }> {
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: migration.sql }),
  });

  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const args = process.argv.slice(2);
  const doList = args.includes('--list');
  const filter = args.find((a) => !a.startsWith('--'));

  console.log('=== LevelUp Audio - Migration Runner ===\n');
  console.log(`Supabase URL : ${SUPABASE_URL}`);

  let migrations = listMigrations();

  if (migrations.length === 0) {
    console.log(`\nNo .sql migration files found in:\n  ${MIGRATIONS_DIR}`);
    return;
  }

  if (filter) {
    migrations = migrations.filter((m) => m.name.includes(filter));
    if (migrations.length === 0) {
      console.log(`\nNo migrations matching "${filter}".`);
      console.log('Available migrations:');
      listMigrations().forEach((m) => console.log(`  - ${m.name}`));
      return;
    }
  }

  if (doList) {
    console.log('\nAvailable migrations:');
    migrations.forEach((m) => console.log(`  - ${m.name}`));
    return;
  }

  const ref = getProjectRef(SUPABASE_URL);
  const tokenSource = process.env.SUPABASE_ACCESS_TOKEN
    ? 'SUPABASE_ACCESS_TOKEN'
    : process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'SUPABASE_SERVICE_ROLE_KEY'
      : 'default (service role)';
  console.log(`Project ref  : ${ref}`);
  console.log(`Migrations  : ${migrations.length} to run`);
  console.log(`Token source: ${tokenSource}\n`);

  let succeeded = 0;
  let failed = 0;

  for (const migration of migrations) {
    console.log(`--- Running ${migration.name} ---`);
    try {
      const result = await runMigration(ref, ACCESS_TOKEN, migration);
      if (result.ok) {
        console.log(`  OK (${result.status})\n`);
        succeeded++;
      } else {
        console.error(`  FAILED (${result.status})`);
        // Print a trimmed error body for diagnosis
        const trimmed = result.body.slice(0, 500);
        console.error(`  Response: ${trimmed}\n`);
        if (result.status === 401 || result.status === 403) {
          console.error(
            '  The Management API rejected this token. A Supabase Personal Access\n' +
              '  Token (PAT) is required — generate one at:\n' +
              '  https://supabase.com/dashboard/account/tokens\n' +
              '  then set SUPABASE_ACCESS_TOKEN=<your-pat> and re-run.\n',
          );
        }
        failed++;
      }
    } catch (err) {
      console.error(
        `  ERROR: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      failed++;
    }
  }

  console.log('=== Migration Summary ===');
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);
  if (failed > 0) {
    console.log(
      '\nTip: You can always run the .sql files directly in the Supabase Dashboard\n' +
        'SQL Editor as a fallback.',
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
