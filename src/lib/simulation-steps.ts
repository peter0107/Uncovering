// 직무 시뮬레이션을 스텝 위저드로 렌더하기 위한 모델.
//
// 두 가지 소스를 하나의 WizardModel 로 통합한다:
//  1) 저작 스텝 (job_simulations.steps jsonb) — 단계마다 자료/질문/힌트를 직접 작성.
//     → 왼쪽 자료가 단계마다 다르게 보인다. (권장)
//  2) 자동 분할 (task_prompt 파싱) — 저작 스텝이 없을 때의 폴백.
//     → 질문만 단계로 나누고, 왼쪽 배경은 전 단계 공통.
//
// 둘 다 실패하면 null → 라우트에서 기존 단일 화면으로 폴백.

// ---------- 저작 스텝 (DB jsonb 원본 형태) ----------
export type AuthoredPrompt = {
  id: string;
  label?: string;
  /** 질문 설명 + 표 템플릿 등 (마크다운) */
  body?: string;
};

export type AuthoredStep = {
  id?: string;
  title: string;
  durationMin?: number;
  difficulty?: number; // 1~5 (★)
  tags?: string[];
  situation?: string; // 상황 안내 (마크다운)
  prevSummary?: string; // 이전 미션 요약 (마크다운)
  materials?: string; // 제공 자료 — 이 단계의 왼쪽 자료 (마크다운)
  hint?: string; // 초심자용 힌트 (마크다운)
  completionMessage?: string; // 완료 메시지 (마크다운)
  prompts: AuthoredPrompt[];
};

// ---------- 위저드 렌더 모델 (통합) ----------
export type WizardPrompt = {
  id: string;
  label: string;
  bodyMarkdown: string;
};

export type WizardStep = {
  title: string;
  durationMin?: number;
  difficulty?: number;
  tags?: string[];
  situation?: string;
  prevSummary?: string;
  /** 이 단계의 왼쪽 자료. 없으면 sharedBackground 사용 */
  materials?: string;
  hint?: string;
  completionMessage?: string;
  prompts: WizardPrompt[];
};

export type WizardModel = {
  /** true = 저작 스텝, false = 자동 분할 */
  authored: boolean;
  /** 자동 분할일 때 전 단계 공통 배경 */
  sharedBackground?: string;
  steps: WizardStep[];
};

// ============================================================
// 1) 저작 스텝 → WizardModel
// ============================================================
function fromAuthoredSteps(raw: unknown): WizardModel | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const steps: WizardStep[] = [];
  for (const item of raw as AuthoredStep[]) {
    if (!item || typeof item.title !== "string" || !Array.isArray(item.prompts)) return null;
    const prompts: WizardPrompt[] = item.prompts
      .filter((p) => p && typeof p.id === "string")
      .map((p) => ({
        id: p.id,
        label: p.label?.trim() || p.id,
        bodyMarkdown: (p.body ?? "").trim(),
      }));
    if (prompts.length === 0) return null;

    steps.push({
      title: item.title,
      durationMin: item.durationMin,
      difficulty: item.difficulty,
      tags: item.tags,
      situation: item.situation?.trim() || undefined,
      prevSummary: item.prevSummary?.trim() || undefined,
      materials: item.materials?.trim() || undefined,
      hint: item.hint?.trim() || undefined,
      completionMessage: item.completionMessage?.trim() || undefined,
      prompts,
    });
  }
  return { authored: true, steps };
}

// ============================================================
// 2) task_prompt 자동 분할 → WizardModel (폴백)
// ============================================================
const REPORT_HEADING = /^#{1,4}\s*\d+\.\s*제출\s*보고서/;
const FINAL_HEADING = /^#{1,4}\s*\d+\.\s*최종\s*제출/;
// "#### 3) 원인 가설" 은 매칭, "#### **초심자용 힌트 3)**" 은 hashes 뒤가 숫자가 아니라 비매칭.
const QUESTION_HEADING = /^#{2,4}\s*(\d+)\)\s*(.+)$/;
const TARGET_STEPS = 4;

