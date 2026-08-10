import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Beginner" },
      { name: "application-name", content: "Beginner" },
      { property: "og:title", content: "Beginner" },
      { name: "twitter:title", content: "Beginner" },
      {
        name: "description",
        content:
          "Beginner는 취업준비생이 실제 업무 과제를 경험하며 직무 적합성과 실무 역량을 확인하는 직무 시뮬레이션 서비스입니다.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-950 sm:py-24">
      <article className="mx-auto max-w-3xl">
        <BrandLogo className="h-8 w-auto" />

        <header className="mt-16 border-b border-zinc-200 pb-12">
          <p className="text-sm font-semibold text-blue-600">직무 시뮬레이션 서비스</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Beginner</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            취업준비생이 관심 직무의 실제 업무 과제를 직접 수행하며 직무 적합성과
            실무 역량을 확인할 수 있도록 돕습니다.
          </p>
        </header>

        <section className="py-12" aria-labelledby="about-functionality">
          <h2 id="about-functionality" className="text-xl font-semibold">
            무엇을 할 수 있나요?
          </h2>
          <ul className="mt-6 space-y-3 text-[15px] leading-7 text-zinc-600">
            <li>관심 직무와 관련된 실제 업무 형태의 과제를 수행할 수 있습니다.</li>
            <li>작성한 결과물을 확인하고 직무 경험과 실무 역량을 쌓을 수 있습니다.</li>
            <li>Google 계정 정보는 회원가입과 로그인, 계정 식별에 사용됩니다.</li>
          </ul>
        </section>

        <footer className="flex flex-wrap gap-x-6 gap-y-3 border-t border-zinc-200 pt-8 text-sm text-zinc-500">
          <Link to="/privacy" className="hover:text-zinc-950">
            개인정보처리방침
          </Link>
          <Link to="/terms" className="hover:text-zinc-950">
            이용약관
          </Link>
          <div className="flex flex-col gap-1">
            <span>© 2026 Beginner. All rights reserved.</span>
            <a href="mailto:info@beginner.today" className="hover:text-zinc-950">
              Contact: info@beginner.today
            </a>
          </div>
        </footer>
      </article>
    </main>
  );
}
