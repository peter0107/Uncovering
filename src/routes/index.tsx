import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, FileEdit, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "언커버링 - 실제 업무로 나에게 맞는 회사 찾기" },
      {
        name: "description",
        content:
          "관심 직무의 실제 업무 시뮬레이션을 체험하고, 답안을 기업에 전송해 발견되어보세요.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    icon: FileEdit,
    title: "관심 직무·기업 등록",
    desc: "학력, 관심 직무, 관심 기업, 근무 선호를 알려주세요.",
  },
  {
    icon: Sparkles,
    title: "맞춤 시뮬레이션 수행",
    desc: "실제 업무 기반 과제를 직접 수행하고 답안을 작성해요.",
  },
  {
    icon: Compass,
    title: "기업에게 발견되기",
    desc: "동의하면 답안이 기업에 전달되고, 관심 있는 기업이 먼저 연락할 수 있어요.",
  },
];

function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hasOnboarding, setHasOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasOnboarding(null);
      return;
    }
    supabase
      .from("job_seekers")
      .select("job_interests")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasOnboarding(!!(data?.job_interests && data.job_interests.length > 0));
      });
  }, [user]);

  const handleStart = async () => {
    if (authLoading) return;
    if (!user) {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/onboarding`,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error("Google 로그인에 실패했습니다.");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/onboarding" });
      return;
    }
    navigate({ to: hasOnboarding ? "/simulations" : "/onboarding" });
  };

  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500">
          <Sparkles className="h-3.5 w-3.5" />
          현업 기반 직무 시뮬레이션
        </span>
        <h1 className="mt-6 text-3xl font-bold leading-tight text-zinc-900 sm:text-5xl">
          나에게 맞는 직무,
          <br />
          직접 경험하고 확인하세요
        </h1>
        <p className="mt-5 text-base leading-relaxed text-zinc-500 sm:text-lg">
          실제 업무 상황을 바탕으로 구성된 시뮬레이션을 통해
          <br className="hidden sm:block" />
          업무 역량과 직무 적합도를 확인할 수 있어요.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={handleStart}
            className="rounded-xl bg-zinc-900 px-8 text-white hover:bg-zinc-700"
          >
            시작하기
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                {i + 1}
              </div>
              <step.icon className="mt-4 h-6 w-6 text-zinc-400" />
              <h3 className="mt-3 font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            지금 관심 직무와 기업을 등록하면
          </h2>
          <p className="mt-2 text-sm text-zinc-500 sm:text-base">
            나에게 맞는 시뮬레이션 3개를 바로 추천해드려요.
          </p>
          <div className="mt-6 flex justify-center">
            {user ? (
              <Link to={hasOnboarding ? "/simulations" : "/onboarding"}>
                <Button className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700">
                  {hasOnboarding ? "추천 시뮬레이션 보기" : "온보딩 시작하기"}
                </Button>
              </Link>
            ) : (
              <Link to="/login" search={{ redirect: "/onboarding" }}>
                <Button className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700">
                  로그인하고 시작하기
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
