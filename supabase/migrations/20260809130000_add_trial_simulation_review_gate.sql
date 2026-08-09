alter table public.landing_trial_orders
  add column if not exists review_required boolean not null default false,
  add column if not exists trial_content_updated_at timestamptz,
  add column if not exists last_reviewed_at timestamptz;

-- 기존 미발송 체험 과제는 검수 의견이 없는 경우에만 재검수 대기로 초기화한다.
update public.landing_trial_orders as orders
set
  review_required = not exists (
    select 1
    from public.expert_simulation_share_feedback as feedback
    where feedback.simulation_id = orders.simulation_id
  ),
  trial_content_updated_at = coalesce(orders.trial_content_updated_at, orders.created_at)
where orders.simulation_id is not null
  and orders.delivered_at is null;
