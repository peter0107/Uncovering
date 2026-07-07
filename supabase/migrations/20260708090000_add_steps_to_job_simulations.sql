-- ============================================================
-- 저작 스텝: 직무 시뮬레이션을 단계별로 나눠 저장
--   steps = [{ id, title, durationMin, difficulty, tags,
--              situation, prevSummary, materials, hint,
--              completionMessage, prompts:[{id,label,body}] }]
-- steps 가 있으면 단계마다 왼쪽 자료가 다르게 렌더되고,
-- 없으면 task_prompt 자동 분할(공통 배경)로 폴백한다.
-- Lovable/Supabase SQL Editor에 그대로 붙여 실행.
-- ============================================================

alter table public.job_simulations
  add column if not exists steps jsonb;
