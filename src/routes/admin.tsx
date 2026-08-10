import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Inbox,
  Lock,
  MessageSquareText,
  Rocket,
  SlidersHorizontal,
  UserRound,
  Wand2,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAdminUser } from "@/lib/admin";
import { ADMIN_NICKNAME, signInWithNickname } from "@/lib/nickname-auth";
import { SHOW_EXPERT_SIMULATIONS } from "@/lib/feature-flags";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Beginner - 관리자" },
      { name: "description", content: "Beginner 관리자 홈입니다." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isAdminHome = pathname.replace(/\/+$/, "") === "/admin";
  const hasAdminAccess = isAdminUser(user);

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signInWithNickname(ADMIN_NICKNAME, password);
      if (!result.admin || !isAdminUser(result.user)) {
        throw new Error("관리자 권한을 확인하지 못했습니다.");
      }
      setPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "관리자 로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-neutral-500">
        관리자 정보를 확인하는 중입니다...
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
        <section className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-neutral-900 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold text-neutral-900">관리자 접속</h1>
          <p className="mt-2 text-center text-sm text-neutral-500">
            관리자 비밀번호를 입력해주세요.
          </p>
          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">비밀번호</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder="관리자 비밀번호"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={!password || submitting}>
              {submitting ? "확인 중..." : "접속하기"}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  if (!isAdminHome) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-16 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-5 w-auto" />
          <span className="text-xs text-neutral-500">Admin</span>
        </div>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="border-b border-neutral-200 pb-6">
          <p className="text-xs font-medium text-neutral-500">관리자 홈</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">운영 관리</h1>
          <p className="mt-2 text-sm text-neutral-500">
            시뮬레이션, 제출 결과물, AI 평가 기준을 관리합니다.
          </p>
        </div>

        {hasAdminAccess && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link
              to="/admin/landing"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">랜딩페이지 관리</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    B2B 업무 의뢰 상담과 B2C 체험 주문을 구분해 확인합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/simulations"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    기업 시뮬레이션 관리
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    기업별 직무 시뮬레이션을 등록하고 관리합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            {SHOW_EXPERT_SIMULATIONS && (
              <Link
                to="/admin/expert-simulations"
                className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-neutral-900">
                      현직자 시뮬레이션 관리
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      현직자 제시 카드와 모범답안을 관리합니다.
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
                </div>
              </Link>
            )}

            <Link
              to="/admin/simulation-generator"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    JD 시뮬레이션 생성기
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    채용공고를 붙여넣어 직무 시뮬레이션 초안을 생성합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/submissions"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">제출된 답변</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    유저 결과물과 AI 대화 로그를 확인합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/ai-prompts"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    AI 프롬프트 설정
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Claude 지원자 평가 기준을 수정합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/exit-surveys"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    시뮬레이션 이탈 설문
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    사용자가 시뮬레이션을 중단한 이유와 진행 지점을 확인합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>
            <Link
              to="/admin/inquiries"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">문의·신청 관리</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    가입 신청, 커피챗 예약, 직무 요청을 한곳에서 확인합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
