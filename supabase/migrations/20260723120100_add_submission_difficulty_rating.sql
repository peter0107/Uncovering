-- ============================================================
-- submissions.difficulty_rating 컬럼 추가.
-- 구직자가 제출 시 시뮬레이션 난이도를 5단계로 평가한 값 (1=매우 쉬움 ~ 5=매우 어려움).
-- 새 제출 폼에서는 필수 입력이지만, 기존 제출 행에는 값이 없으므로 컬럼은 nullable로 둔다
-- (backfill 불필요 — null = 난이도 평가 도입 전 제출).
-- ============================================================

alter table public.submissions
  add column if not exists difficulty_rating smallint;

alter table public.submissions
  drop constraint if exists submissions_difficulty_rating_range;

alter table public.submissions
  add constraint submissions_difficulty_rating_range
  check (difficulty_rating is null or difficulty_rating between 1 and 5);
