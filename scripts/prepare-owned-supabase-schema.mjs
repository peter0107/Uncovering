import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(rootDir, 'supabase', 'migrations');
const workdir = path.join(rootDir, '.owned-supabase-workdir');
const targetDir = path.join(workdir, 'supabase', 'migrations');
const projectRef = process.env.SUPABASE_PROJECT_ID ?? 'nismhxliklzjxpiszuaj';

// A few historical seed migrations were authored before the schema columns
// they use received their final migration. The original project already had
// those columns, but a clean project needs the dependency order below.
const migrationTimestampOverrides = new Map([
  ['20260718155557_79e1132a-e915-45cf-96a8-53e534bd09a0.sql', '20260719110001'],
]);

function nextTimestamp(timestamp, offset) {
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6)) - 1;
  const day = Number(timestamp.slice(6, 8));
  const hour = Number(timestamp.slice(8, 10));
  const minute = Number(timestamp.slice(10, 12));
  const second = Number(timestamp.slice(12, 14));
  const date = new Date(Date.UTC(year, month, day, hour, minute, second + offset));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0'),
  ].join('');
}

function makePolicyCreationIdempotent(sql) {
  return sql.replace(
    /create\s+policy\s+((?:"[^"]+")|(?:[a-z_][a-z0-9_$]*))\s+on\s+((?:(?:public|storage)\.)?[a-z_][a-z0-9_$]*)/gi,
    (statement, policyName, tableName) =>
      `drop policy if exists ${policyName} on ${tableName};\n${statement}`,
  );
}

const files = (await readdir(sourceDir))
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort((left, right) => left.localeCompare(right));

const duplicateOffsets = new Map();

// Keep Supabase CLI's linked-project metadata in .supabase between reruns.
await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

for (const file of files) {
  const timestamp = migrationTimestampOverrides.get(file) ?? file.slice(0, 14);
  const offset = duplicateOffsets.get(timestamp) ?? 0;
  duplicateOffsets.set(timestamp, offset + 1);

  const suffix = file.slice(15);
  const targetName = `${offset === 0 ? timestamp : nextTimestamp(timestamp, offset)}_${suffix}`;
  const sql = await readFile(path.join(sourceDir, file), 'utf8');
  await writeFile(path.join(targetDir, targetName), makePolicyCreationIdempotent(sql));
}

await writeFile(
  path.join(workdir, 'supabase', 'config.toml'),
  `project_id = "${projectRef}"\n`,
);

const renamed = [...duplicateOffsets.entries()]
  .filter(([, count]) => count > 1)
  .map(([timestamp, count]) => `${timestamp} (${count} files)`);

console.log(`Prepared ${files.length} migrations in ${path.relative(rootDir, workdir)}.`);
if (renamed.length > 0) {
  console.log(`Renamed duplicate migration timestamps: ${renamed.join(', ')}.`);
}
