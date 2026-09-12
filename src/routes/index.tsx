import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";

import { CoffeeChatHeader } from "@/components/CoffeeChatHeader";
import { RecruitingCoffeeChats } from "@/components/RecruitingCoffeeChats";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beginner" },
      {
        name: "description",
        content:
          "Beginner는 현직자 1명과 취준생분들 4~6이 함께하는 소규모 커피챗 모임입니다.",
      },
      {
        property: "og:description",
        content:
          "Beginner는 현직자 1명과 취준생분들 4~6이 함께하는 소규모 커피챗 모임입니다.",
      },
      {
        name: "twitter:description",
        content:
          "Beginner는 현직자 1명과 취준생분들 4~6이 함께하는 소규모 커피챗 모임입니다.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
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
                커피챗 둘러보기 <ArrowRight />
              </Link>
            </div>
          </section>
        </main>
      </div>
      <RecruitingCoffeeChats />
      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">
              지난 커피챗
            </h2>
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
              <p className="text-sm text-neutral-500">9/2(수) 19:00~21:00</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">
                그로스 마케터와 커피챗
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
      <SiteFooter />
    </div>
  );
}
