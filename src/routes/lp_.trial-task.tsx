import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RichTextContent, RichTextEditor } from "@/components/RichTextEditor";
import { SimulationShell, MaterialBody, MaterialTabStrip } from "@/components/SimulationShell";
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { capturePostHogEvent } from "@/lib/posthog";
import {
  allAnswered,
  buildSidebarMaterialTabs,
  getPlainAnswerText,
  getStepMaterialContext,
  type MaterialTab,
  type WizardModel,
} from "@/lib/simulation-steps";
import {
  getTrialTaskByCode,
  submitTrialAnswer,
  type TrialTaskView,
} from "@/lib/trial-task.functions";

// 체험 결제자가 발송받은 고유코드로 전용 과제를 열람·수행·제출하는 화면.
// 계정이 없으므로 코드가 유일한 인증 수단이고, 코드는 URL 검색 파라미터로만 흐른다(/biz 패턴).

const MAX_ANSWER_LENGTH = 20000;

type TrialScreen =
  | { kind: "intro" }
  | { kind: "situation"; stepIndex: number; markdown: string }
  | { kind: "materials"; stepIndex: number; tabs: MaterialTab[] }
  | { kind: "question"; stepIndex: number; promptIndex: number }
  | { kind: "submit" };

function buildTrialScreens(model: WizardModel): TrialScreen[] {
  const screens: TrialScreen[] = [{ kind: "intro" }];
  let last: { situation?: string; materials?: string } = {};

  model.steps.forEach((step, stepIndex) => {
    const context = getStepMaterialContext(model, step);
    if (context.situation && context.situation !== last.situation) {
      screens.push({ kind: "situation", stepIndex, markdown: context.situation });
    }
    if (context.materials && context.materials !== last.materials) {
      const tabs = buildSidebarMaterialTabs({ materials: context.materials });
      if (tabs.length > 0) screens.push({ kind: "materials", stepIndex, tabs });
    }
    last = context;
    step.prompts.forEach((_, promptIndex) => {
      screens.push({ kind: "question", stepIndex, promptIndex });
    });
  });

  screens.push({ kind: "submit" });
  return screens;
}

