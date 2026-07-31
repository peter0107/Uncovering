create table if not exists public.ads_requests (
  id uuid primary key default gen_random_uuid(),
  job_role text not null check (char_length(job_role) between 1 and 100),
  email text not null check (char_length(email) <= 200),
  company_name text check (company_name is null or char_length(company_name) <= 100),
  created_at timestamptz not null default now()
);

alter table public.ads_requests enable row level security;

comment on table public.ads_requests is
  'Requests submitted through the public /form job simulation form.';
