import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(rootDir, 'supabase', 'migrations');
const workdir = path.join(rootDir, '.owned-supabase-workdir');
const targetDir = path.join(workdir, 'supabase', 'migrations');
const projectRef = process.env.SUPABASE_PROJECT_ID ?? 'nismhxliklzjxpiszuaj';

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

const files = (await readdir(sourceDir))
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort((left, right) => left.localeCompare(right));

const duplicateOffsets = new Map();

await rm(workdir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

for (const file of files) {
  const timestamp = file.slice(0, 14);
  const offset = duplicateOffsets.get(timestamp) ?? 0;
  duplicateOffsets.set(timestamp, offset + 1);

  const targetName = offset === 0 ? file : `${nextTimestamp(timestamp, offset)}_${file.slice(15)}`;
  await cp(path.join(sourceDir, file), path.join(targetDir, targetName));
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
