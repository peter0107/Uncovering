-- ============================================================
-- avatars 버킷: 본인 폴더 범위 SELECT 정책 복구
--
-- 20260707151141 마이그레이션이 버킷 전체 열거 차단을 위해
-- "Avatars are publicly readable" SELECT 정책을 드롭했는데,
-- avatars 버킷에 다른 SELECT 정책이 없어 SELECT 정책이 0개가 됐다.
-- public 버킷이라 URL 직접 읽기(이미지 표시)는 계속 되지만,
-- upsert=true 재업로드는 기존 객체 행을 SELECT로 먼저 찾아야 하는데
-- 그게 막혀 "Object not found"(400)로 실패한다.
--
-- 전체 공개 SELECT를 되살리지 않고(=버킷 전체 열거는 계속 차단),
-- 인증 사용자가 자기 폴더의 객체만 SELECT하도록 스코프해 upsert를 복구한다.
-- ============================================================

drop policy if exists "Users read own avatar" on storage.objects;
create policy "Users read own avatar"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
