-- Auth 대시보드에서 사용자를 직접 삭제해도 public 사용자 데이터를 함께 삭제한다.
-- 이력서와 제출물은 job_seekers FK의 ON DELETE CASCADE로 정리된다.

create or replace function public.delete_job_seeker_on_auth_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.job_seekers
  where id = old.id;

  -- 초기 기업용 지원자 테이블은 Auth UUID 연결이 없어서 이메일 기준으로 함께 정리한다.
  delete from public.applicants
  where email = old.email;

  return old;
end;
$$;

drop trigger if exists delete_job_seeker_on_auth_user_delete on auth.users;

create trigger delete_job_seeker_on_auth_user_delete
after delete on auth.users
for each row
execute function public.delete_job_seeker_on_auth_user_delete();

-- 트리거를 만들기 전에 Auth에서 이미 삭제되어 고아가 된 계정도 한 번 정리한다.
-- resumes와 submissions 등은 job_seekers FK의 ON DELETE CASCADE로 함께 삭제된다.
delete from public.job_seekers as seeker
where not exists (
  select 1
  from auth.users as auth_user
  where auth_user.id = seeker.id
);
