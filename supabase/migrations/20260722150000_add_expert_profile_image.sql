-- 현직자 시뮬레이션 카드의 프로필 사진을 저장한다.
-- 이미지 파일은 기존 simulation-card-assets Storage 버킷에 업로드된다.

alter table public.job_simulations
  add column if not exists expert_profile_image_url text;
