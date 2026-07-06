import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  getApplicantsByCompanyCode,
  type Applicant,
  type CompanyApplicants,
  type Status,
} from "@/lib/applicants.functions";

const searchSchema = z.object({
  code: z.string().catch(""),
});

const STATUS_LABEL: Record<Status, string> = {
  submitted: "신규 제출",
  in_review: "검토 중",
  completed: "검토 완료",
};

export const Route = createFileRoute("/biz_/review")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Beginner - 지원자 검토" },
      { name: "description", content: "기업 코드로 제출된 지원자 시뮬레이션을 검토하세요." },
    ],
  }),
  component: BizReview,
});

function BizReview() {
  const { code } = Route.useSearch();
  const [data, setData] = useState<CompanyApplicants | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadApplicants() {
      if (!code) {
        setError("기업 코드가 없습니다.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await getApplicantsByCompanyCode({ data: { code } });
        if (!alive) return;
        setData(result);
        setSelectedId(result.applicants[0]?.id ?? null);
      } catch {
        if (!alive) return;
        setError("지원자 정보를 불러오지 못했습니다.");
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    void loadApplicants();
    return () => {
      alive = false;
    };
  }, [code]);

  const selectedApplicant = useMemo(
    () => data?.applicants.find((applicant) => applicant.id === selectedId) ?? null,
    [data, selectedId],
  );

  if (isLoading) {
    return <BizShell>지원자 정보를 불러오는 중입니다...</BizShell>;
  }

  if (error || !data) {
    return (
      <BizShell>
        <div className="mx-auto max-w-sm text-center">
          <h1 className="text-lg font-semibold text-neutral-900">입장할 수 없습니다</h1>
          <p className="mt-2 text-sm text-neutral-500">{error}</p>
          <Link
            to="/biz"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white"
          >
            코드 다시 입력
          </Link>
        </div>
      </BizShell>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 px-6">
        <div>
          <span className="text-sm font-semibold tracking-tight">Beginner</span>
          <span className="ml-2 text-xs text-neutral-500">for Business</span>
        </div>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          코드 변경
        </Link>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[360px_1fr]">
        <aside>
          <p className="text-xs font-medium text-neutral-500">{data.company.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.company.roleLabel}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            총 {data.applicants.length}명의 제출자가 있습니다.
          </p>

          <div className="mt-6 space-y-2">
            {data.applicants.map((applicant) => (
              <button
                key={applicant.id}
                type="button"
                onClick={() => setSelectedId(applicant.id)}
                className={`w-full rounded-md border p-4 text-left transition-colors ${
                  applicant.id === selectedId
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-neutral-900">{applicant.name}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {applicant.role} · {applicant.experience}
                    </div>
                  </div>
                  <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                    {STATUS_LABEL[applicant.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {selectedApplicant ? (
          <ApplicantDetail applicant={selectedApplicant} />
        ) : (
          <section className="rounded-md border border-neutral-200 p-8 text-sm text-neutral-500">
            검토할 지원자를 선택하세요.
          </section>
        )}
      </main>
    </div>
  );
}

function BizShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="flex h-14 items-center border-b border-neutral-200 px-6">
        <span className="text-sm font-semibold tracking-tight">Beginner</span>
        <span className="ml-2 text-xs text-neutral-500">for Business</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 text-sm text-neutral-500">
        {children}
      </main>
    </div>
  );
}

function ApplicantDetail({ applicant }: { applicant: Applicant }) {
  const [isMailOpen, setIsMailOpen] = useState(false);

  return (
    <section className="rounded-md border border-neutral-200">
      <div className="border-b border-neutral-200 p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm text-neutral-500">{applicant.headline}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{applicant.name}</h2>
            <p className="mt-2 text-sm text-neutral-600">
              {applicant.role} · {applicant.experience}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMailOpen(true)}
            className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
          >
            면접 제안 메일
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <InfoBlock title="기본 정보">
            <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
              <Field label="이메일" value={applicant.email} />
              <Field label="전화번호" value={applicant.phone} />
              <Field label="지역" value={applicant.location} />
              <Field label="제출 일시" value={applicant.submittedAt} />
              <Field label="학력" value={applicant.education} />
              <Field label="최근 경력" value={applicant.recentJob} />
            </dl>
          </InfoBlock>

          <InfoBlock title="직무 시뮬레이션 제출 내용">
            <ol className="space-y-6">
              {applicant.simulation.map((step) => (
                <li key={step.step} className="grid grid-cols-[32px_1fr] gap-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">{step.title}</h4>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                      {step.answer}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </InfoBlock>
        </div>

        <div className="space-y-4">
          <InfoBlock title="스킬 / 툴">
            <ChipList items={[...applicant.skills, ...applicant.tools]} />
          </InfoBlock>

          <InfoBlock title="포트폴리오">
            <div className="grid gap-3">
              {applicant.portfolio.map((item) => (
                <a
                  key={item.title}
                  href={item.url}
                  className="block rounded-md border border-neutral-200 p-3 text-sm hover:bg-neutral-50"
                >
                  <div className="font-medium text-neutral-900">{item.title}</div>
                  <div className="mt-2 text-xs text-neutral-500">업데이트 {item.updatedAt}</div>
                </a>
              ))}
            </div>
          </InfoBlock>

          <InfoBlock title="제출 정보">
            <dl className="space-y-3 text-sm">
              <Field label="제출 일시" value={applicant.submittedAt} />
              <Field label="소요 시간" value={applicant.duration} />
            </dl>
          </InfoBlock>
        </div>
      </div>

      {isMailOpen && (
        <InterviewMailDialog applicant={applicant} onClose={() => setIsMailOpen(false)} />
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-900">{value}</dd>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function InterviewMailDialog({
  applicant,
  onClose,
}: {
  applicant: Applicant;
  onClose: () => void;
}) {
  const subject = `[Beginner] ${applicant.name}님 면접 일정 안내`;
  const body = `${applicant.name}님, 안녕하세요.\n\nBeginner를 통해 제출해주신 ${applicant.role} 실무 시뮬레이션 결과를 검토한 뒤 면접을 제안드리고자 연락드립니다.\n\n가능하신 일정 2~3개를 회신해주시면 확인 후 면접 일정을 확정해드리겠습니다.\n\n감사합니다.`;

  function copyTemplate() {
    void navigator.clipboard?.writeText(`제목: ${subject}\n\n${body}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-md bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">면접 제안 메일 템플릿</h3>
            <p className="mt-1 text-sm text-neutral-500">{applicant.email}</p>
          </div>
          <button onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-900">
            닫기
          </button>
        </div>

        <label className="mt-5 block text-xs font-medium text-neutral-600">제목</label>
        <input
          readOnly
          value={subject}
          className="mt-2 h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm"
        />

        <label className="mt-4 block text-xs font-medium text-neutral-600">본문</label>
        <textarea
          readOnly
          value={body}
          className="mt-2 h-56 w-full resize-none rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm leading-relaxed"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
          >
            취소
          </button>
          <button
            onClick={copyTemplate}
            className="h-9 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800"
          >
            템플릿 복사
          </button>
        </div>
      </div>
    </div>
  );
}
