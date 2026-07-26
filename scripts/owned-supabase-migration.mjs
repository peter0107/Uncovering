import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultExportDir = path.join(process.env.HOME ?? '', 'Downloads', 'db-export');
const defaultExtrasDir = path.join(process.env.HOME ?? '', 'Downloads', 'supabase-migration-extras');
const exportDir = process.env.MIGRATION_EXPORT_DIR ?? defaultExportDir;
const extrasDir = process.env.MIGRATION_EXTRAS_DIR ?? defaultExtrasDir;
const [phase, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
const shellEnvironmentKeys = new Set(Object.keys(process.env));

function loadEnvFile(file) {
  if (!existsSync(file)) return;

  for (const line of String(readFileSync(file)).split(/\r?\n/)) {
    const index = line.indexOf('=');
    if (index < 1 || line.trimStart().startsWith('#')) continue;

    const key = line.slice(0, index).trim();
    if (shellEnvironmentKeys.has(key)) continue;
    process.env[key] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, '.env.local'));

function isNewSupabaseApiKey(value) {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(key) {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (isNewSupabaseApiKey(key) && headers.get('Authorization') === `Bearer ${key}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing. Add it to .env.local.`);
  return value;
}

function client() {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requireApply() {
  if (!apply) {
    throw new Error('This command changes the new project. Re-run it with --apply after the schema step is complete.');
  }
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records
    .filter((record) => record.length === headers.length && record.some((entry) => entry !== ''))
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index]])));
}

function parsePostgresArray(value) {
  if (value === '{}') return [];
  const values = [];
  let item = '';
  let quoted = false;
  let escaped = false;

  for (const character of value.slice(1, -1)) {
    if (escaped) {
      item += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(item);
      item = '';
    } else {
      item += character;
    }
  }
  values.push(item);
  return values;
}

const tableConfig = [
  { table: 'companies', emptyValues: { description: '' } },
  { table: 'ai_prompt_settings', onConflict: 'key' },
  {
    table: 'job_seekers',
    arrays: ['majors', 'job_interests', 'company_interests', 'work_regions', 'employment_types'],
    json: ['external_links'],
  },
  {
    table: 'job_simulations',
    json: ['steps'],
    emptyValues: {
      description: '',
      steps: [],
      simulation_format: 'single',
      selection_mode: 'separated',
      shared_situation: '',
      shared_materials: '',
    },
  },
  {
    table: 'resumes',
    arrays: ['skills', 'tools'],
    json: ['basics', 'job_conditions', 'educations', 'experiences', 'portfolios'],
  },
  { table: 'submissions', json: ['score_json', 'response_json', 'ai_chat_log'] },
  { table: 'applicants', arrays: ['skills', 'tools'], json: ['portfolio', 'simulation'] },
  { table: 'company_job_postings' },
  { table: 'company_saved_applicants' },
  { table: 'company_applicant_review_states' },
  { table: 'company_applicant_ai_reviews', json: ['analysis'] },
  { table: 'company_simulation_ai_reviews', json: ['analysis'] },
  { table: 'expert_simulation_share_feedback' },
  { table: 'service_applications' },
  { table: 'coffee_chat_bookings' },
];

function normalizeRecord(record, config) {
  const arrays = new Set(config.arrays ?? []);
  const json = new Set(config.json ?? []);
  const emptyValues = config.emptyValues ?? {};
  return Object.fromEntries(
    Object.entries(record).map(([key, rawValue]) => {
      if (rawValue === '') return [key, key in emptyValues ? emptyValues[key] : null];
      if (arrays.has(key)) return [key, parsePostgresArray(rawValue)];
      if (json.has(key)) return [key, JSON.parse(rawValue)];
      if (rawValue === 't') return [key, true];
      if (rawValue === 'f') return [key, false];
      return [key, rawValue];
    }),
  );
}

function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

async function importAuth() {
  requireApply();
  const supabase = client();
  const users = JSON.parse(await readFile(path.join(extrasDir, 'auth_users.json'), 'utf8'));
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const existingByEmail = new Map(existing.users.map((user) => [user.email, user]));
  for (const user of users) {
    const oldUser = existingByEmail.get(user.email);
    if (oldUser) {
      if (oldUser.id !== user.id) {
        throw new Error(`Auth user ${user.email} already exists with a different UUID.`);
      }
      console.log(`Auth user exists: ${user.email}`);
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      email_confirm: Boolean(user.email_confirmed_at),
      user_metadata: user.user_metadata ?? {},
      app_metadata: user.app_metadata ?? {},
    });
    if (error) throw new Error(`Could not create ${user.email}: ${error.message}`);
    console.log(`Created auth user: ${user.email}`);
  }
}

async function rewriteStorageUrls(supabase) {
  const oldBase = 'https://axgfbyctgtbeqhahtelb.supabase.co';
  const newBase = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const targets = [
    ['job_simulations', 'card_image_url'],
    ['job_simulations', 'expert_profile_image_url'],
    ['companies', 'logo_url'],
    ['job_seekers', 'avatar_url'],
  ];

  for (const [table, column] of targets) {
    const { data, error } = await supabase.from(table).select(`id,${column}`).like(column, `${oldBase}%`);
    if (error) throw error;

    for (const row of data ?? []) {
      const { error: updateError } = await supabase
        .from(table)
        .update({ [column]: row[column].replace(oldBase, newBase) })
        .eq('id', row.id);
      if (updateError) throw updateError;
    }
    console.log(`Rewrote ${data?.length ?? 0} ${table}.${column} URL(s).`);
  }
}

