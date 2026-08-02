-- 전체 직무 목록에서 접수하는 희망 기업·직무 요청
create table if not exists public.company_role_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete set null,
  requester_email text,
  company_name text not null,
  role_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists company_role_requests_created_at_idx
  on public.company_role_requests (created_at desc);

alter table public.company_role_requests enable row level security;

-- 요청의 조회와 관리는 서버의 service_role 전용으로 처리한다.
drop policy if exists "Block direct company role request reads" on public.company_role_requests;
create policy "Block direct company role request reads"
on public.company_role_requests
for select
using (false);

grant all on public.company_role_requests to service_role;
