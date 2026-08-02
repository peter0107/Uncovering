alter table public.job_seekers
  add column if not exists nickname text;

create unique index if not exists job_seekers_nickname_unique
  on public.job_seekers (lower(nickname))
  where nickname is not null;
