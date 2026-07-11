import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BotMessageSquare, FileText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { getAdminSubmissionAnswers, type AdminSubmissionAnswer } from "@/lib/simulations.functions";

export const Route = createFileRoute("/admin/submissions")({
  head: () => ({
    meta: [
      { title: "Beginner - 제출된 답변" },
      { name: "description", content: "유저의 제출 결과물과 AI 대화 로그를 확인합니다." },
    ],
  }),
  component: AdminSubmissions,
});

function AdminSubmissions() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<AdminSubmissionAnswer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  const selected = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? submissions[0] ?? null,
    [submissions, selectedId],
  );

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminSubmissionAnswers();
      setSubmissions(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "제출 답변을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/submissions" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void loadSubmissions();
  }, [authLoading, userId, navigate, loadSubmissions]);

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">제출된 답변</h1>
          <p className="mt-2 text-sm text-neutral-500">유저 결과물과 AI 대화 로그를 확인합니다.</p>
        </div>
        <button
          type="button"
          onClick={loadSubmissions}
          disabled={isLoading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      {authLoading || isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          제출 답변을 불러오는 중입니다...
        </div>
      ) : submissions.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-neutral-300 px-5 py-16 text-center text-sm text-neutral-500">
          아직 제출된 답변이 없습니다.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-md border border-neutral-200">
            <div className="border-b border-neutral-200 px-4 py-3">
              <p className="text-sm font-semibold">제출 목록</p>
              <p className="mt-1 text-xs text-neutral-500">총 {submissions.length}건</p>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto p-2">
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setSelectedId(submission.id)}
                  className={`w-full rounded-md px-3 py-3 text-left transition-colors ${
                    selected?.id === submission.id
                      ? "bg-neutral-900 text-white"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">{submission.applicantName}</p>
                  <p
                    className={`mt-1 truncate text-xs ${selected?.id === submission.id ? "text-neutral-300" : "text-neutral-500"}`}
                  >
                    {submission.companyName} · {submission.roleLabel}
                  </p>
                  <p
                    className={`mt-2 text-xs ${selected?.id === submission.id ? "text-neutral-400" : "text-neutral-400"}`}
                  >
                    {submission.submittedAt}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          {selected && <SubmissionDetail submission={selected} />}
        </div>
      )}
    </AdminShell>
  );
}

function SubmissionDetail({ submission }: { submission: AdminSubmissionAnswer }) {
  const duration = submission.durationSeconds
    ? `${Math.max(1, Math.round(submission.durationSeconds / 60))}분`
    : "-";

  return (
    <section className="min-w-0 rounded-md border border-neutral-200">
      <div className="border-b border-neutral-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              {submission.companyName} · {submission.companyCode}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {submission.applicantName}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              {submission.applicantEmail || "이메일 미입력"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${submission.isSharedWithCompany ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
          >
            {submission.isSharedWithCompany ? "기업 공유" : "개인 제출"}
          </span>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500">직무</dt>
            <dd className="mt-1 font-medium">{submission.roleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">시뮬레이션</dt>
            <dd className="mt-1 font-medium">{submission.simulationTitle}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">제출 / 소요 시간</dt>
            <dd className="mt-1 font-medium">
              {submission.submittedAt} · {duration}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-2">
        <section>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">결과물</h3>
          </div>
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            {submission.responseAnswers.length > 0 ? (
              <div className="space-y-5">
                {submission.responseAnswers.map((answer, index) => (
                  <div key={`${answer.id}-${index}`}>
                    <p className="text-sm font-semibold">{answer.label}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                      {answer.answer || "답변 없음"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                {submission.responseText || "답변 없음"}
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <BotMessageSquare className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">AI 대화 로그</h3>
          </div>
          <div className="mt-3 max-h-[560px] space-y-3 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-4">
            {submission.aiChatLog.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">
                기록된 AI 대화가 없습니다.
              </p>
            ) : (
              submission.aiChatLog.map((message, index) => (
                <div
                  key={`${message.at}-${index}`}
                  className={`rounded-md p-3 ${message.role === "assistant" ? "bg-white" : "bg-neutral-200"}`}
                >
                  <p className="text-xs font-medium text-neutral-500">
                    {message.role === "assistant" ? "AI" : "유저"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                    {message.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <Link to="/admin" className="text-sm font-semibold tracking-tight">
          Beginner <span className="ml-1 text-xs font-normal text-neutral-500">Admin</span>
        </Link>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
