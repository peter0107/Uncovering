import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";
import { COMPANY_AI_PROMPT_DEFAULTS, type CompanyAiPromptKey } from "@/lib/ai-prompt.defaults";

const DEFAULT_ADMIN_EMAILS = ["u.ncovering2026@gmail.com"];
import type { AdminSimulationStep } from "@/lib/simulations.functions";

// ============================================================
// 권한 검증 (이 파일 전용 — simulations.functions.ts와 동일 패턴)
// ============================================================
function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Backend is not configured");
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken(): string {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) throw new Error("로그인이 필요합니다.");
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("로그인이 필요합니다.");
  return token;
}

async function assertAdmin() {
  const token = getBearerToken();
  const configuredEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const adminEmails = new Set([...DEFAULT_ADMIN_EMAILS, ...configuredEmails]);

  const supabase = createPublicServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !adminEmails.has(email)) {
    throw new Error("관리자 권한이 없습니다.");
  }
}

// ============================================================
// 입력 / 출력 타입
// ============================================================
const generateInputSchema = z.object({
  companyName: z.string().trim().min(1).max(100),
  roleName: z.string().trim().min(1).max(100),
  domain: z.enum(DOMAIN_CATEGORIES),
  sources: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(40),
        jd: z.string().trim().min(1).max(20000),
      }),
    )
    .min(1)
    .max(8),
  note: z.string().trim().max(2000).optional().default(""),
});

export type GenerateSimulationInput = z.infer<typeof generateInputSchema>;

export type GeneratedCriterion = {
  title: string;
  sources: Array<{ platform: string; quote: string }>;
  reflectedIn: string;
};

export type GeneratedUnreflected = {
  requirement: string;
  reason: string;
};

export type GeneratedWebResearchFact = {
  fact: string;
  source: string;
};

export type GeneratedSimulationDraft = {
  companyName: string;
  roleName: string;
  domain: string;
  simulation: {
    title: string;
    roleLabel: string;
    description: string;
    estimatedMinutes: number | null;
    steps: AdminSimulationStep[];
  };
  rationale: {
    webResearchFacts: GeneratedWebResearchFact[];
    criteria: GeneratedCriterion[];
    unreflected: GeneratedUnreflected[];
  };
};

// 도구가 반환한 원본 형태 검증용 스키마
const toolStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  durationMin: z.number().int().min(1).max(120).nullable().optional(),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  situation: z.string().max(8000).optional().default(""),
  materials: z.string().max(12000).optional().default(""),
  question: z.string().trim().min(1).max(8000),
  hint: z.string().max(4000).optional().default(""),
  completionMessage: z.string().max(2000).optional().default(""),
});

const toolOutputSchema = z.object({
  simulation: z.object({
    title: z.string().trim().min(1).max(200),
    roleLabel: z.string().trim().min(1).max(120),
    description: z.string().max(1000).optional().default(""),
    estimatedMinutes: z.number().int().min(5).max(240).nullable().optional().default(null),
    steps: z.array(toolStepSchema).min(2).max(6),
  }),
  rationale: z.object({
    webResearchFacts: z
      .array(
        z.object({
          fact: z.string().max(500).optional().default(""),
          source: z.string().max(200).optional().default(""),
        }),
      )
      .max(4)
      .optional()
      .default([]),
    criteria: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(300),
          sources: z
            .array(
              z.object({
                platform: z.string().max(60).optional().default(""),
                quote: z.string().max(1200).optional().default(""),
              }),
            )
            .max(10)
            .optional()
            .default([]),
          reflectedIn: z.string().max(600).optional().default(""),
        }),
      )
      .max(15)
      .optional()
      .default([]),
    unreflected: z
      .array(
        z.object({
          requirement: z.string().max(400).optional().default(""),
          reason: z.string().max(600).optional().default(""),
        }),
      )
      .max(15)
      .optional()
      .default([]),
  }),
});

// ============================================================
// Claude tool 정의 (구조화 출력 강제)
// ============================================================
const GENERATE_TOOL_NAME = "record_simulation_draft";
const WEB_SEARCH_TOOL = {
  // Anthropic 서버 도구라 별도 실행이나 tool_result 전달이 필요하지 않습니다.
  type: "web_search_20260209",
  name: "web_search",
  // 기업 확인에 필요한 검색만 허용해 비용과 응답 시간을 제한합니다.
  max_uses: 1,
} as const;
const MAX_WEB_SEARCH_CONTINUATIONS = 2;
const ANTHROPIC_REQUEST_TIMEOUT_MS = 120_000;

