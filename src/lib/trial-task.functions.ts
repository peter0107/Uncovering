import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  allAnswered,
  buildResponseJson,
  buildResponseText,
  buildWizardModel,
  type WizardModel,
} from "@/lib/simulation-steps";

// /lp/trial 체험 결제자 전용 과제 열람·제출.
//
// 결제자는 계정이 없다(이메일·전화만 수집). 인증 수단은 고유코드 하나뿐이고,
// 답안은 submissions(job_seeker_id NOT NULL)에 넣을 수 없어 주문 행에 저장한다.
//
// 열람 조건 3개를 매 호출마다 다시 확인한다:
//   status = 'paid'  AND  delivered_at is not null  AND  simulation_id is not null
// delivered_at(관리자의 "발송 완료")이 곧 공개 스위치다. 현직자 검수 전에는 열리지 않는다.
//
// ★ 모범답안은 제출 전 어떤 응답에도 실리지 않는다. 클라이언트에서 숨기는 게 아니라
//   서버가 필드 자체를 제거해서 보낸다. getTrialTaskByCode / submitTrialAnswer 를
//   나눠 둔 유일한 이유가 이것이다.

export type TrialTaskView = {
  title: string;
  roleLabel: string;
  description: string;
  estimatedMinutes: number | null;
  /** 제출 전에는 steps[].modelAnswer 가 제거된 상태로 온다. */
  model: WizardModel;
  /** 스텝별 모범답안이 없을 때 쓰는 시뮬레이션 단위 모범답안. 제출 전에는 빈 문자열. */
  fallbackModelAnswer: string;
  /** 제출 시각(KST). 미제출이면 빈 문자열. */
  submittedAt: string;
  /** 제출했다면 저장된 답안 (promptId → 답변) */
  answers: Record<string, string>;
};

const accessCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .transform((value) => value.toUpperCase());

const trialTaskInputSchema = z.object({ code: accessCodeSchema });

const submitTrialAnswerInputSchema = z.object({
  code: accessCodeSchema,
  answers: z.record(z.string().min(1).max(200), z.string().max(50000)),
  startedAt: z.string().datetime().optional(),
});

type TrialOrderRow = {
  order_id: string;
  simulation_id: string | null;
  answer_json: unknown;
  answer_submitted_at: string | null;
};

type SimulationRow = {
  title: string | null;
  role_label: string | null;
  description: string | null;
  estimated_minutes: number | null;
  simulation_format: string | null;
  selection_mode: string | null;
  single_answer_question: string | null;
  task_prompt: string | null;
  shared_situation: string | null;
  shared_materials: string | null;
  steps: unknown;
  expert_model_answer: string | null;
};

const SIMULATION_COLUMNS =
  "title, role_label, description, estimated_minutes, simulation_format, selection_mode, single_answer_question, task_prompt, shared_situation, shared_materials, steps, expert_model_answer";

function formatDateTime(iso: string): string {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 수행 중에는 모범답안을 통째로 들어낸다. */
function stripModelAnswers(model: WizardModel): WizardModel {
  return {
    ...model,
    steps: model.steps.map(({ modelAnswer: _hidden, ...step }) => step),
  };
}

/** 저장된 response_json(step_wizard_v1) → { promptId: 답변 } */
function readSavedAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const answers = (value as { answers?: unknown }).answers;
  if (!Array.isArray(answers)) return {};
  const result: Record<string, string> = {};
  for (const item of answers) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const { id, answer } = item as { id?: unknown; answer?: unknown };
    if (typeof id === "string" && typeof answer === "string") result[id] = answer;
  }
  return result;
}

/**
 * 코드로 주문 + 배정된 과제를 찾는다. 열람 조건 3개를 모두 확인한다.
 * 실패 사유를 세분화하지 않는 이유: 코드 대입 공격자에게 힌트를 주지 않기 위해서.
 */
