import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, MapPin, Star } from "lucide-react";
import { useState } from "react";

import { CoffeeChatHeader } from "@/components/CoffeeChatHeader";

export const Route = createFileRoute("/biz_/coffee-chat_/past")({
  head: () => ({
    meta: [
      { title: "지난 커피챗 — Beginner" },
      {
        name: "description",
        content: "지난 현직자 소규모 커피챗을 확인하세요.",
      },
    ],
  }),
  component: PastCoffeeChatsPage,
});

const REVIEWS = [
  "그로스 마케팅이 실제로 어떤 일을 하는지 이해할 수 있었어요.",
  "인터넷에서는 얻기 어려운 실제 실무 경험을 들을 수 있어서 좋았어요.",
  "실제 기업 내부에서 업무가 어떻게 진행되는지 들을 수 있었던 게 흥미로웠어요.",
  "밖에서 알 수 없던 내부 사정까지 들을 수 있어서 커리어 결정에 도움이 되었어요.",
  "포트폴리오를 어떻게 써야하는지 명확히 방향이 잡혔어요.",
] as const;

function PastCoffeeChatsPage() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <CoffeeChatHeader />

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <h1 className="text-3xl font-bold tracking-tight">지난 커피챗</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          현직자와 함께한 커피챗의 이야기를 확인해보세요.
        </p>

        <section className="mt-10" aria-label="지난 커피챗 목록">
          <article className="rounded-md border border-neutral-200">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              className="flex w-full items-center justify-between gap-5 p-5 text-left transition-colors hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm text-neutral-500">9/2(수) 19:00~21:00</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                  그로스 마케터와 커피챗
                </h2>
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-neutral-500">
                  <Star className="h-4 w-4 fill-neutral-900 text-neutral-900" />{" "}
                  만족도 4.75/5
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>

            {expanded && (
              <div className="border-t border-neutral-200 p-5 sm:p-6">
                <section
                  className="rounded-md border border-neutral-200 bg-neutral-50 p-4 sm:p-5"
                  aria-labelledby="host-profile-title"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src="/coffee-chats/카카오페이마케터.jpg"
                      alt="이** 님"
                      className="h-16 w-16 shrink-0 rounded-full object-cover"
                    />
                    <div>
                      <h3
                        id="host-profile-title"
                        className="text-base font-semibold tracking-tight"
                      >
                        이**
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600">
                        8년차 서비스 마케터
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <a
                          href="https://www.linkedin.com/in/%EB%8F%99%EB%AF%BC-%EC%9D%B4-882647ab?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-900"
                        >
                          LinkedIn
                        </a>
                        <a
                          href="https://notefolio.net/service/pofolchat/leedongmin"
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-900"
                        >
                          노트폴리오
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-neutral-200 pt-5">
                    <h4 className="text-sm font-semibold">경력</h4>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-600">
                      <li>쏘카 — 제로카쉐어링, 소카 부릉</li>
                      <li>
                        배민 — 배민 푸드 딜리버리 서비스(픽업 서비스, 포장),
                        배민 선물하기
                      </li>
                      <li>
                        금융 대기업 K사 — 미니게임, 현재 K페이 서비스 경험 전반
                        담당
                      </li>
                      <li>다양한 강연 및 채용 경험 보유</li>
                    </ul>
                  </div>
                </section>

                <p className="mt-6 inline-flex items-center gap-2 text-sm text-neutral-500">
                  <MapPin className="h-4 w-4" /> 장소: 강남역 부근
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <img
                    src="/coffee-chats/모임1.jpg"
                    alt="지난 그로스 마케터 커피챗 모임 현장"
                    className="aspect-[4/3] w-full rounded-md bg-neutral-100 object-cover"
                  />
                  <img
                    src="/coffee-chats/모임2.jpg"
                    alt="지난 그로스 마케터 커피챗 모임 현장"
                    className="aspect-[4/3] w-full rounded-md bg-neutral-100 object-cover"
                  />
                </div>
                <div className="mt-7">
                  <h3 className="text-sm font-semibold">후기</h3>
                  <ol className="mt-3 space-y-3 text-sm leading-6 text-neutral-600">
                    {REVIEWS.map((review) => (
                      <li key={review} className="flex gap-3">
                        <span className="font-medium text-neutral-400">•</span>
                        <span>{review}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
