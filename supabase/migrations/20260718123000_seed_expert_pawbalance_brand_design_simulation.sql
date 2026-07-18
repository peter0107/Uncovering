-- ============================================================
-- 현직자 제시: PawBalance 브랜드 디자이너 단계형 시뮬레이션
--
-- 선행 조건: 20260718103000_add_expert_simulations.sql
-- 이 파일은 현직자 제시 전용 카드(simulation_source = 'expert')를 만듭니다.
-- Lovable/Supabase SQL Editor에서 선행 파일 다음 순서로 실행하세요.
-- ============================================================

insert into public.companies (name, code, unique_code, role_label, description)
values (
  '현직자 제시 시뮬레이션',
  'EXPERT-SIMULATIONS-2026',
  'EXPERT-SIMULATIONS-2026',
  '현직자 제시',
  ''
)
on conflict (unique_code) do update
set
  code = excluded.code,
  name = excluded.name,
  role_label = excluded.role_label;

insert into public.job_simulations (
  company_id,
  title,
  role_label,
  description,
  job_family,
  domain,
  estimated_minutes,
  simulation_format,
  task_prompt,
  steps,
  simulation_source,
  expert_nickname,
  expert_company_type,
  expert_experience_band,
  expert_job_title,
  card_background_color,
  card_text_color,
  expert_model_answer,
  expert_ai_feedback,
  is_public
)
select
  company.id,
  '반려동물 헬스케어 브랜드의 비주얼 방향 제안',
  '브랜드 디자인',
  '반려동물 헬스케어 스타트업의 브랜드 인상과 랜딩페이지 첫 화면 방향을 제안하는 2단계 브랜드 디자인 시뮬레이션입니다.',
  '브랜드 디자인',
  '디자인',
  25,
  'selection',
  $task$
# 반려동물 헬스케어 브랜드의 비주얼 방향 제안

당신은 반려동물 헬스케어 스타트업 **PawBalance**의 브랜드 디자이너입니다.

PawBalance는 반려견의 나이·체중·생활 습관을 입력하면 맞춤형 영양제와 식단 관리 팁을 추천하는 서비스를 다음 달 출시할 예정입니다. 서비스 기능은 정리되었지만, 브랜드의 시각적 방향은 아직 명확하지 않습니다.

수의학 기반 서비스처럼 전문적으로 보여야 한다는 의견과 보호자가 편하게 느낄 수 있도록 따뜻하고 친근해야 한다는 의견이 함께 나오고 있습니다. 제공 자료를 바탕으로 PawBalance가 어떤 인상으로 보여야 하는지 정리하고, 랜딩페이지와 광고 이미지에 활용할 기본 비주얼 방향을 제안해주세요.

