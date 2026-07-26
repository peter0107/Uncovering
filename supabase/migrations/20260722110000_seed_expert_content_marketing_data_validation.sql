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
  '[콘텐츠 마케팅] 유입 데이터 기반 콘텐츠 기획과 검증',
  '콘텐츠 마케팅', '콘텐츠 마케팅', '마케팅·광고·MD', 50,
  '유입 데이터를 바탕으로 콘텐츠 기획 방향을 세우고 결과를 검증합니다.',
  'selection', 'common',
  $situation$
## 상황

당신은 소상공인 대상 매장 운영·마케팅 올인원 서비스를 홍보하는 콘텐츠 마케터입니다.

팀에서 전달받은 목표는 하나입니다.

- **목표:** 소상공인이 콘텐츠를 본 뒤 서비스 소개 페이지에 방문해 무료 체험을 신청하게 만든다

팀은 이번 콘텐츠로 확인할 KPI 후보 세 가지를 제시했습니다. 이 중 무엇을 핵심 KPI로 삼을지, 누구에게 어떤 콘텐츠를 만들지는 담당자인 당신이 정합니다.

- 콘텐츠 조회수 증가
- 서비스 가입(무료 체험 신청) 전환율 증가
- 상담 신청 증가

> 이 과제에서 **서비스 소개 페이지**는 서비스의 기능과 요금을 안내하고 무료 체험을 신청할 수 있는 상세 소개 페이지를 뜻합니다.
$situation$,
  $materials$
## 개요

| 항목 | 내용 |
| --- | --- |
| 대상 | 콘텐츠 마케팅 직무 취업준비생 |
| 구성 | 3단계 (순서대로 진행) |
| 예상 소요 시간 | 총 35~50분 (1단계 10~15분 / 2단계 15~20분 / 3단계 10~15분) |
| 제출물 | 단계별 결과물 각 1개 |
| 제출 형식 | 자유 (글, 표 모두 가능) |

## 서비스 개요

당신이 홍보하는 서비스는 소상공인을 위한 매장 운영·마케팅 올인원 플랫폼입니다.

| 항목 | 내용 |
| --- | --- |
| 서비스 형태 | 월 구독형 SaaS (초기 도입 비용 없음) |
| 주요 기능 | 예약·고객 관리(CRM), 리뷰 모아보기·응대, 단골 마케팅(쿠폰·알림톡 자동 발송) |
| 타깃 고객 | 카페·음식점·미용실 등 오프라인 소상공인 사장님 |
| 강점 | 흩어진 고객 데이터를 한 곳에 모아 재방문을 유도, 도입 전 무료 체험 제공 |

## 제공 자료

### 최근 4주 웹사이트 유입 검색 키워드

| 키워드 | 유입 수 | 전월 대비 |
| --- | ---: | --- |
| 매장 예약 관리 프로그램 | 320회 | 증가 |
| 가게 단골 만드는 법 | 210회 | 크게 증가 |
| 매장 고객관리 앱 | 130회 | 비슷 |
| 네이버 리뷰 관리 방법 | 95회 | 증가 |

### 최근 업계 동향 (팀 채널에 공유된 뉴스 목록)

- 내년도 최저임금 인상 확정, 소상공인 운영비 부담 가중 보도 이어짐
- 배달·예약 앱 수수료 인상에 자영업자 반발, 자체 단골 채널 확보에 관심 증가
- SNS 후기와 리뷰가 동네 가게 방문을 좌우한다는 조사 결과 화제
- 정부, 소상공인 디지털 전환(온라인 마케팅·고객관리) 지원 사업 접수 시작

## 작업 순서

## 최종 결과물 요약

| 단계 | 결과물 | 예상 시간 |
| --- | --- | --- |
| 1단계 | 선택한 KPI와 콘텐츠 기획 방향 | 10~15분 |
| 2단계 | 콘텐츠 기획안 (채널 변형 포함) | 15~20분 |
| 3단계 | 결과 해석과 다음 판단 | 10~15분 |

## 확인 포인트

| 항목 | 내용 |
| --- | --- |
| 데이터 해석 | 키워드 유입의 배경을 동향과 연결해 파악했는가 (1단계) |
| KPI 선택 | 제시된 KPI 중 목표에 맞는 것을 고르고 이유를 설명했는가 (1단계) |
| 기획 방향 | 타깃·콘텐츠·KPI가 이어지는 검증 가능한 기획 방향을 세웠는가 (1단계) |
| 기획 연결 | 기획 방향이 콘텐츠 주제와 구성에 실제로 반영됐는가 (2단계) |
| 채널 이해 | 선택한 채널의 이유가 타당하고 형식·전달 방식을 맞게 바꿨는가 (2단계) |
| 검증 판단 | 본인이 선택한 KPI 기준으로 콘텐츠 성패를 근거 있게 판단했는가 (3단계) |

