create table if not exists public.company_applicant_review_states (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  applicant_id uuid not null,
  submission_id uuid references public.submissions(id) on delete cascade,
  read_at timestamptz,
  mail_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_company_applicant_review_states_company_applicant
  on public.company_applicant_review_states (company_id, applicant_id);

create index if not exists idx_company_applicant_review_states_company_id
  on public.company_applicant_review_states (company_id);

create index if not exists idx_company_applicant_review_states_submission_id
  on public.company_applicant_review_states (submission_id);

alter table public.company_applicant_review_states enable row level security;

drop policy if exists "Block direct company applicant review state reads"
  on public.company_applicant_review_states;

create policy "Block direct company applicant review state reads"
on public.company_applicant_review_states
for select
using (false);

grant all on public.company_applicant_review_states to service_role;
