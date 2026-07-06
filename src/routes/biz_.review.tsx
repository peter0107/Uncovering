import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  getApplicantsByCompanyCode,
  type Applicant,
  type CompanyApplicants,
} from "@/lib/applicants.functions";

const searchSchema = z.object({
  code: z.string().catch(""),
});

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

type ApplicantFilter = "all" | "saved";
type SortMode = "recent" | "name";

function BizReview() {
  const { code } = Route.useSearch();
  const [data, setData] = useState<CompanyApplicants | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [applicantFilter, setApplicantFilter] = useState<ApplicantFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

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

  const roles = useMemo(() => {
    const roleSet = new Set(data?.applicants.map((applicant) => applicant.role) ?? []);
    return Array.from(roleSet);
  }, [data]);

  const filteredApplicants = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    return [...(data?.applicants ?? [])]
      .filter((applicant) => {
        if (roleFilter !== "all" && applicant.role !== roleFilter) return false;
        if (applicantFilter === "saved" && !savedIds.has(applicant.id)) return false;
        if (!loweredQuery) return true;

        return [applicant.name, applicant.role, applicant.email]
          .join(" ")
          .toLowerCase()
          .includes(loweredQuery);
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name, "ko");
        return b.submittedAt.localeCompare(a.submittedAt);
      });
  }, [applicantFilter, data, query, roleFilter, savedIds, sortMode]);

  const selectedApplicant = useMemo(() => {
    const applicants = data?.applicants ?? [];
    return (
      applicants.find((applicant) => applicant.id === selectedId) ?? filteredApplicants[0] ?? null
    );
  }, [data, filteredApplicants, selectedId]);

  function toggleSaved(id: string) {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
    <div className="min-h-screen bg-white text-neutral-900 lg:grid lg:grid-cols-[420px_1fr]">
      <aside className="border-b border-neutral-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold tracking-tight">시뮬레이션 수행자</h1>
            <span className="text-sm font-semibold text-neutral-500">
              {data.applicants.length}명
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">직무 선택</span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold outline-none focus:border-neutral-900"
              >
                <option value="all">전체 직무</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 translate-y-[-50%] text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름, 직무, 이메일 검색"
                className="h-11 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900"
              />
            </label>

            <div className="grid h-11 grid-cols-2 rounded-md border border-neutral-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setApplicantFilter("all")}
                className={`rounded text-sm font-semibold ${
                  applicantFilter === "all"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setApplicantFilter("saved")}
                className={`rounded text-sm font-semibold ${
                  applicantFilter === "saved"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                관심 지원자
              </button>
            </div>

            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold outline-none focus:border-neutral-900"
            >
              <option value="recent">최신 제출순</option>
              <option value="name">이름순</option>
            </select>
          </div>
        </div>

        <div className="max-h-[42vh] overflow-y-auto border-t border-neutral-200 lg:max-h-[calc(100vh-309px)]">
          {filteredApplicants.map((applicant) => (
            <div
              key={applicant.id}
              className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b border-neutral-100 transition-colors ${
                selectedApplicant?.id === applicant.id ? "bg-neutral-50" : "hover:bg-neutral-50"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(applicant.id)}
                className="min-w-0 px-4 py-4 text-left"
              >
                <span className="block text-base font-bold text-neutral-900">{applicant.name}</span>
                <span className="mt-1 block text-sm font-semibold text-neutral-600">
                  {applicant.role}
                </span>
                <span className="mt-3 block text-xs font-medium text-neutral-500">
                  경력 {applicant.experience}
                  <span className="mx-2 text-neutral-300">·</span>
                  {getShortSubmittedAt(applicant.submittedAt)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggleSaved(applicant.id)}
                aria-label="관심 지원자 저장"
                aria-pressed={savedIds.has(applicant.id)}
                className="mr-4 mt-5 grid h-8 w-8 place-items-center rounded-md text-neutral-400 hover:bg-white hover:text-neutral-900"
              >
                <Bookmark
                  className={`h-5 w-5 ${
                    savedIds.has(applicant.id) ? "fill-neutral-900 text-neutral-900" : ""
                  }`}
                />
              </button>
            </div>
          ))}

          {filteredApplicants.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-neutral-500">
              조건에 맞는 지원자가 없습니다.
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 px-6 py-6 lg:px-7">
        {selectedApplicant ? (
          <ApplicantDetail applicant={selectedApplicant} roleLabel={data.company.roleLabel} />
        ) : (
          <div className="rounded-md border border-neutral-200 p-8 text-sm text-neutral-500">
            검토할 지원자를 선택하세요.
          </div>
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

function ApplicantDetail({ applicant, roleLabel }: { applicant: Applicant; roleLabel: string }) {
  const [isMailOpen, setIsMailOpen] = useState(false);

  return (
    <div>
      <section className="grid gap-7 border-b border-neutral-200 pb-7 xl:grid-cols-[174px_1fr]">
        <div className="flex flex-col gap-6">
          <div className="grid aspect-square w-44 max-w-full place-items-center rounded-md border border-neutral-200 bg-neutral-50 text-4xl font-bold text-neutral-500">
            {getInitials(applicant.name)}
          </div>
          <button
            type="button"
            onClick={() => setIsMailOpen(true)}
            className="h-11 w-fit rounded-md bg-neutral-900 px-5 text-sm font-bold text-white hover:bg-neutral-800"
          >
            면접 제안
          </button>
        </div>

        <div className="min-w-0">
          <div className="grid gap-7 xl:grid-cols-[1fr_1fr_1fr]">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900">
                {applicant.name}
              </h2>
              <p className="mt-5 text-base font-semibold text-neutral-800">{applicant.headline}</p>
            </div>

            <dl className="grid gap-5 text-sm md:grid-cols-2 xl:col-span-2">
              <Field label="이메일" value={applicant.email} />
              <Field label="연락처" value={applicant.phone} />
              <Field label="경력" value={applicant.experience} />
              <Field label="위치" value={applicant.location} />
              <Field label="지원 포지션" value={roleLabel || applicant.role} />
              <Field label="제출 일시" value={applicant.submittedAt} />
            </dl>
          </div>
        </div>
      </section>

      <div className="grid gap-7 py-8 xl:grid-cols-[0.82fr_1fr]">
        <section>
          <h3 className="text-2xl font-extrabold tracking-tight">이력서 / 포트폴리오</h3>
          <div className="mt-6 space-y-4">
            <InfoBlock title="구직조건">
              <dl className="grid gap-5 text-sm md:grid-cols-3">
                <Field label="희망 연봉" value="5,000만원 협의 가능" />
                <Field label="희망 지역" value={normalizeLocation(applicant.location)} />
                <Field label="근무 형태" value="정규직, 하이브리드" />
              </dl>
            </InfoBlock>

            <InfoBlock title="학력">
              <p className="text-base font-semibold text-neutral-800">{applicant.education}</p>
            </InfoBlock>

            <InfoBlock title="경력">
              <p className="text-base font-semibold text-neutral-800">
                {applicant.recentJob}
                <span className="ml-3 rounded bg-blue-50 px-2 py-1 text-sm font-bold text-blue-600">
                  {applicant.experience}
                </span>
              </p>
            </InfoBlock>

            <InfoBlock title="스킬 / 툴">
              <ChipList items={[...applicant.skills, ...applicant.tools]} />
            </InfoBlock>

            <InfoBlock title="포트폴리오">
              <div className="grid gap-3 md:grid-cols-3">
                {applicant.portfolio.map((item) => (
                  <a
                    key={item.title}
                    href={item.url}
                    className="block min-h-20 rounded-md border border-neutral-200 p-4 text-sm hover:bg-neutral-50"
                  >
                    <div className="font-bold text-neutral-900">{item.title}</div>
                    <div className="mt-3 text-sm font-medium text-neutral-500">
                      업데이트 {item.updatedAt}
                    </div>
                  </a>
                ))}
              </div>
            </InfoBlock>
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-extrabold tracking-tight">제출 정보</h3>
          <div className="mt-6 space-y-5">
            <InfoBlock>
              <dl className="grid gap-5 text-sm md:grid-cols-2">
                <Field label="제출 일시" value={applicant.submittedAt} />
                <Field label="소요 시간" value={applicant.duration} />
              </dl>
            </InfoBlock>

            <InfoBlock title="직무 시뮬레이션 제출 내용">
              <ol className="space-y-8">
                {applicant.simulation.map((step) => (
                  <li key={step.step} className="grid grid-cols-[36px_1fr] gap-4">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                      {step.step}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-neutral-900">{step.title}</h4>
                      <p className="mt-3 whitespace-pre-line text-base leading-8 text-neutral-700">
                        {step.answer}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </InfoBlock>
          </div>
        </section>
      </div>

      {isMailOpen && (
        <InterviewMailDialog applicant={applicant} onClose={() => setIsMailOpen(false)} />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-sm font-semibold text-neutral-500">{label}</dt>
      <dd className="mt-1 break-keep text-base font-bold leading-6 text-neutral-900">{value}</dd>
    </div>
  );
}

function InfoBlock({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-neutral-200 p-5">
      {title && <h4 className="text-lg font-extrabold text-neutral-900">{title}</h4>}
      <div className={title ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-neutral-100 px-2.5 py-1.5 text-sm font-bold text-neutral-700"
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

function getInitials(name: string): string {
  return name.slice(0, 2);
}

function getShortSubmittedAt(submittedAt: string): string {
  return submittedAt.replace(/^\d{4}-/, "");
}

function normalizeLocation(location: string): string {
  if (location.includes("강남")) return "서울, 강남구";
  if (location.includes("마포")) return "서울, 마포구";
  if (location.includes("송파")) return "서울, 송파구";
  if (location.includes("용산")) return "서울, 용산구";
  if (location.includes("성남")) return "경기, 성남시";
  return location;
}
