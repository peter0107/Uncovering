# JD 시뮬레이션 생성기

관리자 페이지 `/admin/simulation-generator`에서 채용공고(JD)를 붙여넣으면 스텝형 직무
시뮬레이션 초안을 만들어 주는 기능이다.

## 전체 흐름

```
[관리자 입력] → POST /api/generate-simulation (스트리밍 응답 유지)
    → 웹 검색 3회(병렬) → Claude 초안 생성 1회
    → data 프레임 1개 수신 → 화면에 초안 표시
    → [검수 후 저장] → job_simulations에 비공개로 insert
```

생성 중간에 DB에 상태를 적었다 읽는 단계는 없다. 요청 한 번으로 끝나고 결과는 화면
state에만 담긴다.

## 왜 스트리밍인가

Cloudflare는 응답 첫 바이트가 **100초** 안에 나오지 않으면 요청을 끊고 `524` 텍스트
페이지를 반환한다. 생성은 보통 60~90초 걸리므로 일반 JSON 응답으로는 자주 이 벽에
부딪혔다. 증상은 두 가지였다.

- `Unexpected token 'e', "error code: 524 " is not valid JSON` — 브라우저가 524 HTML을
  JSON으로 파싱하다 실패
- `AI 생성 응답 시간이 초과됐어요` — 524를 피하려 걸어둔 자체 타임아웃(60초)이 정상
  생성을 먼저 끊어버림

첫 바이트가 나가면 연결이 확립되어 524가 발생하지 않는다. 그래서 핸들러는 **생성을
시작하기 전에** `: open`을 먼저 내보내고, 이후 10초마다 `: ping` 하트비트를 흘린다.

> 과거에 이 문제를 `simulation_generation_jobs` 테이블 + Worker Cron(1분 주기) 큐로
> 우회한 적이 있다. 524는 막았지만 큐 대기가 최대 60초 붙고 폴링·중복 방지·stuck 복구
> 코드가 따라붙었다. 스트리밍으로 원인을 없앤 뒤 전부 제거했다. 테이블과
> `claim_simulation_generation_job()` RPC는 DB에 남아 있으나 참조하는 코드는 없다.

## 서버

`src/server.ts`가 Worker 진입점이며, SSR 핸들러보다 먼저 이 경로를 가로챈다.

| 경로 | 처리 |
| --- | --- |
| `POST /api/generate-simulation` | `handleGenerateSimulationRequest()` — 스트리밍 |
| 그 외 | 기존 TanStack SSR 핸들러 |

### `handleGenerateSimulationRequest`
`src/lib/simulation-generator.functions.ts`

1. `: open` 즉시 전송 → 연결 확립 (**이 줄이 524를 막는다. 생성보다 먼저 실행되어야 한다**)
2. 10초 간격 하트비트 시작
3. `Authorization: Bearer` 헤더에서 토큰을 읽어 `assertAdminToken()` — 관리자 이메일
   화이트리스트(`DEFAULT_ADMIN_EMAILS` + `ADMIN_EMAILS` env) 검증
4. `generateInputSchema`로 입력 검증 → `generateSimulationDraftFromInput()`
5. `data: {"ok":true,"draft":{...}}` 한 프레임 전송 후 종료

응답 형식은 SSE다. `:`로 시작하는 줄은 주석(하트비트)이라 무시하면 되고, 의미 있는
프레임은 `data: `로 시작하는 단 하나뿐이다.

```
content-type: text/event-stream; charset=utf-8
cache-control: no-cache, no-transform
```

**첫 바이트가 나간 뒤에는 HTTP 상태 코드를 바꿀 수 없다.** 그래서 오류도 상태 코드가
아니라 본문으로 내려보낸다.

```jsonc
{ "ok": true,  "draft": { /* GeneratedSimulationDraft */ } }
{ "ok": false, "message": "관리자 권한이 없습니다." }
```

### `generateSimulationDraftFromInput`

