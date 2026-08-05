import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminSimulationExitSurveys,
  type AdminExitSurvey,
} from "@/lib/simulation-exit-surveys.functions";

export const Route = createFileRoute("/admin/exit-surveys")({
  head: () => ({ meta: [{ title: "Beginner - 시뮬레이션 이탈 설문" }] }),
  component: AdminExitSurveys,
});

const REASON_LABELS: Record<AdminExitSurvey["reason"], string> = {
  too_difficult: "난이도가 너무 높다",
  too_long: "글이 너무 길다",
  too_much_effort: "귀찮다",
  not_fun: "재미없다",
  other: "기타",
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AdminExitSurveys() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [surveys, setSurveys] = useState<AdminExitSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    try {
      setSurveys(await getAdminSimulationExitSurveys());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이탈 설문을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/admin/exit-surveys" } });
      return;
    }
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;
    void loadSurveys();
  }, [authLoading, user, navigate, loadSurveys]);

  const counts = useMemo(
    () =>
      surveys.reduce<Record<string, number>>((result, survey) => {
        result[survey.reason] = (result[survey.reason] ?? 0) + 1;
        return result;
      }, {}),
    [surveys],
  );

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">시뮬레이션 이탈 설문</h1>
          <p className="mt-2 text-sm text-neutral-500">
            사용자가 시뮬레이션을 중단한 이유를 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSurveys()}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 새로고침
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(REASON_LABELS).map(([reason, label]) => (
          <div key={reason} className="rounded-md border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{counts[reason] ?? 0}</p>
          </div>
        ))}
      </div>

      {authLoading || loading ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          설문을 불러오는 중입니다...
        </div>
      ) : surveys.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-neutral-300 px-5 py-16 text-center text-sm text-neutral-500">
          아직 제출된 이탈 설문이 없습니다.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">제출 시각</th>
                  <th className="px-4 py-3 font-medium">시뮬레이션</th>
                  <th className="px-4 py-3 font-medium">사용자</th>
                  <th className="px-4 py-3 font-medium">이탈 이유</th>
                  <th className="px-4 py-3 font-medium">진행 상황</th>
                  <th className="px-4 py-3 font-medium">체류 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                      {formatDateTime(survey.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {survey.simulationTitle}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{survey.applicantName}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      <p>{REASON_LABELS[survey.reason]}</p>
                      {survey.otherText && (
                        <p className="mt-1 max-w-sm whitespace-pre-wrap text-xs text-neutral-500">
                          {survey.otherText}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                      {survey.stepIndex}/{survey.totalSteps}단계 · 답변 {survey.answeredCount}개
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                      {formatDuration(survey.elapsedSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-16 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <Link to="/admin" className="text-sm font-semibold tracking-tight">
          <BrandLogo className="inline-block h-5 w-auto align-middle" />
          <span className="ml-1 text-xs font-normal text-neutral-500">Admin</span>
        </Link>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
