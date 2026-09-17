import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CoffeeChatHeader } from "@/components/CoffeeChatHeader";
import { RecruitingCoffeeChats } from "@/components/RecruitingCoffeeChats";
import { SiteFooter } from "@/components/SiteFooter";
import { submitCompanyRoleRequest } from "@/lib/inquiries.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beginner" },
      {
        name: "description",
        content:
          "Beginner는 현직자 1명과 취준생분들 4~6이 함께하는 소규모 밋업입니다.",
      },
      {
        property: "og:description",
        content:
          "Beginner는 현직자 1명과 취준생분들 4~6이 함께하는 소규모 밋업입니다.",
      },
      {
        name: "twitter:description",
        content:
          "Beginner는 현직자 1명과 취준생분들 4~6이 함께하는 소규모 밋업입니다.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [roleName, setRoleName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitRoleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedRole = roleName.trim();
    if (!requestedRole) {
      toast.error("알고 싶은 직무를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCompanyRoleRequest({
        data: { companyName: "메인페이지 직무 요청", roleName: requestedRole },
      });
      setRoleName("");
      toast.success("직무 요청을 보냈습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "요청을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="reference-home min-h-screen">
      <div className="reference-intro-surface">
        <span
          className="reference-hero-glow reference-hero-glow-one"
          aria-hidden="true"
        />
        <span
          className="reference-hero-glow reference-hero-glow-two"
          aria-hidden="true"
        />
        <span
          className="reference-hero-shape reference-hero-shape-one"
          aria-hidden="true"
        />
        <span
          className="reference-hero-shape reference-hero-shape-two"
          aria-hidden="true"
        />
        <span
          className="reference-hero-shape reference-hero-shape-three"
          aria-hidden="true"
        />
        <CoffeeChatHeader />

        <main>
          <section className="reference-hero" aria-labelledby="home-title">
            <div className="reference-shell reference-hero-copy !pt-16 !pb-[7.5rem]">
              <h1 id="home-title" className="reference-home-title">
                &quot;직무가 궁금한데 <br />
                사람 많은데는 질문하기 힘들어서 싫어&quot;
              </h1>
              <p className="reference-hero-description">
                궁금했던 직무와 취업 이야기, 현직자에게 직접 물어보세요.
              </p>
              <Link to="/biz/coffee-chat" className="reference-hero-action">
                밋업 둘러보기 <ArrowRight />
              </Link>
            </div>
          </section>
        </main>
      </div>
      <RecruitingCoffeeChats />
      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">지난 밋업</h2>
            <Link
              to="/biz/coffee-chat/past"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
            >
              전체 보기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Link
            to="/biz/coffee-chat/past"
            className="mt-7 flex items-center justify-between gap-5 rounded-md border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <div>
              <p className="text-sm text-neutral-500">9/13(일) 19:00~21:00</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">
                그로스 마케터와 2차 밋업
              </h3>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-neutral-500">
                <Star className="h-4 w-4 fill-neutral-900 text-neutral-900" />{" "}
                만족도 4.75/5
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-neutral-500" />
          </Link>
        </div>
      </section>
      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold tracking-tight">
              알고 싶은 직무가 있나요?
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              다음 밋업에서 만나고 싶은 직무를 알려주세요.
            </p>
            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={submitRoleRequest}
            >
              <label className="sr-only" htmlFor="requested-role-name">
                알고 싶은 직무
              </label>
              <input
                id="requested-role-name"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="예: 프로덕트 매니저, 데이터 분석가"
                maxLength={120}
                className="h-11 min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 shrink-0 rounded-md bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "보내는 중..." : "요청 보내기"}
              </button>
            </form>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
