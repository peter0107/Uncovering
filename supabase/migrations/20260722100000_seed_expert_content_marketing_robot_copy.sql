with expert_company as (
  select id from public.companies where code = 'EXPERT-SIMULATIONS-2026' limit 1
), created_expert_company as (
  insert into public.companies (name, code, unique_code, role_label, description)
  select '현직자 제시 시뮬레이션', 'EXPERT-SIMULATIONS-2026', 'EXPERT-SIMULATIONS-2026', '현직자 제시', ''
  where not exists (select 1 from expert_company)
  returning id
), target_company as (
  select id from expert_company union all select id from created_expert_company
)
insert into public.job_simulations (
  company_id, title, role_label, job_family, domain, estimated_minutes, description,
  simulation_format, single_answer_question, task_prompt, simulation_source,
  expert_nickname, expert_company_type, expert_experience_band, expert_job_title,
  card_background_color, card_text_color, is_public
)
select
  target_company.id,
  '[콘텐츠 마케팅] 콘텐츠 목적별 기획안 작성',
  '콘텐츠 마케팅', '콘텐츠 마케팅', '마케팅·광고·MD', 30,
  '동일한 주제를 콘텐츠 목적에 맞게 다르게 기획합니다.',
  'single',
  $question$
각 목적별로 다음 내용을 작성하세요.

- 콘텐츠 제목
- 첫 문단 또는 도입 카피
- 주요 타깃
- 제목을 이렇게 작성한 이유
- 핵심 KPI
$question$,
  $prompt$
# 직무 미션

동일한 주제를 콘텐츠 목적에 맞게 다르게 기획하세요.

## 상황

당신은 소상공인 대상 매장 운영·마케팅 올인원 서비스를 홍보하는 콘텐츠 마케터입니다.

팀은 ‘흩어진 고객을 단골로 만들어 매장 매출을 높일 수 있다’는 내용을 바탕으로 콘텐츠를 제작하려고 합니다.

다만 콘텐츠의 목적에 따라 제목과 전달 방식이 달라져야 합니다.

## 서비스 정보

- 월 구독형 서비스로, 초기 도입 비용 없이 시작할 수 있습니다.
- 예약·고객 관리(CRM), 리뷰 모아보기·응대, 단골 마케팅(쿠폰·알림톡 자동 발송)을 한 곳에서 제공합니다.
- 타깃 고객은 카페·음식점·미용실 등 오프라인 소상공인 사장님입니다.
- 흩어진 고객 데이터를 한 곳에 모아 재방문을 유도하며, 도입 전 무료 체험을 제공합니다.

## 수행 과제

다음 세 가지 목적에 맞는 콘텐츠 제목과 도입 문구를 각각 작성하세요.

### 1. 바이럴 콘텐츠

SNS에서 호기심을 유발하고 많은 클릭을 얻는 것이 목적입니다.

### 2. SEO 콘텐츠

‘매장 예약 관리’, ‘단골 마케팅’ 등의 키워드를 검색한 사용자가 콘텐츠를 발견하게 하는 것이 목적입니다.

### 3. 세일즈 콘텐츠

서비스 도입을 고민하는 매장 사장님의 상담 신청을 유도하는 것이 목적입니다.

## 제출 내용

각 목적별로 다음 내용을 작성하세요.

- 콘텐츠 제목
- 첫 문단 또는 도입 카피
- 주요 타깃
- 제목을 이렇게 작성한 이유
- 핵심 KPI

## 평가 기준

- 콘텐츠 목적에 따라 제목과 카피가 명확하게 달라지는가
- 바이럴 콘텐츠가 호기심을 유발하는가
- SEO 콘텐츠에 검색 의도와 핵심 키워드가 반영됐는가
- 세일즈 콘텐츠에 서비스 효용과 행동 유도가 포함됐는가
- 선택한 KPI가 콘텐츠 목적과 일치하는가
$prompt$,
  'expert', '현직 콘텐츠 마케터', '스타트업', '3~5년차', '콘텐츠 마케터',
  '#ffffff', '#18181b', false
from target_company
where not exists (
  select 1 from public.job_simulations
  where title = '[콘텐츠 마케팅] 콘텐츠 목적별 기획안 작성'
    and simulation_source = 'expert'
);