const GENERATE_TOOL = {
  name: GENERATE_TOOL_NAME,
  description:
    "채용공고(JD)에서 평가 기준을 추출해 스텝형 직무 시뮬레이션 초안과 그 생성 근거를 정해진 형식으로 기록합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["simulation", "rationale"],
    properties: {
      simulation: {
        type: "object",
        additionalProperties: false,
        required: ["title", "roleLabel", "steps"],
        properties: {
          title: {
            type: "string",
            description: "시뮬레이션 제목. 반드시 '{기업명} {직무명} 지원 대비 시뮬레이션' 형태.",
          },
          roleLabel: {
            type: "string",
            description:
              "직무명 (예: 그로스마케터). 입력 직무명이 없으면 JD에서 실제 채용 직무명을 추출해 기록.",
          },
          description: { type: "string", description: "카드에 보일 한 줄 설명 (해요체)" },
          estimatedMinutes: { type: "integer", description: "전체 예상 소요 시간(분)" },
          steps: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "question"],
              properties: {
                title: { type: "string", description: "단계 제목 (예: 지표 현황 진단)" },
                durationMin: { type: "integer", description: "이 단계 예상 소요(분)" },
                difficulty: { type: "integer", description: "난이도 1~5 (초심자 기준 낮게)" },
                situation: {
                  type: "string",
                  description: "상황 안내 (마크다운). 이 단계에서 처한 업무 상황을 구체적으로.",
                },
                materials: {
                  type: "string",
                  description:
                    "제공 자료 (마크다운, 표 가능). JD에 근거해 만든 현실적인 가상 데이터/문서.",
                },
                question: {
                  type: "string",
                  description: "이 단계에서 답해야 할 질문 1개 (마크다운).",
                },
                hint: { type: "string", description: "초심자용 힌트 (마크다운)" },
                completionMessage: { type: "string", description: "단계 완료 메시지 (선택)" },
              },
            },
          },
        },
      },
      rationale: {
        type: "object",
        additionalProperties: false,
        required: ["criteria", "unreflected"],
        properties: {
          webResearchFacts: {
            type: "array",
            maxItems: 4,
            description:
              "웹 검색으로 확인된 기업·브랜드 사실 요약. 검색 결과가 없거나 출처를 특정할 수 없으면 빈 배열. 추정 금지.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["fact", "source"],
              properties: {
                fact: { type: "string", description: "검색으로 확인된 사실 한 문장" },
                source: { type: "string", description: "확인에 사용한 출처명 또는 도메인" },
              },
            },
          },
          criteria: {
            type: "array",
            maxItems: 15,
            description: "JD에서 추출한 평가 기준과 그 근거",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "sources", "reflectedIn"],
              properties: {
                title: { type: "string", description: "평가 기준 이름" },
                sources: {
                  type: "array",
                  maxItems: 10,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["platform", "quote"],
                    properties: {
                      platform: { type: "string", description: "JD 출처 플랫폼명" },
                      quote: { type: "string", description: "근거가 된 JD 문구 인용" },
                    },
                  },
                },
                reflectedIn: {
                  type: "string",
                  description: "이 기준이 어느 스텝에 어떻게 반영됐는지",
                },
              },
            },
          },
          unreflected: {
            type: "array",
            maxItems: 15,
            description: "시뮬레이션에 반영하지 못한 JD 요건과 그 이유",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["requirement", "reason"],
              properties: {
                requirement: { type: "string", description: "반영하지 못한 요건" },
                reason: { type: "string", description: "반영하지 못한 이유 (예: 도구 실습 필요)" },
              },
            },
          },
        },
      },
    },
  },
} as const;

function getToolInput(payload: Record<string, unknown>): unknown {
  const content = Array.isArray(payload.content) ? payload.content : [];
  const toolUse = content.find(
    (part) =>
      typeof part === "object" &&
      part !== null &&
      (part as { type?: unknown }).type === "tool_use" &&
      (part as { name?: unknown }).name === GENERATE_TOOL_NAME,
  ) as { input?: unknown } | undefined;

  if (!toolUse?.input || typeof toolUse.input !== "object" || Array.isArray(toolUse.input)) {
    throw new Error("AI 생성 결과 형식이 올바르지 않습니다. 다시 시도해주세요.");
  }
  return toolUse.input;
}

// ============================================================
// 프롬프트
// ============================================================
const GENERATOR_PROMPT_KEY: CompanyAiPromptKey = "simulation_generator_draft";

