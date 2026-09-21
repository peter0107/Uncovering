import { createFileRoute } from "@tanstack/react-router";

import { CoffeeChatHeader } from "@/components/CoffeeChatHeader";
import { RecruitingCoffeeChats } from "@/components/RecruitingCoffeeChats";

export const Route = createFileRoute("/biz_/coffee-chat")({
  head: () => ({
    meta: [
      { title: "소규모 밋업 — Beginner" },
      {
        name: "description",
        content: "현직자와 함께하는 모집 중인 소규모 밋업을 확인하세요.",
      },
    ],
  }),
  component: CoffeeChatPage,
});

function CoffeeChatPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <CoffeeChatHeader />
      <main>
        <RecruitingCoffeeChats
          headingClassName="text-3xl font-bold tracking-tight"
          showOpenChatAlertLink
        />
      </main>
    </div>
  );
}
