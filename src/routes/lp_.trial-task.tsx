import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, Clock, Lock, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RichTextContent, RichTextEditor } from "@/components/RichTextEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { allAnswered, stepAnswered, type WizardStep } from "@/lib/simulation-steps";
import {
  getTrialTaskByCode,
  submitTrialAnswer,
  type TrialTaskView,
} from "@/lib/trial-task.functions";

// 체험 결제자가 발송받은 고유코드로 전용 과제를 열람·수행·제출하는 화면.
// 계정이 없으므로 코드가 유일한 인증 수단이고, 코드는 URL 검색 파라미터로만 흐른다(/biz 패턴).

const MAX_ANSWER_LENGTH = 20000;

export const Route = createFileRoute("/lp_/trial-task")({
  validateSearch: z.object({ code: z.string().catch("") }),
  head: () => ({
    meta: [
      { title: "체험 과제 — Beginner" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TrialTaskPage,
});

function draftKey(code: string) {
  return `trial-draft-${code}`;
}

function startedAtKey(code: string) {
  return `trial-started-${code}`;
}

function TrialTaskPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();

  const [task, setTask] = useState<TrialTaskView | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(code));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setTask(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let canceled = false;
    setIsLoading(true);
    setError(null);
    void getTrialTaskByCode({ data: { code } })
      .then((result) => {
        if (canceled) return;
        setTask(result);
        // 처음 연 시각을 남겨 소요 시간을 기록한다.
        if (!result.submittedAt && !localStorage.getItem(startedAtKey(code))) {
          localStorage.setItem(startedAtKey(code), new Date().toISOString());
        }
      })
      .catch((reason: unknown) => {
        if (canceled) return;
        setError(reason instanceof Error ? reason.message : "과제를 불러오지 못했어요.");
      })
      .finally(() => {
        if (!canceled) setIsLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [code]);

  if (!code) return <CodeGate />;

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Shell>
    );
  }

  if (error || !task) {
    return (
      <Shell>
        <div className="rounded-xl border border-dashed border-zinc-300 px-5 py-16 text-center">
          <Lock className="mx-auto h-6 w-6 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-600">{error ?? "과제를 불러오지 못했어요."}</p>
          <Button
            variant="outline"
            className="mt-5 rounded-xl"
            onClick={() => void navigate({ to: "/lp/trial-task", search: { code: "" } })}
          >
            코드 다시 입력하기
          </Button>
        </div>
      </Shell>
    );
  }

  if (task.submittedAt) return <ComparisonView task={task} />;

  return <TaskWizard code={code} task={task} onSubmitted={setTask} />;
}

/** 코드 입력 화면 */
function CodeGate() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  return (
    <Shell narrow>
      <div className="rounded-xl border border-zinc-200 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">체험 과제 열람</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          결제하신 이메일로 보내드린 고유코드를 입력하면 나만 볼 수 있는 과제가 열려요.
        </p>
        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = value.trim().toUpperCase();
            if (trimmed.length < 4) {
              toast.error("코드를 정확히 입력해주세요.");
              return;
            }
            void navigate({ to: "/lp/trial-task", search: { code: trimmed } });
          }}
        >
          <label htmlFor="trial-code" className="text-xs font-medium text-zinc-700">
            고유코드
          </label>
          <input
            id="trial-code"
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase())}
            maxLength={32}
            autoComplete="off"
            placeholder="예: A3KM7PQR29"
            className="mt-1.5 h-11 w-full rounded-xl border border-zinc-300 px-3 font-mono text-sm tracking-widest outline-none focus:border-zinc-900"
          />
          <Button type="submit" className="mt-4 h-11 w-full rounded-xl bg-zinc-900 hover:bg-zinc-800">
            과제 열기
          </Button>
        </form>
        <p className="mt-4 text-xs leading-5 text-zinc-400">
          코드를 받지 못하셨다면 결제 후 24시간 이내에 이메일로 발송되니 조금만 기다려주세요.
        </p>
      </div>
    </Shell>
  );
}