// 설계 지침은 /admin/ai-prompts에서 수정 가능. {{기업명}}/{{직무명}}/{{도메인}} 치환 후
// 대상 정보·JD 원문·도구 호출 지시를 코드가 뒤에 붙인다.
function buildPrompt(input: GenerateSimulationInput, instruction: string): string {
  const sourcesBlock = input.sources
    .map((s, i) => `[출처 ${i + 1} · ${s.platform}]\n${s.jd}`)
    .join("\n\n");

  const filledInstruction = instruction
    .replaceAll("{{기업명}}", input.companyName)
    .replaceAll("{{직무명}}", input.roleName)
    .replaceAll("{{도메인}}", input.domain);

  return `${filledInstruction}

## 기업·브랜드 사실 사용 원칙
- 기업·브랜드에 관한 내용은 웹 검색 결과 또는 아래 채용공고 원문에서 확인된 사실만 사용하세요.
- 모회사, 자회사, 인수 기업의 사업·제품·고객·조직을 서로 혼동하지 마세요.
- 확인되지 않은 사업, 제품, 타깃 고객, 조직 구조, 최근 이슈는 작성하지 마세요.
- 검색 결과가 부족하거나 기업을 특정할 수 없으면 기업 정보를 추정하지 말고, 아래 직무와 채용공고 정보 중심의 일반적인 시뮬레이션을 만드세요.
- 웹 검색을 사용한 경우, record_simulation_draft의 rationale.webResearchFacts에 생성에 활용한 확인 사실을 최대 4개까지 짧게 기록하세요. 출처명 또는 도메인을 함께 쓰고, 검색 결과 또는 출처가 불명확하면 빈 배열로 두세요.

## 대상
- 기업명: ${input.companyName}
- 직무명: ${input.roleName}
- 도메인: ${input.domain}
${input.note ? `- 참고사항: ${input.note}` : ""}

## 채용공고 원문 (평가 기준 추출용)
${sourcesBlock}

반드시 record_simulation_draft 도구를 한 번 호출해 simulation과 rationale을 모두 채워 기록하세요.`;
}

function buildWebResearchPrompt(input: GenerateSimulationInput): string {
  return `다음 기업 또는 브랜드와 직무에 맞는 지원 대비 시뮬레이션을 만들기 전에 웹 검색을 수행하세요.

대상:
- 기업·브랜드명: ${input.companyName}
- 직무명: ${input.roleName}

검색 원칙:
- 기업·브랜드의 실제 사업, 주요 서비스·제품, 고객, 최근 공개 이슈를 확인하세요.
- 모회사, 자회사, 인수 기업을 반드시 구분하고, 동일 기업인지 확실하지 않은 검색 결과는 사용하지 마세요.
- 확인된 사실과 출처만 이후 생성에 사용할 수 있도록 검색 결과를 정리하세요.
- 검색 결과가 부족하거나 기업을 특정할 수 없으면, 사실을 추정하거나 보완하지 마세요.
- 지금은 시뮬레이션을 생성하지 말고 web_search 도구로 확인 가능한 사실을 조사하세요.`;
}

type AnthropicContentBlock = Record<string, unknown>;
type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};
type AnthropicPayload = Record<string, unknown> & {
  content?: unknown;
  stop_reason?: unknown;
};

function getAnthropicErrorMessage(payload: Record<string, unknown>): string {
  return typeof payload.error === "object" &&
    payload.error !== null &&
    typeof (payload.error as { message?: unknown }).message === "string"
    ? (payload.error as { message: string }).message
    : "Anthropic API 요청에 실패했습니다.";
}

function getContentBlocks(payload: AnthropicPayload): AnthropicContentBlock[] {
  if (!Array.isArray(payload.content)) {
    throw new Error("AI 응답에 콘텐츠가 없습니다.");
  }

  return payload.content.filter(
    (part): part is AnthropicContentBlock =>
      typeof part === "object" && part !== null && !Array.isArray(part),
  );
}

async function requestAnthropic(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ response: Response; payload: AnthropicPayload }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    // 웹 검색은 서버 도구 실행과 pause_turn 재개가 있어 일반 생성보다 오래 걸릴 수 있습니다.
    signal: AbortSignal.timeout(ANTHROPIC_REQUEST_TIMEOUT_MS),
  });
  const payload = (await response.json()) as AnthropicPayload;
  return { response, payload };
}