| 단계 | 내용 | 타임아웃 |
| --- | --- | --- |
| 프롬프트 로드 | `ai_prompt_settings`의 `simulation_generator_draft` 행. 없으면 `COMPANY_AI_PROMPT_DEFAULTS` | — |
| 웹 검색 | 3개 초점(①사업·제품 ②고객·최근이슈 ③직무 맥락)을 **병렬** 호출. `web_search_20250305`, `max_uses: 1`, `pause_turn`은 최대 2회까지 이어받음 | 60초 |
| 초안 생성 | `record_simulation_draft` 툴을 `tool_choice`로 강제해 구조화 출력 확보. `max_tokens: 12000` | 180초 |
| 후처리 | `toolOutputSchema`로 zod 재검증, 스텝마다 ID 부여, `question`을 `prompts[0]`으로 포장 | — |

검색은 보조 정보라 실패해도 `null`을 반환하고 JD만으로 생성을 계속한다. 검색 요약은
7,000자로 잘라 생성 프롬프트 뒤에 덧붙인다.

`webResearchFacts`는 `fact`와 `source`가 **둘 다 있는 항목만** 통과시켜 환각을 걸러낸다.

## 클라이언트

`src/routes/admin.simulation-generator.tsx`

- `getAccessToken()` — 만료 120초 전이면 세션을 먼저 갱신한다. 생성이 길어 도중에 토큰이
  만료될 수 있기 때문이다.
- `requestGeneration()` — `response.body.getReader()`로 읽으며 `\n\n` 경계로 프레임을
  나눈다. 초안 JSON이 여러 청크에 걸쳐 도착할 수 있으므로 버퍼링이 필요하다.
  (`JSON.stringify` 결과에는 raw 개행이 없어 `\n\n`를 구분자로 써도 안전하다.)
- 생성이 1~2분 걸리므로 경과 초를 표시한다. 페이지를 벗어나면 요청이 취소된다.

## 저장

초안은 자동 저장되지 않는다. 관리자가 검수 후 **비공개로 저장**을 눌러야
`createCompanySimulation`이 `job_simulations`에 `is_public: false`로 insert한다.
기업을 고르지 않으면 `resolveGeneratedCompany`가 이름으로 조회하고, 없으면
`AUTO-XXXXXXXXXXXX` 코드로 새로 만든다.

## 설정

| 환경변수 | 위치 | 용도 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Cloudflare | 필수 |
| `ANTHROPIC_MODEL` | Cloudflare | 선택, 기본 `claude-sonnet-4-5` |
| `ADMIN_EMAILS` | Cloudflare | 선택, 쉼표 구분 |

설계 지침(프롬프트)은 `/admin/ai-prompts`에서 수정한다. `{{기업명}}`, `{{직무명}}`,
`{{도메인}}`이 실제 값으로 치환되고 JD 원문이 뒤에 자동으로 붙는다.

## 손댈 때 주의

- **`: open`을 생성 뒤로 옮기면 524가 돌아온다.** 순서가 핵심이다.
- 자체 타임아웃을 다시 줄이지 말 것. 짧은 타임아웃은 정상 생성을 중간에 끊는다.
- 오류를 `throw`로 처리하지 말 것. 첫 바이트 이후에는 상태 코드가 의미 없으므로 반드시
  `{ ok: false, message }` 프레임으로 보내야 화면에 뜬다.
- 이 경로는 SSR 핸들러를 거치지 않으므로 TanStack 서버 함수 미들웨어(`attachSupabaseAuth`
  등)가 적용되지 않는다. 인증은 핸들러가 직접 처리한다.

## 개선 여지

웹 검색 3회와 생성 1회를 **한 요청으로 합칠 수 있다.** `web_search_20260209`(동적 필터링
내장)와 `record_simulation_draft`를 같은 `tools` 배열에 넣고 `tool_choice: auto`로 두면
모델이 검색 후 바로 초안까지 만든다. HTTP 호출 4회 → 1회, 검색 요약 절단으로 인한 정보
손실 제거, 실패 지점 4곳 → 1곳. 다만 `web_search_20260209`는 Sonnet 4.6 / Opus 4.6 이상이
필요하고 프롬프트 재튜닝이 따른다.