/** 과제 수행 위저드 */
function TaskWizard({
  code,
  task,
  onSubmitted,
}: {
  code: string;
  task: TrialTaskView;
  onSubmitted: (task: TrialTaskView) => void;
}) {
  const steps = task.model.steps;
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const restoredRef = useRef(false);

  // 임시저장 복원 (기존 시뮬레이션 화면과 같은 방식)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem(draftKey(code));
      if (saved) setAnswers(JSON.parse(saved) as Record<string, string>);
    } catch {
      // 손상된 임시저장은 무시한다.
    }
  }, [code]);

  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      localStorage.setItem(draftKey(code), JSON.stringify(answers));
    } catch {
      // 용량 초과 등은 무시 — 저장 실패가 작성을 막으면 안 된다.
    }
  }, [code, answers]);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const canAdvance = step ? stepAnswered(step, answers) : false;
  const canSubmit = allAnswered(task.model, answers);

  const setAnswer = useCallback((promptId: string, value: string) => {
    setAnswers((current) => ({ ...current, [promptId]: value }));
  }, []);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const startedAt = localStorage.getItem(startedAtKey(code)) ?? undefined;
      const result = await submitTrialAnswer({
        data: { code, answers, startedAt: startedAt ?? undefined },
      });
      localStorage.removeItem(draftKey(code));
      onSubmitted(result);
      window.scrollTo({ top: 0 });
      toast.success("제출이 완료됐어요. 모범답안을 확인해보세요.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "제출하지 못했어요.");
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  }, [code, answers, onSubmitted]);

  if (!step) {
    return (
      <Shell>
        <p className="text-sm text-zinc-500">표시할 단계가 없어요. 담당자에게 문의해주세요.</p>
      </Shell>
    );
  }

  const situation = task.model.selectionMode === "common" ? task.model.sharedSituation : step.situation;
  const materials = task.model.selectionMode === "common" ? task.model.sharedMaterials : step.materials;

  return (
    <Shell>
      <TaskHeader task={task} />

      {/* 진행 표시 */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {stepIndex + 1} / {steps.length} 단계
          </span>
          <span>{step.title}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* 왼쪽: 상황·자료 */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <StepMeta step={step} />
          {task.model.sharedBackground && (
            <MaterialSection label="배경" markdown={task.model.sharedBackground} />
          )}
          {step.prevSummary && <MaterialSection label="이전 단계 요약" markdown={step.prevSummary} />}
          {situation && <MaterialSection label="상황 안내" markdown={situation} />}
          {materials && <MaterialSection label="제공 자료" markdown={materials} />}
          {step.hint && (
            <details className="rounded-xl border border-zinc-200 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-zinc-500">
                막혔다면 힌트 보기
              </summary>
              <RichTextContent
                value={step.hint.trimStart()}
                compact
                className="prose prose-sm prose-zinc mt-2 max-w-none"
              />
            </details>
          )}
        </div>

        {/* 오른쪽: 질문 + 답안 */}
        <div className="space-y-6">
          {step.prompts.map((prompt) => (
            <div key={prompt.id}>
              <p id={`prompt-${prompt.id}`} className="text-sm font-semibold text-zinc-900">
                {prompt.label}
              </p>
              {prompt.bodyMarkdown && (
                <RichTextContent
                  value={prompt.bodyMarkdown.trimStart()}
                  compact
                  className="prose prose-sm prose-zinc mt-2 max-w-none"
                />
              )}
              <div className="mt-3">
                <RichTextEditor
                  ariaLabelledby={`prompt-${prompt.id}`}
                  label=""
                  value={answers[prompt.id] ?? ""}
                  onChange={(value) => setAnswer(prompt.id, value)}
                  placeholder="여기에 답안을 작성해주세요"
                  minHeight="16rem"
                  maxLength={MAX_ANSWER_LENGTH}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              disabled={stepIndex === 0}
              onClick={() => {
                setStepIndex((index) => Math.max(0, index - 1));
                window.scrollTo({ top: 0 });
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              이전
            </Button>

            {isLast ? (
              <Button
                type="button"
                className="rounded-xl bg-zinc-900 hover:bg-zinc-800"
                disabled={!canSubmit || isSubmitting}
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="mr-1.5 h-4 w-4" />
                제출하고 모범답안 보기
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-xl bg-zinc-900 hover:bg-zinc-800"
                disabled={!canAdvance}
                onClick={() => {
                  setStepIndex((index) => Math.min(steps.length - 1, index + 1));
                  window.scrollTo({ top: 0 });
                }}
              >
                다음 단계
              </Button>
            )}
          </div>

          {isLast && !canSubmit && (
            <p className="text-xs text-zinc-400">
              모든 단계의 답변을 채우면 제출할 수 있어요.
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>답안을 제출할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              제출하면 모범답안이 공개되고, 답안은 더 이상 수정할 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>더 작성할게요</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {isSubmitting ? "제출 중..." : "제출할게요"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

/** 제출 후: 내 답안 ↔ 모범답안 비교 */
function ComparisonView({ task }: { task: TrialTaskView }) {
  const hasStepModelAnswer = useMemo(
    () => task.model.steps.some((step) => (step.modelAnswer ?? "").trim().length > 0),
    [task.model.steps],
  );

  return (
    <Shell>
      <TaskHeader task={task} />

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-700" />
        <p className="text-sm text-zinc-700">
          {task.submittedAt}에 제출을 완료했어요. 아래에서 내 답안과 모범답안을 비교해보세요.
        </p>
      </div>

      <div className="mt-8 space-y-10">
        {task.model.steps.map((step, index) => (
          <section key={`${step.title}-${index}`} className="border-t border-zinc-200 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              {index + 1}. {step.title}
            </h2>

            {step.prompts.map((prompt) => (
              <div key={prompt.id} className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-zinc-500">내 답안</p>
                  <Card className="mt-1.5 p-4">
                    {(task.answers[prompt.id] ?? "").trim() ? (
                      <RichTextContent
                        value={task.answers[prompt.id]}
                        compact
                        className="prose prose-sm prose-zinc max-w-none"
                      />
                    ) : (
                      <p className="text-sm text-zinc-400">작성한 답안이 없어요.</p>
                    )}
                  </Card>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-500">모범답안</p>
                  <Card className="mt-1.5 border-zinc-300 bg-zinc-50 p-4">
                    {(step.modelAnswer ?? "").trim() ? (
                      <RichTextContent
                        value={(step.modelAnswer ?? "").trimStart()}
                        compact
                        className="prose prose-sm prose-zinc max-w-none"
                      />
                    ) : (
                      <p className="text-sm text-zinc-400">
                        이 단계의 모범답안은 아래 총평을 참고해주세요.
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            ))}
          </section>
        ))}

        {task.fallbackModelAnswer.trim() && (
          <section className="border-t border-zinc-200 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              {hasStepModelAnswer ? "총평" : "모범답안"}
            </h2>
            <Card className="mt-3 border-zinc-300 bg-zinc-50 p-4">
              <RichTextContent
                value={task.fallbackModelAnswer.trimStart()}
                compact
                className="prose prose-sm prose-zinc max-w-none"
              />
            </Card>
          </section>
        )}
      </div>
    </Shell>
  );
}

function TaskHeader({ task }: { task: TrialTaskView }) {
  return (
    <header className="border-b border-zinc-200 pb-6">
      {task.roleLabel && <p className="text-sm font-medium text-zinc-500">{task.roleLabel}</p>}
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {task.title}
      </h1>
      {task.description && <p className="mt-3 text-sm leading-6 text-zinc-600">{task.description}</p>}
      {task.estimatedMinutes != null && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-500">
          <Clock className="h-4 w-4" />약 {task.estimatedMinutes}분
        </p>
      )}
    </header>
  );
}

function StepMeta({ step }: { step: WizardStep }) {
  if (step.durationMin == null && step.difficulty == null) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
      {step.durationMin != null && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />약 {step.durationMin}분
        </span>
      )}
      {step.difficulty != null && <span>난이도 {"★".repeat(step.difficulty)}</span>}
    </div>
  );
}

function MaterialSection({ label, markdown }: { label: string; markdown: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500">{label}</p>
      <Card className="mt-1 p-3">
        <RichTextContent
          value={markdown.trimStart()}
          compact
          className="prose prose-sm prose-zinc max-w-none prose-table:text-sm"
        />
      </Card>
    </div>
  );
}

function Shell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <main
      className={`mx-auto px-5 py-12 sm:py-16 ${narrow ? "max-w-md" : "max-w-6xl"}`}
    >
      {children}
    </main>
  );
}