function fromTaskPrompt(taskPrompt: string | null | undefined): WizardModel | null {
  if (!taskPrompt) return null;

  const lines = taskPrompt.replace(/\r\n/g, "\n").split("\n");

  const reportIdx = lines.findIndex((line) => REPORT_HEADING.test(line));
  if (reportIdx === -1) return null;

  let endIdx = lines.findIndex((line, i) => i > reportIdx && FINAL_HEADING.test(line));
  if (endIdx === -1) endIdx = lines.length;

  const background = lines.slice(0, reportIdx).join("\n").trim();
  const reportLines = lines.slice(reportIdx + 1, endIdx);

  const questions: WizardPrompt[] = [];
  let current: (WizardPrompt & { num: number }) | null = null;

  for (const line of reportLines) {
    const match = line.match(QUESTION_HEADING);
    if (match) {
      if (current) questions.push(current);
      const num = Number(match[1]);
      current = {
        id: `q${num}`,
        num,
        label: `${num}. ${match[2].replace(/\*/g, "").trim()}`,
        bodyMarkdown: "",
      };
    } else if (current) {
      current.bodyMarkdown += `${line}\n`;
    }
  }
  if (current) questions.push(current);

  for (const q of questions) {
    q.bodyMarkdown = q.bodyMarkdown.replace(/\n?-{3,}\s*$/g, "").trim();
  }

  if (questions.length < 2) return null;

  const targetSteps = Math.min(TARGET_STEPS, questions.length);
  const perStep = Math.ceil(questions.length / targetSteps);
  const steps: WizardStep[] = [];
  for (let i = 0; i < questions.length; i += perStep) {
    const group = questions.slice(i, i + perStep);
    steps.push({
      title: group.map((q) => q.label).join(" · "),
      prompts: group.map(({ id, label, bodyMarkdown }) => ({ id, label, bodyMarkdown })),
    });
  }

  return { authored: false, sharedBackground: background, steps };
}

// ============================================================
// 통합 진입점
// ============================================================
export function buildWizardModel(
  taskPrompt: string | null | undefined,
  authoredSteps: unknown,
): WizardModel | null {
  return fromAuthoredSteps(authoredSteps) ?? fromTaskPrompt(taskPrompt);
}

// ============================================================
// 답안 → 저장 형태
// ============================================================
function allPrompts(model: WizardModel): WizardPrompt[] {
  return model.steps.flatMap((step) => step.prompts);
}

/** 스텝별 답을 기업 화면용 평문 합본으로 만든다 (biz는 whitespace-pre-line 렌더). */
export function buildResponseText(model: WizardModel, answers: Record<string, string>): string {
  return allPrompts(model)
    .map((p) => `【${p.label}】\n${(answers[p.id] ?? "").trim()}`)
    .join("\n\n");
}

/** 스텝별 답을 구조화 저장 (submissions.response_json). */
export function buildResponseJson(
  model: WizardModel,
  answers: Record<string, string>,
): { format: "step_wizard_v1"; answers: { id: string; label: string; answer: string }[] } {
  return {
    format: "step_wizard_v1",
    answers: allPrompts(model).map((p) => ({
      id: p.id,
      label: p.label,
      answer: (answers[p.id] ?? "").trim(),
    })),
  };
}

/** 모든 질문에 답이 채워졌는지 */
export function allAnswered(model: WizardModel, answers: Record<string, string>): boolean {
  return allPrompts(model).every((p) => (answers[p.id] ?? "").trim().length > 0);
}

/** 특정 스텝의 질문이 모두 채워졌는지 */
export function stepAnswered(step: WizardStep, answers: Record<string, string>): boolean {
  return step.prompts.every((p) => (answers[p.id] ?? "").trim().length > 0);
}
