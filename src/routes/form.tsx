import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useState, type FormEvent } from "react";

import { submitAdsRequest } from "@/lib/ads.functions";

export const Route = createFileRoute("/form")({
  head: () => ({
    meta: [
      { title: "관심 직무를 직접 해보세요 | Beginner" },
      {
        name: "description",
        content: "관심 있는 직무를 알려주시면 채용 공고를 바탕으로 직무 시뮬레이션을 만들어드립니다.",
      },
    ],
  }),
  component: AdsPage,
});

function AdsPage() {
  const [jobRole, setJobRole] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await submitAdsRequest({
        data: {
          jobRole: jobRole.trim(),
          email: email.trim(),
          companyName: companyName.trim(),
          website,
        },
      });
      setIsSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "제출하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[72.5rem] px-5 py-16 sm:px-12 sm:py-24">
      <div className="mx-auto max-w-[32rem]">
        {isSubmitted ? (
          <div aria-live="polite" className="py-16 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#1659e3] text-white">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.035em] text-[#1a2340]">
              요청이 접수되었습니다
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#667085]">
              시뮬레이션이 완성되면 입력하신 이메일로 링크를 보내드릴게요.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-[#e5e9f0] pb-8">
              <h1 className="text-[2rem] font-extrabold leading-[1.2] tracking-[-0.045em] text-[#1a2340] sm:text-[2.5rem]">
                관심 직무를 직접 해보세요
              </h1>
              <p className="mt-4 text-[0.9375rem] leading-7 text-[#667085] [word-break:keep-all]">
                <span className="block">알고 싶은 직무를 적어주세요.</span>
                <span className="block">
                  채용 공고를 바탕으로 해당 직무 시뮬레이션을 만들어드립니다.
                </span>
                <span className="block">완성되면 이메일로 해당 링크 보내드립니다.</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="job-role" className="text-sm font-bold text-[#1a2340]">
                  알고 싶은 직무 <span className="text-[#1659e3]">*</span>
                </label>
                <input
                  id="job-role"
                  name="jobRole"
                  type="text"
                  required
                  maxLength={100}
                  autoComplete="organization-title"
                  value={jobRole}
                  onChange={(event) => setJobRole(event.target.value)}
                  placeholder="예: 브랜드 마케터"
                  className="mt-2 h-12 w-full rounded-lg border border-[#d9dee8] bg-white px-4 text-[0.9375rem] text-[#1a2340] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1659e3] focus:ring-2 focus:ring-[#1659e3]/15"
                />
              </div>

              <div>
                <label htmlFor="company-name" className="text-sm font-bold text-[#1a2340]">
                  알고 싶은 기업 <span className="font-medium text-[#98a2b3]">(선택)</span>
                </label>
                <input
                  id="company-name"
                  name="companyName"
                  type="text"
                  maxLength={100}
                  autoComplete="organization"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="예: 토스"
                  className="mt-2 h-12 w-full rounded-lg border border-[#d9dee8] bg-white px-4 text-[0.9375rem] text-[#1a2340] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1659e3] focus:ring-2 focus:ring-[#1659e3]/15"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-bold text-[#1a2340]">
                  이메일 <span className="text-[#1659e3]">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 h-12 w-full rounded-lg border border-[#d9dee8] bg-white px-4 text-[0.9375rem] text-[#1a2340] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1659e3] focus:ring-2 focus:ring-[#1659e3]/15"
                />
              </div>

              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">웹사이트</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#1659e3] text-sm font-bold text-white transition-colors hover:bg-[#0f49c5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "제출 중..." : "제출"}
              </button>
            </form>

            <aside className="mt-12 border-t border-[#e5e9f0] pt-8">
              <p className="text-xs font-bold tracking-[0.08em] text-[#667085]">
                베타 오픈 직무
              </p>
              <h2 className="mt-3 text-xl font-extrabold tracking-[-0.03em] text-[#1a2340]">
                지금 체험할 수 있는 직무를 확인해보세요
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Beginner 홈페이지에서 현재 베타로 공개된 직무 시뮬레이션을 바로 체험할 수
                있습니다.
              </p>
              <Link
                to="/simulations"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d9dee8] bg-white px-4 text-sm font-bold text-[#1a2340] transition-colors hover:border-[#1659e3] hover:text-[#1659e3]"
              >
                베타 직무 보러가기
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </aside>
          </>
        )}
      </div>
    </section>
  );
}
