-- ============================================================
-- 샘플 기업 + 직무 시뮬레이션 시드 데이터
-- 기업 사이트(uncoveringforcompany.com)가 아직 없어 임시로 SQL로 투입.
-- job_family 값은 온보딩 관심 직무 6종과 정확히 일치시켜야 추천이 매칭됨.
-- ============================================================

insert into companies (name, unique_code) values
  ('당근마켓', 'DAANGN-DEMO-2026'),
  ('무신사', 'MUSINSA-DEMO-2026'),
  ('토스', 'TOSS-DEMO-2026')
on conflict (unique_code) do nothing;

insert into job_simulations (company_id, title, description, job_family, domain, estimated_minutes, task_prompt)
select c.id, v.title, v.description, v.job_family, v.domain, v.estimated_minutes, v.task_prompt
from (values
  ('당근마켓', '동네 커뮤니티 신규 기능 기획',
   '동네 이웃 간 소모임을 활성화할 신규 기능을 기획해보세요.',
   '서비스기획·PM', '커머스·커뮤니티', 30,
   '동네 이웃들이 소모임(러닝, 스터디 등)을 쉽게 만들고 참여할 수 있는 신규 기능을 기획해주세요. 타겟 유저, 핵심 플로우, 성공 지표(KPI)를 포함해 A4 1장 분량으로 작성해주세요.'),
  ('당근마켓', '중고거래 이상거래 탐지 분석',
   '거래 데이터를 바탕으로 이상 거래 패턴을 찾아보세요.',
   '데이터', '커머스·커뮤니티', 35,
   '최근 3개월 거래 로그(가상 데이터)를 바탕으로 사기 의심 거래의 공통 패턴을 3가지 이상 도출하고, 이를 자동으로 걸러낼 수 있는 규칙이나 지표를 제안해주세요.'),
  ('무신사', '상품 상세페이지 UI 개선',
   '구매 전환율을 높이기 위한 상세페이지 개선안을 제안해보세요.',
   '디자인', '커머스·패션', 30,
   '현재 상품 상세페이지의 문제점을 3가지 이상 짚고, 구매 전환율을 높일 수 있는 개선된 레이아웃/UX 아이디어를 스케치나 설명으로 제안해주세요.'),
  ('무신사', '신규 브랜드 입점 프로모션 기획',
   '신규 입점 브랜드를 위한 런칭 프로모션을 기획해보세요.',
   '마케팅·그로스', '커머스·패션', 30,
   '신규 입점한 스트릿 브랜드의 첫 2주 노출을 극대화할 프로모션 기획안을 작성해주세요. 채널별 액션, 예산 배분, 기대 효과를 포함해주세요.'),
  ('토스', '결제 알림 기능 설계',
   '실시간 결제 알림을 안정적으로 보내는 백엔드 구조를 설계해보세요.',
   '개발', '핀테크', 40,
   '초당 수천 건의 결제가 발생하는 상황에서도 지연 없이 사용자에게 푸시 알림을 보내는 백엔드 아키텍처를 설계하고, 장애 발생 시 대응 방안을 함께 제시해주세요.'),
  ('토스', '고객 문의 응대 프로세스 개선',
   '반복되는 고객 문의를 줄이는 CS 프로세스를 제안해보세요.',
   '운영·CS', '핀테크', 25,
   '가장 많이 들어오는 문의 유형 상위 3개를 가정하고, 각각에 대해 문의 자체를 줄이는 사전 대응책과 응대 매뉴얼 초안을 작성해주세요.')
) as v(company_name, title, description, job_family, domain, estimated_minutes, task_prompt)
join companies c on c.name = v.company_name
where not exists (
  select 1 from job_simulations js where js.title = v.title and js.company_id = c.id
);
