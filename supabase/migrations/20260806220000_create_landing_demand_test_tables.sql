-- 수요조사 랜딩페이지 2종(/lp/outsourcing, /lp/trial)용 리드·주문 테이블.
-- CLAUDE.md §1의 제품 정의(기업은 답안 열람만)와 무관한 별도 수요검증 데이터이며,
-- 기존 job_seekers/submissions/company_role_requests와 조인하지 않는다.

-- 27a: "초저가 외주" 사전예약 이메일 리드
create table if not exists public.landing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'outsourcing',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists landing_leads_created_at_idx
  on public.landing_leads (created_at desc);

alter table public.landing_leads enable row level security;

drop policy if exists "Block direct landing lead reads" on public.landing_leads;
create policy "Block direct landing lead reads"
on public.landing_leads
for select
using (false);

grant all on public.landing_leads to service_role;

-- 27b: "9,900원 직무 체험" 결제 주문 (PG: 페이앱)
create table if not exists public.landing_trial_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  email text not null,
  phone text not null,
  job_role text not null,
  company_type text not null,
  plan text not null check (plan in ('single', 'pack3', 'monthly')),
  amount integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'canceled', 'refunded')),
  mul_no text,
  pay_type text,
  paid_at timestamptz,
  delivered_at timestamptz,
  refunded_at timestamptz,
  refund_reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists landing_trial_orders_mul_no_idx
  on public.landing_trial_orders (mul_no)
  where mul_no is not null;

create index if not exists landing_trial_orders_created_at_idx
  on public.landing_trial_orders (created_at desc);

alter table public.landing_trial_orders enable row level security;

drop policy if exists "Block direct landing trial order reads" on public.landing_trial_orders;
create policy "Block direct landing trial order reads"
on public.landing_trial_orders
for select
using (false);

grant all on public.landing_trial_orders to service_role;
