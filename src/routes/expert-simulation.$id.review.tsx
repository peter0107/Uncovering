import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { RichTextContent } from "@/components/RichTextEditor";
import {
  getPublicExpertSimulationReview,
  submitPublicExpertSimulationFeedback,
  type PublicExpertSimulationReview,
} from "@/lib/expert-simulations.functions";

export const Route = createFileRoute("/expert-simulation/$id/review")({
  // reviewer는 관리자가 현직자에게 링크를 만들어줄 때 붙이는 선택값 — 이름 입력칸을
  // 미리 채워주는 용도일 뿐, 인증 경계는 여전히 token+시뮬레이션 하나뿐이다.
  validateSearch: z.object({ token: z.string().uuid(), reviewer: z.string().optional() }),
  head: () => ({ meta: [{ title: "현직자 시뮬레이션 검토 — Beginner" }] }),
  component: ExpertSimulationReviewPage,
});

function ContentBlock({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-900">{label}</h2>
      <div className="mt-2 border border-zinc-200 p-4">
        <RichTextContent value={value.trimStart()} compact className="prose prose-sm prose-zinc max-w-none" />
      </div>
    </section>
  );
}

function ExpertSimulationReviewPage() {
  const { id } = Route.useParams();
  const { token, reviewer } = Route.useSearch();
  const [simulation, setSimulation] = useState<PublicExpertSimulationReview | null>(null);
  const [reviewerName, setReviewerName] = useState(reviewer ?? "");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    void getPublicExpertSimulationReview({ data: { id, token } })
      .then(setSimulation)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "시뮬레이션을 불러오지 못했습니다."),
      )
      .finally(() => setLoading(false));
  }, [id, token]);

  const expertMeta = useMemo(
    () =>
      simulation
        ? [simulation.companyType, simulation.experienceBand, simulation.jobTitle]
            .filter(Boolean)
            .join(" · ")
        : "",
    [simulation],
  );

  const submitFeedback = async (verdict?: "approved" | "revise") => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicExpertSimulationFeedback({
        data: { id, token, reviewerName, feedback, verdict },
      });
      setSubmitted(true);
      setFeedback("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "피드백을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-4xl px-5 py-16 text-sm text-zinc-500">불러오는 중입니다.</main>;
  }

  if (!simulation || error) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 text-sm text-zinc-500">
        {error || "시뮬레이션을 불러오지 못했습니다."}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-sm font-medium text-zinc-500">{simulation.roleLabel}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{simulation.title}</h1>
        <p className="mt-3 text-sm text-zinc-600">{simulation.nickname}</p>
        {expertMeta && <p className="mt-1 text-sm text-zinc-500">{expertMeta}</p>}
        {simulation.estimatedMinutes && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-500">
            <Clock className="h-4 w-4" /> 약 {simulation.estimatedMinutes}분
          </p>
        )}
      </header>

      <div className="mt-8 space-y-8">
        {simulation.description && <p className="text-base leading-7 text-zinc-700">{simulation.description}</p>}
        {simulation.simulationFormat === "single" ? (
          <>
            <ContentBlock label="상황 안내" value={simulation.taskPrompt} />
            <ContentBlock label="답변 질문" value={simulation.singleAnswerQuestion} />
          </>
        ) : (
          <>
            <ContentBlock label="상황 안내" value={simulation.sharedSituation} />
            <ContentBlock label="제공 자료" value={simulation.sharedMaterials} />
            {simulation.steps.map((step, index) => (
              <section key={step.id || index} className="border-t border-zinc-200 pt-6">
                <h2 className="text-lg font-semibold text-zinc-900">{step.title || `${index + 1}단계`}</h2>
                <div className="mt-4 space-y-5">
                  <ContentBlock label="상황 안내" value={step.situation ?? ""} />
                  <ContentBlock label="제공 자료" value={step.materials ?? ""} />
                  {(step.prompts ?? []).map((prompt, promptIndex) => (
                    <ContentBlock
                      key={prompt.id || promptIndex}
                      label={
                        (step.prompts ?? []).length > 1
                          ? `답변 질문 ${promptIndex + 1}`
                          : "답변 질문"
                      }
                      value={prompt.body ?? ""}
                    />
                  ))}
                  <ContentBlock label="힌트" value={step.hint ?? ""} />
                  <ContentBlock label="모범답안" value={step.modelAnswer ?? ""} />
                </div>
              </section>
            ))}
          </>
        )}

        <ContentBlock
          label={simulation.steps.length > 0 ? "모범답안 총평" : "모범답안"}
          value={simulation.modelAnswer}
        />

        <section className="border-t border-zinc-200 pt-6">
          <h2 className="text-sm font-semibold text-zinc-900">검수 의견</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {simulation.isTrial
              ? "승인하시면 이 과제를 결제자에게 발송합니다. 고쳐야 할 부분이 있다면 '수정 필요'로 남겨주세요."
              : "이 시뮬레이션에 대한 의견을 남겨주세요."}
          </p>
          <div className="mt-4 grid gap-3">
            <input
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              maxLength={80}
              placeholder="이름"
              className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
            />
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value.slice(0, 5000))}
              maxLength={5000}
              placeholder="현실성, 난이도, 제공 자료의 충분함, 모범답안의 타당성을 봐주세요."
              className="min-h-40 resize-y rounded-md border border-zinc-300 p-3 text-sm leading-6 outline-none focus:border-zinc-900"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-zinc-400">{feedback.length.toLocaleString()} / 5,000자</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitFeedback("revise")}
                  disabled={submitting || !feedback.trim()}
                  className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  수정 필요
                </button>
                <button
                  type="button"
                  onClick={() => void submitFeedback("approved")}
                  disabled={submitting || !feedback.trim()}
                  className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "저장 중..." : "승인"}
                </button>
              </div>
            </div>
            {submitted && <p className="text-sm text-zinc-600">검수 의견을 보냈습니다. 감사합니다.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
