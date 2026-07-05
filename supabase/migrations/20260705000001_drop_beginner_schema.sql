-- ============================================================
-- "beginner"(결제형 유료 직무체험 서비스) 스키마 완전 제거
-- 언커버링 MVP로 전면 교체하며 기존 서비스 로직은 더 이상 사용하지 않음
-- (실사용 데이터 없음 확인 후 진행)
-- ============================================================

-- auth.users insert 트리거가 profiles/user_roles에 쓰던 로직부터 제거
-- (순서 중요: 테이블보다 먼저 지우지 않으면 다음 회원가입에서 실패함)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.orders cascade;
drop table if exists public.missions cascade;
drop table if exists public.custom_jobs cascade;
drop table if exists public.mission_requests cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.admin_emails cascade;

drop function if exists public.has_role(uuid, public.app_role);
drop type if exists public.app_role;
