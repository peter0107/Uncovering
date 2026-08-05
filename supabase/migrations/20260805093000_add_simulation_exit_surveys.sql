create table if not exists public.simulation_exit_surveys (
  id uuid primary key default gen_random_uuid(),
  job_seeker_id uuid references public.job_seekers(id) on delete set null,
  job_simulation_id uuid not null references public.job_simulations(id) on delete cascade,
  reason text not null check (reason in ('too_difficult', 'too_long', 'too_much_effort', 'not_fun', 'other')),
  other_text text,
  step_index integer not null default 1 check (step_index >= 1),
  total_steps integer not null default 1 check (total_steps >= 1),
  answered_count integer not null default 0 check (answered_count >= 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  created_at timestamptz not null default now(),
  constraint simulation_exit_surveys_other_text_check check (
    (reason = 'other' and nullif(btrim(other_text), '') is not null)
    or (reason <> 'other' and other_text is null)
  )
);

create index if not exists simulation_exit_surveys_created_at_idx
  on public.simulation_exit_surveys (created_at desc);
create index if not exists simulation_exit_surveys_simulation_id_idx
  on public.simulation_exit_surveys (job_simulation_id);

alter table public.simulation_exit_surveys enable row level security;

comment on table public.simulation_exit_surveys is '시뮬레이션 중도 이탈 사유 설문';