정답을 맞히는 것보다, 데이터에서 기획 방향을 세우고 결과로 검증해 다음 행동을 정하는 과정을 중심으로 확인합니다.
$materials$,
  jsonb_build_array(
    jsonb_build_object(
      'id', 'content-data-validation-step-1',
      'title', '핵심 KPI를 고르고 콘텐츠 기획 방향을 잡아주세요.',
      'durationMin', 15,
      'difficulty', 2,
      'prompts', jsonb_build_array(jsonb_build_object(
        'id', 'content-data-validation-prompt-1',
        'label', '선택한 KPI와 콘텐츠 기획 방향',
        'body', $prompt1$
팀이 제시한 KPI 후보(콘텐츠 조회수 증가 / 서비스 가입(무료 체험 신청) 전환율 증가 / 상담 신청 증가) 중 하나를 핵심 KPI로 고르고, 검색 키워드와 업계 동향을 함께 보고 콘텐츠 기획 방향을 잡아주세요.

**콘텐츠 기획 방향**은 "누구에게, 어떤 콘텐츠를 만들어, 어떤 결과(KPI)를 노릴지"를 한 문장으로 정리한 것입니다.

다음 내용을 순서대로 포함해주세요.

- 핵심 KPI — 세 후보 중 하나를 고르고 정한 이유
- 주요 타깃 — 누구를 겨냥할지
- 키워드 해석 — 근거가 된 검색 키워드와 동향을, 그 사람들이 왜 검색했는지까지 해석
- 콘텐츠 기획 방향 — "[키워드]로 들어온 [타깃]은 [배경] 때문에 [관심사]가 있다. [어떤 콘텐츠]를 만들면 [핵심 KPI]로 이어질 것이다"
$prompt1$
      ))
    ),
    jsonb_build_object(
      'id', 'content-data-validation-step-2',
      'title', '콘텐츠를 기획하고 채널별 활용안을 제안해주세요.',
      'durationMin', 20,
      'difficulty', 3,
      'prompts', jsonb_build_array(jsonb_build_object(
        'id', 'content-data-validation-prompt-2',
        'label', '콘텐츠 기획안',
        'body', $prompt2$
1단계에서 잡은 콘텐츠 기획 방향을 바탕으로 인스타그램에 게시할 콘텐츠 한 개를 기획하고, 이 콘텐츠를 다른 채널 하나에 다시 활용하는 방안까지 제안해주세요.

변형 채널은 블로그, 유튜브 쇼츠, 이메일 뉴스레터 중 하나를 선택합니다.

다음 내용을 포함해주세요.

- 콘텐츠 제목과 핵심 내용
- 게시물 구성 (슬라이드 순서 등)
- 서비스 소개 페이지(기능·요금 안내, 무료 체험 신청)로 연결하는 문구
- 변형할 채널과 그 채널을 고른 이유 (타깃 도달 관점)
- 변형 채널에서 바꿀 부분
$prompt2$
      ))
    ),
    jsonb_build_object(
      'id', 'content-data-validation-step-3',
      'title', '발행 결과를 해석하고 다음 행동을 판단해주세요.',
      'durationMin', 15,
      'difficulty', 3,
      'prompts', jsonb_build_array(jsonb_build_object(
        'id', 'content-data-validation-prompt-3',
        'label', '결과 해석과 다음 판단',
        'body', $prompt3$
기획한 콘텐츠를 인스타그램에 발행하고 1주가 지났다고 가정합니다. 결과는 아래와 같습니다. (서비스 소개 페이지 = 기능·요금 안내와 무료 체험 신청이 있는 상세 소개 페이지)

| 항목 | 결과 | 참고: 계정 평균 |
| --- | ---: | ---: |
| 조회 수 | 12,400회 | 8,000회 |
| 서비스 소개 페이지 클릭 | 62회 | - |
| 클릭률 | 0.5% | 1.2% |

1단계에서 선택한 핵심 KPI를 기준으로 이 결과를 해석하고, 다음 행동을 판단해주세요. 선택지는 다음과 같습니다.

- 광고를 집행해 더 많은 사람에게 노출한다
- 콘텐츠의 일부를 수정해 다시 발행한다
- 기획 방향이 틀렸다고 보고 새로운 방향으로 다시 기획한다

다음 내용을 포함해주세요.

- 핵심 KPI 기준 성패 판단과 근거
- 선택한 다음 행동과 이유
- 다음 발행에서 확인할 KPI
$prompt3$
      ))
    )
  ),
  'expert', '현직 콘텐츠 마케터', '스타트업', '3~5년차', '콘텐츠 마케터',
  '#ffffff', '#18181b', false
from target_company
where not exists (
  select 1 from public.job_simulations
  where title = '[콘텐츠 마케팅] 유입 데이터 기반 콘텐츠 기획과 검증'
    and simulation_source = 'expert'
);
