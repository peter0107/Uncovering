# Own Supabase Migration

This guide moves the Lovable Cloud export into the owned Supabase project without
changing the currently deployed site until validation finishes.

## Source directories

The scripts expect these local directories by default:

```text
/Users/gyuh/Downloads/db-export
/Users/gyuh/Downloads/supabase-migration-extras
```

Override them only when the exports move:

```env
MIGRATION_EXPORT_DIR="/absolute/path/to/db-export"
MIGRATION_EXTRAS_DIR="/absolute/path/to/supabase-migration-extras"
```

## 1. Prepare the schema workspace

The project has two historical migration files with the same timestamp. The
preparation script copies every migration into a temporary, CLI-safe workspace
and gives only the duplicate a one-second offset. It does not edit the source
migrations.

```bash
node scripts/prepare-owned-supabase-schema.mjs
npx supabase@latest login
npx supabase@latest --workdir .owned-supabase-workdir link --project-ref nismhxliklzjxpiszuaj
npx supabase@latest --workdir .owned-supabase-workdir db push
```

`link` is needed only once per machine. Re-running the preparation script refreshes
the copied migrations without removing the linked-project metadata.

The historical migrations include seed data. That data is cleared in the next
step so the CSV export becomes the only imported public-data snapshot.

## 2. Clear historical seed data

In the new project SQL Editor, run:

```sql
-- File: supabase/owned-migration/01_prepare_public_data.sql
```

Use the file contents exactly. This affects only the new project.

## 3. Recreate Auth users and import public data

Run from the repository root. `--apply` is required for write operations.

```bash
node scripts/owned-supabase-migration.mjs auth --apply
node scripts/owned-supabase-migration.mjs data --apply
```

The Auth script preserves the original UUID values. Password hashes are not in
the export, so password users need a reset email. Google OAuth must be configured
in the new project before Google users can sign in.

## 4. Restore Storage

The schema history already creates the buckets. Before loading the exported
policy snapshot, run these two SQL files in order in the new project's SQL
Editor:

1. `supabase/owned-migration/02_reset_storage_policies.sql`
2. `/Users/gyuh/Downloads/supabase-migration-extras/storage_setup.sql`

Then upload the exported files:

```bash
node scripts/owned-supabase-migration.mjs storage --apply
```

The export manifest has 81 objects, while the downloaded folder contains 80.
The missing uppercase `avatars/.../avatar.JPG` is not referenced by the current
`job_seekers.avatar_url`; the script detects it by exact filename and reports it
instead of uploading the lowercase file under an incorrect uppercase path.

## 5. Verify before switching deployment

```bash
node scripts/owned-supabase-migration.mjs verify
```

Expected results:

- `auth.users`: `13/13`
- CSV counts match for every listed public table
- storage objects: `80/80` with one source file reported missing from the
  81-object manifest

The current export parses as 18 companies, 13 job seekers, 38 job simulations,
6 resumes, 5 submissions, 2 applicant review states, 3 simulation AI reviews,
7 AI prompt settings, and one row each for service applications and coffee-chat
bookings.

After the checks pass, configure the owned project's Google provider and set the
production host's environment variables to the same new Supabase URL and keys
from `.env.local`. Do not add `SUPABASE_SERVICE_ROLE_KEY` to client-exposed
environment variables or Git.
