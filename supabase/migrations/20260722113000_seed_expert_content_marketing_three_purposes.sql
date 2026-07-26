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
  simulation_format, selection_mode, shared_situation, shared_materials, steps,
  simulation_source, expert_nickname, expert_company_type, expert_experience_band,
  expert_job_title, card_background_color, card_text_color, is_public
)
select
  target_company.id,
  '[콘텐츠 마케팅] 같은 주제, 목적이 다른 세 가지 콘텐츠 기획',
  '콘텐츠 마케팅', '콘텐츠 마케팅', '마케팅·광고·MD', 25,
  '같은 주제를 목적에 맞게 다르게 기획합니다.',
  'selection', 'common',
  $situation$
## 상황

당신은 소상공인 대상 매장 운영·마케팅 올인원 서비스를 홍보하는 콘텐츠 마케터입니다.

팀은 '흩어진 고객을 단골로 만들어 매장 매출을 높일 수 있다'는 내용으로 콘텐츠를 제작하려고 합니다. 같은 주제라도 콘텐츠의 목적에 따라 제목, 전달 방식, 성과를 확인할 지표가 달라집니다. 세 가지 목적에 맞춰 각각 기획해주세요.
$situation$,
  $materials$
## 개요

| 항목 | 내용 |
| --- | --- |
| 대상 | 콘텐츠 마케팅 직무 취업준비생 |
| 구성 | 3단계 |
| 예상 소요 시간 | 총 20~25분 (단계당 7~8분) |
| 제출물 | 단계별 결과물 각 1개 |
| 제출 형식 | 자유 (글, 표 모두 가능) |

## 제공 자료: 서비스 정보

- 월 구독형 서비스로, 초기 도입 비용 없이 시작할 수 있습니다.
- 예약·고객 관리(CRM), 리뷰 모아보기·응대, 단골 마케팅(쿠폰·알림톡 자동 발송)을 한 곳에서 제공합니다.
- 타깃 고객은 카페·음식점·미용실 등 오프라인 소상공인 사장님입니다.
- 흩어진 고객 데이터를 한 곳에 모아 재방문을 유도하며, 도입 전 무료 체험과 시연을 제공합니다.

## 작업 순서

각 단계에서 콘텐츠 제목, 도입 카피, 핵심 KPI를 작성합니다. 세 단계의 결과물을 비교했을 때 목적에 따른 차이가 드러나야 합니다.

## 최종 결과물 요약

| 단계 | 결과물 |
| --- | --- |
| 1단계 | 바이럴 콘텐츠 제목·카피·KPI |
| 2단계 | SEO 콘텐츠 제목·카피·KPI |
| 3단계 | 세일즈 콘텐츠 제목·카피·행동 유도 문구·KPI |

## 확인 포인트

| 항목 | 내용 |
| --- | --- |
| 목적 구분 | 세 콘텐츠의 제목과 카피가 목적에 따라 명확하게 달라지는가 |
| 바이럴 | 클릭하고 싶어지는 호기심 요소가 있는가 (1단계) |
| SEO | 검색 의도와 핵심 키워드가 제목·카피에 반영됐는가 (2단계) |
| 세일즈 | 서비스 정보를 활용한 효용 전달과 행동 유도가 있는가 (3단계) |
| KPI 일치 | 각 콘텐츠의 KPI가 목적과 일치하는가 |

정답을 맞히는 것보다, 목적이 달라지면 무엇이 달라져야 하는지 구분해서 쓰는 능력을 중심으로 확인합니다.
$materials$,
  jsonb_build_array(
    jsonb_build_object(
      'id', 'content-three-purposes-step-1',
      'title', '바이럴 콘텐츠를 기획해주세요.',
      'durationMin', 8,
      'difficulty', 1,
      'prompts', jsonb_build_array(jsonb_build_object(
        'id', 'content-three-purposes-prompt-1',
        'label', '바이럴 콘텐츠 제목·카피·KPI',
        'body', $prompt1$
SNS에서 호기심을 유발하고 많은 클릭을 얻는 것이 목적입니다.

다음 내용을 작성하세요.

- 콘텐츠 제목
- 도입 카피 (첫 문단 또는 첫 슬라이드 문구)
- 핵심 KPI 1개와 선정 이유
$prompt1$
      ))
    ),
    jsonb_build_object(
      'id', 'content-three-purposes-step-2',
      'title', 'SEO 콘텐츠를 기획해주세요.',
      'durationMin', 8,
      'difficulty', 2,
      'prompts', jsonb_build_array(jsonb_build_object(
        'id', 'content-three-purposes-prompt-2',
        'label', 'SEO 콘텐츠 제목·카피·KPI',
        'body', $prompt2$
'매장 예약 관리', '단골 마케팅' 등을 검색한 사용자가 콘텐츠를 발견하게 하는 것이 목적입니다.

다음 내용을 작성하세요.

- 콘텐츠 제목
- 도입 카피 (첫 문단)
- 핵심 KPI 1개와 선정 이유
$prompt2$
      ))
    ),
    jsonb_build_object(
      'id', 'content-three-purposes-step-3',
      'title', '세일즈 콘텐츠를 기획해주세요.',
      'durationMin', 8,
      'difficulty', 2,
      'prompts', jsonb_build_array(jsonb_build_object(
        'id', 'content-three-purposes-prompt-3',
        'label', '세일즈 콘텐츠 제목·카피·행동 유도 문구·KPI',
        'body', $prompt3$
서비스 도입을 고민하는 매장 사장님의 상담 신청을 유도하는 것이 목적입니다.

다음 내용을 작성하세요.

- 콘텐츠 제목
- 도입 카피 (첫 문단)
- 상담 신청으로 연결하는 행동 유도 문구
- 핵심 KPI 1개와 선정 이유
$prompt3$
      ))
    )
  ),
  'expert', '현직 콘텐츠 마케터', '스타트업', '3~5년차', '콘텐츠 마케터',
  '#ffffff', '#18181b', false
from target_company
where not exists (
  select 1 from public.job_simulations
  where title = '[콘텐츠 마케팅] 같은 주제, 목적이 다른 세 가지 콘텐츠 기획'
    and simulation_source = 'expert'
);
