-- 체험 결제자 전용 과제 전달 + 현직자 검수 플로우
--
-- 흐름: 결제(paid) → 관리자가 전용 시뮬레이션 생성(source='trial') → 현직자 검수(승인/수정필요)
--       → 관리자가 고유코드 발급 → 발송 완료(delivered_at) → 결제자가 코드로 열람·수행·제출
--
-- 새 테이블은 만들지 않는다. 1주문 = 1과제 = 1답안이라 landing_trial_orders 컬럼으로 충분하고,
-- 그 테이블은 이미 "select using (false)" + service_role grant 구성이라 RLS 재결정이 필요 없다.

-- 1) 체험 전용 시뮬레이션 소스 값 허용
alter table public.job_simulations
  drop constraint if exists job_simulations_simulation_source_check;

alter table public.job_simulations
  add constraint job_simulations_simulation_source_check
  check (simulation_source in ('company', 'expert', 'trial'));

-- 2) 주문 ↔ 과제 연결 + 고유코드 + 답안
alter table public.landing_trial_orders
  add column if not exists simulation_id uuid references public.job_simulations(id),
  add column if not exists access_code text,
  add column if not exists answer_text text,
  add column if not exists answer_json jsonb,
  add column if not exists answer_started_at timestamptz,
  add column if not exists answer_submitted_at timestamptz;

create unique index if not exists landing_trial_orders_access_code_idx
  on public.landing_trial_orders (access_code)
  where access_code is not null;

create index if not exists landing_trial_orders_simulation_id_idx
  on public.landing_trial_orders (simulation_id)
  where simulation_id is not null;

-- 3) 현직자 검수 판정 (기존 자유 서술 피드백 테이블에 판정 한 칸 추가)
alter table public.expert_simulation_share_feedback
  drop constraint if exists expert_simulation_share_feedback_verdict_check;

alter table public.expert_simulation_share_feedback
  add column if not exists verdict text;

alter table public.expert_simulation_share_feedback
  add constraint expert_simulation_share_feedback_verdict_check
  check (verdict is null or verdict in ('approved', 'revise'));