최종적으로는 브랜드 문제와 방향, 그리고 초기 비주얼 방향 및 랜딩페이지 첫 화면 적용안을 제안합니다.
$task$,
  jsonb_build_array(
    jsonb_build_object(
      'id', 'pawbalance-brand-step-1',
      'title', '1단계. 브랜드 문제와 방향 정리',
      'durationMin', 10,
      'difficulty', 2,
      'tags', jsonb_build_array('브랜드 진단', '사용자 이해', '디자인 방향'),
      'situation', '서비스 출시를 앞두고 브랜드의 시각 방향을 정해야 합니다. 대표는 전문성을, 마케팅 담당자는 친근함을 강조합니다. 두 요구를 함께 만족할 출발점을 정리하세요.',
      'materials', $step_1_materials$
## 1. 브랜드 개요

**브랜드명**  
PawBalance

**서비스 설명**  
반려견의 건강 정보와 생활 습관을 바탕으로 맞춤형 영양 관리 방법을 제안하는 반려동물 헬스케어 서비스

**핵심 메시지**  
우리 강아지에게 맞는 건강 관리를 더 쉽게

**주요 타깃**  
반려견 건강에 관심은 많지만 어떤 영양제나 식단이 맞는지 잘 모르는 20~40대 보호자

**브랜드 목표**

- 건강 관리 서비스라는 신뢰감 전달
- 보호자가 부담 없이 시작할 수 있는 친근한 인상 형성
- 랜딩페이지와 광고 이미지의 분위기 통일

## 2. 현재 브랜드 문제

- 제작물마다 컬러와 분위기가 다릅니다.
- 너무 병원처럼 보이면 차갑고 어려워 보일 수 있습니다.
- 너무 귀엽게 보이면 전문성과 신뢰도가 약해질 수 있습니다.
- 건강 관리 서비스인지 일반 반려동물 쇼핑몰인지 명확하게 보이지 않습니다.

## 3. 사용자 반응

- “병원 느낌이 너무 강하면 부담스러워요.”
- “너무 장난감처럼 보이면 건강 제품으로 믿기 어려울 것 같아요.”
- “영양제 추천 서비스인지 쇼핑몰인지 처음에는 잘 모르겠어요.”
- “깔끔하면 꾸준히 관리해주는 서비스처럼 느껴질 것 같아요.”
- “우리 강아지에게 왜 필요한지 바로 알 수 있었으면 좋겠어요.”

## 4. 내부 요청사항

**대표**  
“전문성과 따뜻함이 같이 느껴졌으면 합니다.”

**마케팅 담당자**  
“보호자가 우리 강아지를 위한 서비스라고 느꼈으면 합니다.”

**제품 담당자**  
“맞춤 추천과 영양 관리라는 특징이 보여야 합니다.”

**개발 담당자**  
“이번 달에 랜딩페이지와 광고 이미지를 먼저 제작할 예정입니다.”
$step_1_materials$,
      'hint', '초심자 힌트: 사용자 반응에서 반복되는 단어를 먼저 찾으세요. 그다음 전문성·친근함 중 하나를 버리기보다, 두 인상이 각각 어떤 화면 요소에서 드러날지 생각해보면 방향을 잡기 쉽습니다.',
      'prompts', jsonb_build_array(
        jsonb_build_object(
          'id', 'pawbalance-brand-1-1',
          'label', '브랜드 문제와 방향 정리',
          'body', $prompt_1_1$
제공된 자료를 바탕으로 PawBalance가 해결해야 할 브랜드 문제와 디자인 방향을 정리해주세요.

| 항목 | 답변 |
| --- | --- |
| 현재 브랜드가 오해받을 수 있는 부분 |  |
| 브랜드 디자인이 해결해야 할 가장 중요한 문제 |  |
| 사용자에게 전달해야 할 인상 키워드 2~3개 |  |
| 피해야 할 인상 1~2개 |  |

인상 키워드는 `신뢰할 수 있는`, `따뜻한`, `건강한`, `깔끔한`, `편안한`, `맞춤형`, `전문적인`, `활기찬` 중에서 고르거나 새롭게 작성할 수 있습니다.

선택한 각 키워드가 필요한 이유를 한 문장씩 덧붙이세요. 내부 요청 중 함께 충족하기 어렵다고 느끼는 지점이 있다면 그 판단도 설명해주세요.
$prompt_1_1$
        )
      )
    ),
    jsonb_build_object(
      'id', 'pawbalance-brand-step-2',
      'title', '2단계. 초기 비주얼 방향과 랜딩페이지 첫 화면 적용',
      'durationMin', 15,
      'difficulty', 3,
      'tags', jsonb_build_array('비주얼 방향', '랜딩페이지', '정보 위계'),
      'situation', '방향 정리 후 랜딩페이지와 광고 제작을 시작하려 합니다. 사진·그래픽·문구가 달라도 같은 브랜드로 보일 수 있도록 기본 비주얼 규칙과 첫 화면 적용안을 제안하세요.',
      'materials', $step_2_materials$
## 제작 범위와 목적

- 이번 달에 랜딩페이지와 광고 이미지를 먼저 제작합니다.
- 첫 화면에서는 서비스가 영양제 추천 쇼핑몰이 아니라, 반려견 정보를 바탕으로 건강 관리를 돕는 서비스임이 바로 드러나야 합니다.
- 상세한 화면 디자인보다, 이후 제작물이 같은 방향으로 확장될 수 있는 기본 원칙이 필요합니다.

## 고려할 균형

| 지나치게 강조했을 때 | 생길 수 있는 문제 |
| --- | --- |
| 의료·전문성 | 병원처럼 차갑고 시작하기 어렵게 느껴질 수 있음 |
| 귀여움·친근함 | 장난감이나 일반 반려동물 쇼핑몰처럼 보일 수 있음 |
| 정보량 | 맞춤 추천의 근거가 묻혀 서비스가 무엇인지 알기 어려울 수 있음 |

실제 화면을 디자인할 필요는 없습니다. 글 또는 간단한 손그림 레이아웃 스케치로 제안해도 됩니다.
$step_2_materials$,
      'hint', '초심자 힌트: 1단계의 인상 키워드를 그대로 반복하기보다, 컬러·폰트·이미지·정보 배치에 각각 어떻게 번역할지 연결해보세요. 첫 화면은 사용자가 서비스의 정체와 다음 행동을 빠르게 이해하는 데 집중합니다.',
      'prompts', jsonb_build_array(
        jsonb_build_object(
          'id', 'pawbalance-brand-2-1',
          'label', '초기 비주얼 방향 제안',
          'body', $prompt_2_1$
1단계에서 정리한 방향을 바탕으로 PawBalance의 초기 비주얼 방향을 제안해주세요.

| 항목 | 제안 내용 |
| --- | --- |
| 전체 분위기 | 브랜드가 전체적으로 어떤 느낌이어야 하는지 |
| 컬러 방향 | 사용할 컬러 계열과 피해야 할 컬러 |
| 폰트 방향 | 부드러운 폰트, 단정한 폰트 등 기본적인 방향 |
| 그래픽 요소 | 아이콘, 도형, 일러스트 등의 사용 방향 |
| 이미지 톤 | 어떤 반려견 사진을 사용하면 좋은지 |
| 피해야 할 표현 | 병원처럼 보이거나 지나치게 귀여워 보이는 표현 |

각 항목은 1~2문장으로 작성하고, 특히 전문성과 따뜻함을 함께 보이게 하는 선택을 구체적으로 설명해주세요.
$prompt_2_1$
        ),
        jsonb_build_object(
          'id', 'pawbalance-brand-2-2',
          'label', '랜딩페이지 첫 화면 적용안',
          'body', $prompt_2_2$
제안한 비주얼 방향을 랜딩페이지 첫 화면에 어떻게 적용할지 간단히 설명해주세요.

| 항목 | 답변 |
| --- | --- |
| 첫 화면에서 가장 먼저 보여줄 내용 |  |
| 사용할 대표 이미지 |  |
| 강조할 문구 또는 정보 |  |
| 사용자가 느껴야 할 인상 |  |

필요하다면 제목·설명·버튼·이미지의 대략적인 배치도 함께 적으세요. 마지막으로 광고 이미지에도 유지해야 할 공통 규칙 2가지를 제안해주세요.
$prompt_2_2$
        )
      )
    )
  ),
  'expert',
  '현직 브랜드 디자이너',
  '스타트업',
  '6~10년차',
  '브랜드 디자이너',
  '#ffffff',
  '#18181b',
  null,
  null,
  false
from public.companies company
where company.code = 'EXPERT-SIMULATIONS-2026'
  and not exists (
    select 1
    from public.job_simulations existing
    where existing.company_id = company.id
      and existing.simulation_source = 'expert'
      and existing.title = '반려동물 헬스케어 브랜드의 비주얼 방향 제안'
      and existing.deleted_at is null
  );
