-- 로그인 사용자 기준으로 온보딩 직무 관심사를 안전하게 저장한다.
-- 이전 백엔드에서 같은 이메일로 생성된 다른 UUID 프로필이 있을 경우,
-- 연결된 데이터는 보존한 채 현재 Auth UUID로 연결한다.

create or replace function public.save_onboarding_job_interests(
  p_job_interests text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_legacy_id uuid;
  v_reference record;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if v_email = '' then
    raise exception '로그인 이메일을 확인할 수 없습니다.';
  end if;

  if not exists (
    select 1
    from public.job_seekers
    where id = v_user_id
  ) then
    select id
    into v_legacy_id
    from public.job_seekers
    where lower(email) = v_email
    limit 1;

    if v_legacy_id is not null then
      -- email은 unique이므로 기존 행의 이메일을 임시 값으로 바꿔 새 Auth UUID 행을 만든다.
      update public.job_seekers
      set email = format('legacy-%s@invalid.local', v_legacy_id)
      where id = v_legacy_id;

      insert into public.job_seekers (
        id,
        email,
        education_level,
        majors,
        academic_mark,
        job_interests,
        company_interests,
        work_regions,
        employment_types,
        willing_to_relocate,
        one_line_intro,
        external_links,
        discovery_consent,
        created_at,
        avatar_url,
        university_name,
        display_name
      )
      select
        v_user_id,
        v_email,
        education_level,
        majors,
        academic_mark,
        job_interests,
        company_interests,
        work_regions,
        employment_types,
        willing_to_relocate,
        one_line_intro,
        external_links,
        discovery_consent,
        created_at,
        avatar_url,
        university_name,
        display_name
      from public.job_seekers
      where id = v_legacy_id;

      -- job_seekers를 참조하는 모든 테이블을 현재 Auth UUID로 재연결한다.
      for v_reference in
        select
          child.relname as table_name,
          attribute.attname as column_name
        from pg_constraint con
        join pg_class child on child.oid = con.conrelid
        join pg_namespace child_schema on child_schema.oid = child.relnamespace
        join unnest(con.conkey) with ordinality as key_column(attnum, position)
          on true
        join pg_attribute attribute
          on attribute.attrelid = con.conrelid
          and attribute.attnum = key_column.attnum
        where con.contype = 'f'
          and con.confrelid = 'public.job_seekers'::regclass
          and child_schema.nspname = 'public'
      loop
        execute format(
          'update public.%I set %I = $1 where %I = $2',
          v_reference.table_name,
          v_reference.column_name,
          v_reference.column_name
        )
        using v_user_id, v_legacy_id;
      end loop;

      delete from public.job_seekers where id = v_legacy_id;
    else
      insert into public.job_seekers (id, email, job_interests)
      values (v_user_id, v_email, coalesce(p_job_interests, '{}'::text[]));
    end if;
  end if;

  update public.job_seekers
  set job_interests = coalesce(p_job_interests, '{}'::text[])
  where id = v_user_id;
end;
$function$;

revoke all on function public.save_onboarding_job_interests(text[]) from public;
grant execute on function public.save_onboarding_job_interests(text[]) to authenticated;
