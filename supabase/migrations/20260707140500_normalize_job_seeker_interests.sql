with allowed(values) as (
  values (
    array[
      '기획·전략',
      '법무·사무·총무',
      '인사·HR',
      '회계·세무',
      '마케팅·광고·MD',
      'AI·개발·데이터',
      '디자인',
      '물류·무역',
      '운전·운송·배송',
      '영업',
      '고객상담·TM',
      '금융·보험',
      '식·음료',
      '고객서비스·리테일',
      '엔지니어링·설계',
      '제조·생산',
      '교육',
      '건축·시설',
      '의료·바이오',
      '미디어·문화·스포츠',
      '공공·복지'
    ]::text[]
  )
),
normalized as (
  select
    seeker.id,
    nullif(array_agg(item) filter (where item = any(allowed.values)), '{}'::text[]) as job_interests
  from public.job_seekers seeker
  cross join allowed
  left join lateral unnest(coalesce(seeker.job_interests, '{}'::text[])) as item on true
  group by seeker.id
)
update public.job_seekers seeker
set job_interests = normalized.job_interests
from normalized
where seeker.id = normalized.id
  and seeker.job_interests is distinct from normalized.job_interests;