async function collectWebResearch(
  apiKey: string,
  model: string,
  input: GenerateSimulationInput,
): Promise<AnthropicMessage[] | null> {
  const messages: AnthropicMessage[] = [{ role: "user", content: buildWebResearchPrompt(input) }];

  try {
    let result = await requestAnthropic(apiKey, {
      model,
      max_tokens: 3_000,
      tools: [WEB_SEARCH_TOOL],
      tool_choice: { type: "tool", name: "web_search" },
      messages,
    });

    for (let attempt = 0; attempt <= MAX_WEB_SEARCH_CONTINUATIONS; attempt += 1) {
      if (!result.response.ok) {
        console.warn("Company web research failed:", getAnthropicErrorMessage(result.payload));
        return null;
      }

      const content = getContentBlocks(result.payload);
      messages.push({ role: "assistant", content });

      if (result.payload.stop_reason !== "pause_turn") {
        return result.payload.stop_reason === "max_tokens" ? null : messages;
      }

      if (attempt === MAX_WEB_SEARCH_CONTINUATIONS) {
        console.warn("Company web research paused too many times.");
        return null;
      }

      result = await requestAnthropic(apiKey, {
        model,
        max_tokens: 3_000,
        tools: [WEB_SEARCH_TOOL],
        messages,
      });
    }
  } catch (error) {
    // 검색은 보조 정보입니다. 장애가 있어도 JD 기반 초안 생성은 계속합니다.
    console.warn("Company web research unavailable:", error);
  }

  return null;
}

// ============================================================
// 서버 함수
// ============================================================
export const generateSimulationDraft = createServerFn({ method: "POST" })
  .inputValidator(generateInputSchema)
  .handler(async ({ data }): Promise<GeneratedSimulationDraft> => {
    await assertAdmin();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수를 Lovable에 설정해주세요.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: savedPrompt, error: promptError } = await supabaseAdmin
      .from("ai_prompt_settings")
      .select("prompt")
      .eq("key", GENERATOR_PROMPT_KEY)
      .maybeSingle();
    if (promptError) {
      console.error("Failed to load generator prompt setting:", promptError);
    }
    const instruction =
      savedPrompt?.prompt?.trim() || COMPANY_AI_PROMPT_DEFAULTS[GENERATOR_PROMPT_KEY].prompt;
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    const researchMessages = await collectWebResearch(apiKey, model, data);
    const generationMessages: AnthropicMessage[] = researchMessages
      ? [
          ...researchMessages,
          {
            role: "user",
            content: `${buildPrompt(data, instruction)}\n\n위의 웹 검색으로 확인된 사실만 기업·브랜드 맥락에 사용하고, 이제 구조화된 초안을 생성하세요.`,
          },
        ]
      : [{ role: "user", content: buildPrompt(data, instruction) }];

    const { response, payload } = await requestAnthropic(apiKey, {
      model,
      max_tokens: 16_000,
      // 검색 결과 블록을 이어 쓰는 경우에도 동일한 서버 도구 정의를 유지해야 합니다.
      tools: researchMessages ? [WEB_SEARCH_TOOL, GENERATE_TOOL] : [GENERATE_TOOL],
      tool_choice: { type: "tool", name: GENERATE_TOOL_NAME },
      messages: generationMessages,
    });
    if (!response.ok) {
      const message = getAnthropicErrorMessage(payload);
      console.error("Simulation generation request failed:", message);
      throw new Error("AI 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
    if (payload.stop_reason === "max_tokens") {
      throw new Error("생성 결과가 너무 길어요. JD를 줄이거나 다시 시도해주세요.");
    }

    const raw = toolOutputSchema.parse(getToolInput(payload));

    const steps: AdminSimulationStep[] = raw.simulation.steps.map((step, index) => {
      const stepId = `gen-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
      return {
        id: stepId,
        title: step.title.trim(),
        ...(step.durationMin ? { durationMin: step.durationMin } : {}),
        ...(step.difficulty ? { difficulty: step.difficulty } : {}),
        tags: [],
        situation: step.situation.trim(),
        materials: step.materials.trim(),
        hint: step.hint.trim(),
        completionMessage: step.completionMessage.trim(),
        prompts: [
          {
            id: `${stepId}-p1`,
            label: step.title.trim(),
            body: step.question.trim(),
          },
        ],
      };
    });

    return {
      companyName: data.companyName,
      roleName: data.roleName,
      domain: data.domain,
      simulation: {
        title: raw.simulation.title.trim(),
        roleLabel: raw.simulation.roleLabel.trim() || data.roleName,
        description: raw.simulation.description.trim(),
        estimatedMinutes: raw.simulation.estimatedMinutes ?? null,
        steps,
      },
      rationale: {
        webResearchFacts: raw.rationale.webResearchFacts
          .map((fact) => ({ fact: fact.fact.trim(), source: fact.source.trim() }))
          .filter((fact) => fact.fact.length > 0 && fact.source.length > 0),
        criteria: raw.rationale.criteria.map((c) => ({
          title: c.title.trim(),
          sources: c.sources.map((s) => ({ platform: s.platform.trim(), quote: s.quote.trim() })),
          reflectedIn: c.reflectedIn.trim(),
        })),
        unreflected: raw.rationale.unreflected.map((u) => ({
          requirement: u.requirement.trim(),
          reason: u.reason.trim(),
        })),
      },
    };
  });
