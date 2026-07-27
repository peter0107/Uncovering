-- JD 시뮬레이션 생성은 HTTP 요청과 분리해 Worker Cron이 처리합니다.
create table if not exists public.simulation_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  result jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists simulation_generation_jobs_pending_idx
  on public.simulation_generation_jobs (status, created_at)
  where status = 'queued';

alter table public.simulation_generation_jobs enable row level security;
grant all on public.simulation_generation_jobs to service_role;

-- Cron 실행이 중복되더라도 한 작업은 한 Worker만 가져갑니다.
create or replace function public.claim_simulation_generation_job()
returns setof public.simulation_generation_jobs
language plpgsql
security definer
set search_path = public
as $function$
declare
  claimed_job public.simulation_generation_jobs;
begin
  -- Worker가 비정상 종료된 작업은 20분 뒤 다시 대기 상태로 되돌립니다.
  update public.simulation_generation_jobs
  set status = 'queued', started_at = null, updated_at = now()
  where status = 'processing'
    and started_at < now() - interval '20 minutes';

  select *
  into claimed_job
  from public.simulation_generation_jobs
  where status = 'queued'
  order by created_at asc
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.simulation_generation_jobs
  set status = 'processing',
      attempts = attempts + 1,
      started_at = now(),
      error_message = null,
      updated_at = now()
  where id = claimed_job.id
  returning * into claimed_job;

  return next claimed_job;
end;
$function$;

revoke all on function public.claim_simulation_generation_job() from public, anon, authenticated;
grant execute on function public.claim_simulation_generation_job() to service_role;
