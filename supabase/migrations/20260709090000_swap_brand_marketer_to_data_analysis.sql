-- ============================================================
-- 브랜드 마케터 시뮬레이션(관리자 패널에서 마이그레이션 없이 직접 추가된 것,
--   '신제품 출시를 위한 브랜드 마케팅 캠페인 전략 수립') 숨김 처리
-- 데이터 분석 시뮬레이션('마케팅 캠페인 A/B 테스트 결과 해석', 5개 미션 풀 콘텐츠
--   보유, 20260708100000 마이그레이션에서 MD·바이어로 교체되며 숨겨졌었음) 다시 공개
-- Lovable/Supabase SQL Editor에 그대로 붙여 실행.
-- ============================================================

-- 1) 브랜드 마케터 : 숨김(soft delete)
update public.job_simulations
set
  is_public = false,
  deleted_at = coalesce(deleted_at, now())
where id = '350bc7fd-0180-4993-aa60-38661238c0b1';

-- 2) 데이터 분석(마케팅 캠페인 A/B 테스트 결과 해석) : 숨김 해제(복구)
update public.job_simulations
set
  is_public = true,
  deleted_at = null
where id = '4f94b376-c58d-4f4c-80ba-ad71c6f93ba9';