async function importData() {
  requireApply();
  const supabase = client();

  for (const config of tableConfig) {
    const csvPath = path.join(exportDir, `${config.table}.csv`);
    const records = parseCsv(await readFile(csvPath, 'utf8')).map((record) => normalizeRecord(record, config));
    if (records.length === 0) {
      console.log(`Skipped ${config.table}: no rows.`);
      continue;
    }

    const onConflict = config.onConflict ?? (records[0].id ? 'id' : null);
    for (const chunk of chunks(records, 20)) {
      const query = onConflict
        ? supabase.from(config.table).upsert(chunk, { onConflict })
        : supabase.from(config.table).insert(chunk);
      const { error } = await query;
      if (error) throw new Error(`${config.table} import failed: ${error.message}`);
    }
    console.log(`Imported ${records.length} ${config.table} row(s).`);
  }

  await rewriteStorageUrls(supabase);
}

async function exactStoragePath(root, objectPath) {
  let current = root;
  for (const segment of objectPath.split('/')) {
    const names = await readdir(current);
    if (!names.includes(segment)) return null;
    current = path.join(current, segment);
  }
  return current;
}

async function importStorage() {
  requireApply();
  const supabase = client();
  const manifest = JSON.parse(await readFile(path.join(extrasDir, 'storage_manifest.json'), 'utf8'));
  let uploaded = 0;
  const skipped = [];

  for (const item of manifest) {
    const filePath = await exactStoragePath(path.join(extrasDir, 'storage_files', item.bucket), item.path);
    if (!filePath) {
      skipped.push(`${item.bucket}/${item.path}`);
      continue;
    }
    const content = await readFile(filePath);
    const cacheControl = String(item.cache_control ?? '3600').match(/\d+/)?.[0] ?? '3600';
    const { error } = await supabase.storage.from(item.bucket).upload(item.path, content, {
      upsert: true,
      contentType: item.content_type ?? 'application/octet-stream',
      cacheControl,
    });
    if (error) throw new Error(`Storage upload failed for ${item.bucket}/${item.path}: ${error.message}`);
    uploaded += 1;
  }

  console.log(`Uploaded ${uploaded} storage object(s).`);
  if (skipped.length > 0) console.warn(`Skipped missing source file(s): ${skipped.join(', ')}`);
}

async function countStorageObjects(supabase, bucket, prefix = '') {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;

  let count = 0;
  for (const item of data ?? []) {
    if (item.id) count += 1;
    else count += await countStorageObjects(supabase, bucket, prefix ? `${prefix}/${item.name}` : item.name);
  }
  return count;
}

async function verify() {
  const supabase = client();
  let hasMismatch = false;
  const users = JSON.parse(await readFile(path.join(extrasDir, 'auth_users.json'), 'utf8'));
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw authError;
  console.log(`auth.users: ${authData.users.length}/${users.length}`);
  hasMismatch ||= authData.users.length !== users.length;

  for (const config of tableConfig) {
    const expected = parseCsv(await readFile(path.join(exportDir, `${config.table}.csv`), 'utf8')).length;
    const { count, error } = await supabase.from(config.table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`${config.table}: ${count ?? 0}/${expected}`);
    hasMismatch ||= (count ?? 0) !== expected;
  }

  const manifest = JSON.parse(await readFile(path.join(extrasDir, 'storage_manifest.json'), 'utf8'));
  const buckets = [...new Set(manifest.map((item) => item.bucket))];
  const expectedStorage = await Promise.all(
    manifest.map(async (item) => (await exactStoragePath(path.join(extrasDir, 'storage_files', item.bucket), item.path)) ? 1 : 0),
  );
  let actualStorage = 0;
  for (const bucket of buckets) actualStorage += await countStorageObjects(supabase, bucket);
  const expectedCount = expectedStorage.reduce((sum, count) => sum + count, 0);
  console.log(`storage objects: ${actualStorage}/${expectedCount} (${manifest.length - expectedCount} source file(s) intentionally missing)`);
  hasMismatch ||= actualStorage !== expectedCount;

  if (hasMismatch) process.exitCode = 1;
}

async function validateInputs() {
  const users = JSON.parse(await readFile(path.join(extrasDir, 'auth_users.json'), 'utf8'));
  console.log(`Auth export: ${users.length} user(s).`);

  for (const config of tableConfig) {
    const records = parseCsv(await readFile(path.join(exportDir, `${config.table}.csv`), 'utf8'));
    for (const record of records) normalizeRecord(record, config);
    console.log(`${config.table}: ${records.length} row(s) parsed.`);
  }

  const manifest = JSON.parse(await readFile(path.join(extrasDir, 'storage_manifest.json'), 'utf8'));
  let present = 0;
  const missing = [];
  for (const item of manifest) {
    const filePath = await exactStoragePath(path.join(extrasDir, 'storage_files', item.bucket), item.path);
    if (filePath) present += 1;
    else missing.push(`${item.bucket}/${item.path}`);
  }
  console.log(`Storage export: ${present}/${manifest.length} exact source file(s) present.`);
  if (missing.length > 0) console.log(`Missing source file(s): ${missing.join(', ')}`);
}

const commands = { auth: importAuth, data: importData, storage: importStorage, validate: validateInputs, verify };
if (!commands[phase]) {
  throw new Error('Usage: node scripts/owned-supabase-migration.mjs <auth|data|storage|validate|verify> [--apply]');
}

await commands[phase]();
