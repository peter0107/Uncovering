-- 기업 페이지 AI 평가 프롬프트를 기능별로 분리합니다.

create table if not exists public.ai_prompt_settings (
  key text primary key,
  prompt text not null,
  updated_at timestamptz not null default now()
);

alter table public.ai_prompt_settings enable row level security;

grant all on public.ai_prompt_settings to service_role;

insert into public.ai_prompt_settings (key, prompt)
values
(
  'company_simulation_result_review',
  $prompt$
지원자의 직무 시뮬레이션 제출 답변을 평가하세요.

평가 기준:
- 문제 정의와 상황 이해가 명확한가
- 답변이 직무 맥락과 제출 과제에 맞게 구체적인가
- 근거, 실행 방향, 우선순위가 설득력 있게 제시되었는가
- 과장된 추론 없이 제출된 답변 안에서 강점과 확인할 점을 제시하세요.

반환 대상 JSON 필드:
"simulation": { "score": 0, "summary": "", "strengths": [""], "concerns": [""] }
$prompt$
),
(
  'company_ai_utilization_review',
  $prompt$
지원자가 시뮬레이션 수행 중 AI 어시스트를 어떻게 활용했는지 평가하세요.

평가 기준:
- 질문이 구체적이고 업무 목표와 연결되어 있는가
- AI 답변을 그대로 수용하지 않고 검증하거나 개선했는가
- 반복 질문을 통해 결과물을 발전시켰는가
- AI 어시스트 대화 로그가 없다면 활용 기록이 없다고 명시하고 score는 0점으로 작성하세요.

반환 대상 JSON 필드:
"aiUtilization": { "score": 0, "summary": "", "strengths": [""], "improvements": [""] }
$prompt$
),
(
  'company_interview_question_recommendation',
  $prompt$
지원자의 시뮬레이션 답변과 AI 활용 기록을 바탕으로 면접 질문을 추천하세요.

작성 기준:
- 답변의 근거, 의사결정 과정, 실제 업무 적용 가능성을 확인하는 질문을 포함하세요.
- AI 활용 기록이 있다면 질문 의도와 검증 방식을 확인하는 질문을 포함하세요.
- 채용 합격/불합격을 유도하는 질문이 아니라, 추가 확인이 필요한 검토 질문으로 작성하세요.
- 질문은 4~6개를 추천하세요.

반환 대상 JSON 필드:
"interviewQuestions": [
  { "category": "시뮬레이션 결과물", "question": "", "intent": "" },
  { "category": "AI 활용", "question": "", "intent": "" }
]
$prompt$
)
on conflict (key) do nothing;