function trialProgressStep(screen: TrialScreen, totalSteps: number): number {
  if (screen.kind === "intro") return 1;
  if (screen.kind === "submit") return totalSteps;
  return screen.stepIndex + 1;
}

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
            onClick={() => {
              void capturePostHogEvent("trial_task_code_retry_clicked", { simulation_context: "trial" });
              void navigate({ to: "/lp/trial-task", search: { code: "" } });
            }}
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
            void capturePostHogEvent("trial_task_code_submitted", {
              simulation_context: "trial",
              code_length: trimmed.length,
            });
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
  const model = task.model;
  const screens = useMemo(() => buildTrialScreens(model), [model]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [screenIndex, setScreenIndex] = useState(0);
  const [materialTabIndex, setMaterialTabIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
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

  const setAnswer = useCallback((promptId: string, value: string) => {
    setAnswers((current) => ({ ...current, [promptId]: value }));
  }, []);

  const trackTrialAction = useCallback(
    (event: string, properties: Record<string, unknown> = {}) => {
      const currentScreen = screens[screenIndex];
      void capturePostHogEvent(event, {
        simulation_context: "trial",
        simulation_title: task.title,
        role_label: task.roleLabel ?? null,
        screen_kind: currentScreen?.kind ?? "unknown",
        screen_index: screenIndex,
        step_index: currentScreen ? trialProgressStep(currentScreen, model.steps.length) : null,
        total_steps: model.steps.length,
        ...properties,
      });
    },
    [model.steps.length, screenIndex, screens, task.roleLabel, task.title],
  );

  const goToScreen = useCallback((nextIndex: number) => {
    setScreenIndex(nextIndex);
    setMaterialTabIndex(0);
    setHintOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const goNext = useCallback(() => {
    trackTrialAction("trial_simulation_next_clicked");
    goToScreen(Math.min(screens.length - 1, screenIndex + 1));
  }, [goToScreen, screenIndex, screens.length, trackTrialAction]);

  const goPrev = useCallback(() => {
    trackTrialAction("trial_simulation_previous_clicked");
    goToScreen(Math.max(0, screenIndex - 1));
  }, [goToScreen, screenIndex, trackTrialAction]);

  const submit = useCallback(async () => {
    trackTrialAction("trial_simulation_submission_confirmed");
    setIsSubmitting(true);
    try {
      const startedAt = localStorage.getItem(startedAtKey(code)) ?? undefined;
      const result = await submitTrialAnswer({
        data: { code, answers, startedAt: startedAt ?? undefined },
      });
      localStorage.removeItem(draftKey(code));
      onSubmitted(result);
      window.scrollTo({ top: 0 });
      void capturePostHogEvent("trial_simulation_submit", {
        simulation_context: "trial",
        simulation_title: task.title,
        role_label: task.roleLabel ?? null,
      });
      void capturePostHogEvent("trial_simulation_complete", {
        simulation_context: "trial",
        simulation_title: task.title,
      });
      toast.success("제출이 완료됐어요. 모범답안을 확인해보세요.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "제출하지 못했어요.");
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  }, [code, answers, onSubmitted, task.roleLabel, task.title, trackTrialAction]);

  const screen = screens[screenIndex] ?? screens[0];
  if (!screen) {
    return (
      <Shell>
        <p className="text-sm text-zinc-500">표시할 단계가 없어요. 담당자에게 문의해주세요.</p>
      </Shell>
    );
  }

  const nextScreen = screens[screenIndex + 1];
  const topLabel =
    screen.kind === "intro"
      ? "시작"
      : screen.kind === "situation"
        ? "상황 안내"
        : screen.kind === "materials"
          ? "자료 확인"
          : screen.kind === "submit"
            ? "제출"
            : model.steps[screen.stepIndex].title;
  const questionContext =
    screen.kind === "question" ? getStepMaterialContext(model, model.steps[screen.stepIndex]) : null;
  const sidebarTabs = questionContext ? buildSidebarMaterialTabs(questionContext) : [];

  let mainContent: React.ReactNode;
  let primaryLabel: string;
  let primaryDisabled = false;
  let onPrimary: () => void;

  if (screen.kind === "intro") {
    primaryLabel = "시작하기 →";
    onPrimary = goNext;
    mainContent = (
      <div className="flex min-h-[calc(100dvh-4.5rem)] items-center justify-center px-5 py-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-xl border border-zinc-200 bg-white px-8 py-14 text-center sm:px-14">
          <span className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs text-zinc-500">
            {[task.roleLabel, task.estimatedMinutes ? `약 ${task.estimatedMinutes}분` : null, `${model.steps.length}단계`]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <h1 className="text-2xl font-bold leading-snug tracking-tight text-zinc-900 sm:text-[28px]">
            {task.title}
          </h1>
          {task.description && (
            <p className="text-sm leading-relaxed text-zinc-500 sm:text-[15px]">{task.description}</p>
          )}
        </div>
      </div>
    );
  } else if (screen.kind === "situation") {
    primaryLabel = nextScreen?.kind === "materials" ? "자료 확인하러 가기 →" : "다음 →";
    onPrimary = goNext;
    mainContent = (
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-12">
        <p className="text-xs text-zinc-500">상황</p>
        <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-6">
          <RichTextContent value={screen.markdown} compact className="prose prose-sm prose-zinc max-w-none" />
        </div>
      </div>
    );
  } else if (screen.kind === "materials") {
    primaryLabel = "다음 →";
    onPrimary = goNext;
    const activeTab = screen.tabs[materialTabIndex] ?? screen.tabs[0];
    mainContent = (
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-12">
        <p className="text-xs text-zinc-500">제공 자료</p>
        <MaterialTabStrip
          tabs={screen.tabs}
          value={materialTabIndex}
          onValueChange={setMaterialTabIndex}
          onTabChange={(tabIndex, tabLabel) =>
            trackTrialAction("trial_simulation_material_tab_selected", {
              material_area: "materials",
              tab_index: tabIndex,
              tab_label: tabLabel,
            })
          }
          className="mt-4"
        />
        <MaterialBody body={activeTab?.body ?? ""} className="mt-3" />
      </div>
    );
  } else if (screen.kind === "question") {
    const step = model.steps[screen.stepIndex];
    const prompt = step.prompts[screen.promptIndex];
    const answered = getPlainAnswerText(answers[prompt.id] ?? "").length > 0;
    const isLastPromptOfStep = screen.promptIndex === step.prompts.length - 1;
    const showCompletion = isLastPromptOfStep && step.completionMessage && model.steps
      .slice(0, screen.stepIndex + 1)
      .every((currentStep) => currentStep.prompts.every((currentPrompt) => getPlainAnswerText(answers[currentPrompt.id] ?? "").length > 0));

    primaryLabel =
      nextScreen?.kind === "submit"
        ? "제출하러 가기 →"
        : nextScreen?.kind === "question" && nextScreen.stepIndex === screen.stepIndex
          ? "다음 질문 →"
          : "다음 →";
    onPrimary = () => {
      if (!answered) {
        toast.error("이 질문의 답변을 먼저 작성해주세요.");
        return;
      }
      goNext();
    };
    mainContent = (
      <div className="mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-12">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {sidebarTabs.length > 0 && (
            <div className="hidden lg:sticky lg:top-[5.5rem] lg:block lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto">
              <MaterialTabStrip
                tabs={sidebarTabs}
                value={materialTabIndex}
                onValueChange={setMaterialTabIndex}
                onTabChange={(tabIndex, tabLabel) =>
                  trackTrialAction("trial_simulation_material_tab_selected", {
                    material_area: "sidebar",
                    tab_index: tabIndex,
                    tab_label: tabLabel,
                  })
                }
              />
              <MaterialBody
                body={sidebarTabs[materialTabIndex]?.body ?? sidebarTabs[0]?.body ?? ""}
                className="mt-3"
              />
            </div>
          )}
          <div className="flex flex-col">
            <p className="text-xs text-zinc-500">
              질문 {screen.promptIndex + 1} / {step.prompts.length}
            </p>
            {(step.durationMin != null || step.difficulty != null) && (
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                {step.durationMin != null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />약 {step.durationMin}분
                  </span>
                )}
                {step.difficulty != null && (
                  <span className="text-zinc-700">
                    {"★".repeat(Math.max(0, Math.min(5, step.difficulty)))}
                    <span className="text-zinc-200">
                      {"★".repeat(Math.max(0, 5 - Math.min(5, step.difficulty)))}
                    </span>
                  </span>
                )}
              </div>
            )}
            {prompt.bodyMarkdown && (
              <div className="mt-2 prose prose-sm prose-zinc max-w-none prose-table:text-sm prose-headings:text-sm prose-headings:font-semibold">
                <RichTextContent value={prompt.bodyMarkdown} compact />
              </div>
            )}
            <div className="mt-3">
              <RichTextEditor
                ariaLabelledby={`trial-prompt-${prompt.id}`}
                label=""
                value={answers[prompt.id] ?? ""}
                onChange={(value) => setAnswer(prompt.id, value)}
                placeholder="여기에 답안을 작성해주세요"
                minHeight="16rem"
                maxLength={MAX_ANSWER_LENGTH}
              />
            </div>
            {step.hint && (
              <details
                className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                open={hintOpen}
                onToggle={(event) => {
                  const isOpen = (event.target as HTMLDetailsElement).open;
                  setHintOpen(isOpen);
                  trackTrialAction(isOpen ? "trial_simulation_hint_opened" : "trial_simulation_hint_closed");
                }}
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-700">
                  초심자용 힌트 보기
                </summary>
                <div className="prose prose-sm prose-zinc mt-2 max-w-none prose-table:text-sm">
                  <RichTextContent value={step.hint} compact />
                </div>
              </details>
            )}
            {showCompletion && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="prose prose-sm prose-emerald max-w-none">
                  <RichTextContent value={step.completionMessage as string} compact />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    primaryLabel = isSubmitting ? "제출 중..." : "제출하고 모범답안 보기";
    primaryDisabled = !allAnswered(model, answers) || isSubmitting;
    onPrimary = () => {
      trackTrialAction("trial_simulation_submit_clicked");
      setConfirmOpen(true);
    };
    mainContent = (
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-12">
        <h2 className="text-lg font-bold text-zinc-900">제출하기</h2>
      </div>
    );
  }

  const bottomBar = (
    <div>
      {screen.kind === "question" && sidebarTabs.length > 0 && (
        <button
          type="button"
          aria-label="제공 자료 열기"
          onClick={() => {
            setDrawerOpen(true);
            trackTrialAction("trial_simulation_material_drawer_opened");
          }}
          className="flex h-6 w-full items-center justify-center border-b border-zinc-100 bg-white lg:hidden"
        >
          <span className="h-1 w-8 rounded-full bg-zinc-300" />
        </button>
      )}
      <div className="mx-auto flex w-full max-w-[1100px] items-center gap-2 px-5 py-3.5 sm:px-12">
        {screenIndex > 0 && (
          <Button variant="outline" className="rounded-xl" onClick={goPrev}>
            이전
          </Button>
        )}
        <Button
          onClick={onPrimary}
          disabled={primaryDisabled}
          size="lg"
          className="flex-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <SimulationShell
      label={topLabel}
      step={trialProgressStep(screen, model.steps.length)}
      totalSteps={model.steps.length}
      bottomBar={bottomBar}
      onHomeClick={() => trackTrialAction("trial_simulation_home_clicked")}
    >
      {mainContent}
      {sidebarTabs.length > 0 && (
        <Drawer
          open={drawerOpen}
          onOpenChange={(isOpen) => {
            setDrawerOpen(isOpen);
            if (!isOpen) trackTrialAction("trial_simulation_material_drawer_closed");
          }}
        >
          <DrawerContent className="max-h-[80dvh]">
            <DrawerHeader>
              <DrawerTitle>제공 자료</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-6">
              <MaterialTabStrip
                tabs={sidebarTabs}
                value={materialTabIndex}
                onValueChange={setMaterialTabIndex}
                onTabChange={(tabIndex, tabLabel) =>
                  trackTrialAction("trial_simulation_material_tab_selected", {
                    material_area: "drawer",
                    tab_index: tabIndex,
                    tab_label: tabLabel,
                  })
                }
              />
              <MaterialBody body={sidebarTabs[materialTabIndex]?.body ?? sidebarTabs[0]?.body ?? ""} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>답안을 제출할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              제출하면 모범답안이 공개되고, 답안은 더 이상 수정할 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSubmitting}
              onClick={() => trackTrialAction("trial_simulation_submission_cancelled")}
            >
              더 작성할게요
            </AlertDialogCancel>
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
    </SimulationShell>
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

function Shell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <main
      className={`mx-auto px-5 py-12 sm:py-16 ${narrow ? "max-w-md" : "max-w-6xl"}`}
    >
      {children}
    </main>
  );
}
