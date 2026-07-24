-- 관리자 카드 이미지(기업 로고, 카드 배경, 현직자 프로필) 업로드 정책 복구
-- Lovable / Supabase SQL Editor에서 이 파일 전체를 실행하세요.
-- 업로드 경로: {로그인 사용자 UUID}/{자산 종류}/{파일명}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'simulation-card-assets',
  'simulation-card-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own simulation card assets" on storage.objects;
create policy "Users upload own simulation card assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own simulation card assets" on storage.objects;
create policy "Users update own simulation card assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own simulation card assets" on storage.objects;
create policy "Users delete own simulation card assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
