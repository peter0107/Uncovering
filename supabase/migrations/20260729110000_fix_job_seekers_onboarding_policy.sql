-- 온보딩에서 로그인 사용자가 자신의 구직자 프로필을 생성·수정할 수 있도록 한다.
drop policy if exists seeker_self_all on public.job_seekers;

create policy seeker_self_all on public.job_seekers
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update, delete on public.job_seekers to authenticated;
