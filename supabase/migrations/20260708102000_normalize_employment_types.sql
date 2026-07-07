-- Normalize employment type values across profile and resume data.
-- Canonical options: 인턴, 신입, 계약직, 경력직

with raw_profile_types as (
  select
    js.id,
    case
      when trim(value) in ('정규직', '하이브리드', '경력') then '경력직'
      else trim(value)
    end as employment_type
  from public.job_seekers js
  cross join lateral unnest(coalesce(js.employment_types, array[]::text[])) as raw_value(value)
),
profile_types as (
  select distinct
    id,
    employment_type,
    case employment_type
      when '인턴' then 1
      when '신입' then 2
      when '계약직' then 3
      when '경력직' then 4
      else 99
    end as sort_order
  from raw_profile_types
  where employment_type in ('인턴', '신입', '계약직', '경력직')
),
normalized_profiles as (
  select
    id,
    array_agg(employment_type order by sort_order) as employment_types
  from profile_types
  group by id
)
update public.job_seekers js
set employment_types = normalized_profiles.employment_types
from normalized_profiles
where js.id = normalized_profiles.id
  and js.employment_types is distinct from normalized_profiles.employment_types;

with raw_resume_types as (
  select
    r.id,
    case
      when trim(value) in ('정규직', '하이브리드', '경력') then '경력직'
      else trim(value)
    end as employment_type
  from public.resumes r
  cross join lateral regexp_split_to_table(coalesce(r.job_conditions->>'employment_type', ''), ',') as raw_value(value)
),
resume_types as (
  select distinct
    id,
    employment_type,
    case employment_type
      when '인턴' then 1
      when '신입' then 2
      when '계약직' then 3
      when '경력직' then 4
      else 99
    end as sort_order
  from raw_resume_types
  where employment_type in ('인턴', '신입', '계약직', '경력직')
),
normalized_resumes as (
  select
    id,
    string_agg(employment_type, ', ' order by sort_order) as employment_type
  from resume_types
  group by id
)
update public.resumes r
set job_conditions = jsonb_set(
  coalesce(r.job_conditions, '{}'::jsonb),
  '{employment_type}',
  to_jsonb(normalized_resumes.employment_type),
  true
)
from normalized_resumes
where r.id = normalized_resumes.id
  and coalesce(r.job_conditions->>'employment_type', '') is distinct from normalized_resumes.employment_type;
