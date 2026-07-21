import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, FileText } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/biz_/contact")({
  head: () => ({
    meta: [
      { title: "Beginner - 담당자 문의" },
      { name: "description", content: "Beginner 기업 서비스 문의 방법을 선택하세요." },
    ],
  }),
  component: BizContact,
});

const cardClass =
  "group flex items-start justify-between gap-4 rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50";

function BizContact() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="flex h-14 items-center border-b border-neutral-200 px-6">
        <Link to="/biz" aria-label="Beginner 기업 페이지">
          <BrandLogo className="h-5 w-auto" />
        </Link>
        <span className="ml-1 text-xs font-light text-neutral-500">biz</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-semibold tracking-tight">담당자에게 문의하기</h1>
          <p className="mt-2 text-sm text-neutral-500">
            아래에서 원하는 방법을 선택하세요.
          </p>

          <div className="mt-8 space-y-3">
            <Link to="/biz/apply" className={cardClass}>
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-neutral-900">서비스 가입 신청</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Beginner 기업 서비스 가입을 신청합니다. 확인 후 담당자가 연락드립니다.
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-900" />
            </Link>

            <Link to="/biz/coffee-chat" className={cardClass}>
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-neutral-900">커피챗 신청</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  30분 구글미트로 서비스에 대해 편하게 이야기 나눠요.
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-900" />
            </Link>
          </div>

          <Link
            to="/biz"
            className="mt-8 inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
          >
            코드 입력으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