async function loadTrialTask(code: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order, error: orderError } = await supabaseAdmin
    .from("landing_trial_orders")
    .select("order_id, simulation_id, answer_json, answer_submitted_at")
    .eq("access_code", code)
    .eq("status", "paid")
    .not("delivered_at", "is", null)
    .maybeSingle();

  if (orderError) {
    console.error("Failed to load trial order by access code:", orderError);
    throw new Error("과제를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  if (!order || !order.simulation_id) {
    throw new Error("사용할 수 없는 코드예요. 발송된 코드를 다시 확인해주세요.");
  }

  const { data: simulation, error: simulationError } = await supabaseAdmin
    .from("job_simulations")
    .select(SIMULATION_COLUMNS)
    .eq("id", order.simulation_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (simulationError) {
    console.error("Failed to load trial simulation:", simulationError);
    throw new Error("과제를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  if (!simulation) {
    throw new Error("사용할 수 없는 코드예요. 발송된 코드를 다시 확인해주세요.");
  }

  const row = simulation as SimulationRow;
  const model = buildWizardModel(row.task_prompt, row.steps, {
    selectionMode: row.selection_mode === "common" ? "common" : "separated",
    situation: row.shared_situation,
    materials: row.shared_materials,
  });

  if (!model) {
    console.error("Trial simulation has no renderable steps:", order.simulation_id);
    throw new Error("과제 준비가 아직 끝나지 않았어요. 담당자에게 문의해주세요.");
  }

  return { supabaseAdmin, order: order as TrialOrderRow, simulation: row, model };
}

function toView(
  simulation: SimulationRow,
  model: WizardModel,
  order: TrialOrderRow,
  revealModelAnswer: boolean,
): TrialTaskView {
  return {
    title: simulation.title ?? "",
    roleLabel: simulation.role_label ?? "",
    description: simulation.description ?? "",
    estimatedMinutes: simulation.estimated_minutes,
    model: revealModelAnswer ? model : stripModelAnswers(model),
    fallbackModelAnswer: revealModelAnswer ? (simulation.expert_model_answer ?? "") : "",
    submittedAt: order.answer_submitted_at ? formatDateTime(order.answer_submitted_at) : "",
    answers: revealModelAnswer ? readSavedAnswers(order.answer_json) : {},
  };
}

export const getTrialTaskByCode = createServerFn({ method: "GET" })
  .inputValidator(trialTaskInputSchema)
  .handler(async ({ data }): Promise<TrialTaskView> => {
    const { order, simulation, model } = await loadTrialTask(data.code);
    // 이미 제출했다면 모범답안과 저장된 답안을 함께 돌려준다 (비교 화면 재방문).
    return toView(simulation, model, order, Boolean(order.answer_submitted_at));
  });

export const submitTrialAnswer = createServerFn({ method: "POST" })
  .inputValidator(submitTrialAnswerInputSchema)
  .handler(async ({ data }): Promise<TrialTaskView> => {
    const { supabaseAdmin, order, simulation, model } = await loadTrialTask(data.code);

    if (order.answer_submitted_at) {
      throw new Error("이미 제출한 과제예요. 답안은 수정할 수 없어요.");
    }
    if (!allAnswered(model, data.answers)) {
      throw new Error("아직 답변하지 않은 질문이 있어요.");
    }

    const now = new Date();
    const startedAt = data.startedAt ? new Date(data.startedAt) : null;

    const { data: updated, error } = await supabaseAdmin
      .from("landing_trial_orders")
      .update({
        answer_text: buildResponseText(model, data.answers),
        answer_json: buildResponseJson(model, data.answers),
        answer_started_at: startedAt ? startedAt.toISOString() : null,
        answer_submitted_at: now.toISOString(),
      })
      .eq("order_id", order.order_id)
      // 동시 제출로 답안이 덮어써지지 않게 한다.
      .is("answer_submitted_at", null)
      .select("order_id");

    if (error) {
      console.error("Failed to save trial answer:", error);
      throw new Error("답안을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
    // 0건이면 그 사이 다른 요청이 먼저 제출한 것 — 저장하지 않았으므로 모범답안도 주지 않는다.
    if (!updated || updated.length === 0) {
      throw new Error("이미 제출한 과제예요. 답안은 수정할 수 없어요.");
    }

    // 저장에 성공한 뒤에만 모범답안을 공개한다.
    return toView(
      simulation,
      model,
      { ...order, answer_json: buildResponseJson(model, data.answers), answer_submitted_at: now.toISOString() },
      true,
    );
  });
