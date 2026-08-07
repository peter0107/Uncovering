import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/hooks/use-auth";
import { assignTrialSimulation } from "@/lib/landing.functions";
import { BrandLogo } from "@/components/BrandLogo";
import { RichTextContent } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";
import type {
  GenerateSimulationStreamPayload,
  GeneratedSimulationDraft,
  WebResearchCategory,
} from "@/lib/simulation-generator.functions";
import {
  createCompanySimulation,
  getAdminCompanies,
  resolveGeneratedCompany,
  type AdminCompany,
} from "@/lib/simulations.functions";

export const Route = createFileRoute("/admin/simulation-generator")({
  // order가 있으면 체험 주문 전용 과제를 만드는 모드다 (admin/landing에서 진입).
  // 기존 진입점(/admin 링크)은 파라미터 없이 들어오므로 전부 optional이어야 한다.
  validateSearch: z.object({
    order: z.string().optional(),
    jobRole: z.string().optional(),
    companyType: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Beginner - JD 시뮬레이션 생성기" },
      { name: "description", content: "채용공고에서 직무 시뮬레이션 초안을 생성합니다." },
    ],
  }),
  component: AdminSimulationGenerator,
});

const PLATFORMS = [
  "잡코리아",
  "사람인",
  "리멤버",
  "인크루트",
  "원티드",
  "잡플래닛",
  "기업 채용페이지",
  "기타",
] as const;

type SourceInput = { platform: string; jd: string };

const webResearchCategoryLabels: Record<WebResearchCategory, string> = {
  business: "실제 사업",
  product: "주요 서비스·제품",
  customer: "고객",
  recent_issue: "최근 공개 이슈",
  other: "기타 확인 사실",
};

function createSource(platform: string = PLATFORMS[0]): SourceInput {
  return { platform, jd: "" };
}

type GenerateRequestBody = {
  companyName: string;
  roleName: string;
  domain: string;
  sources: SourceInput[];
  note: string;
};

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;
  // 생성이 수 분 걸릴 수 있어, 만료 직전이면 먼저 갱신합니다.
  if (session?.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 120) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session) session = refreshed.session;
  }
  const token = session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다.");
  return token;
}

// 서버가 하트비트(": ping")를 흘리는 동안 연결을 유지하다가, 완료 시 단 한 번
// "data: {...}" 프레임을 받습니다. 폴링도 작업 큐도 없습니다.
async function requestGeneration(body: GenerateRequestBody): Promise<GeneratedSimulationDraft> {
  const response = await fetch("/api/generate-simulation", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await getAccessToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    throw new Error("생성 요청을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let payload: GenerateSimulationStreamPayload | null = null;

  try {
    while (!payload) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (frame.startsWith("data: ")) {
          payload = JSON.parse(frame.slice(6)) as GenerateSimulationStreamPayload;
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  if (!payload) throw new Error("생성 응답이 중간에 끊겼어요. 다시 시도해주세요.");
  if (!payload.ok) throw new Error(payload.message || "AI 생성에 실패했어요.");
  return payload.draft;
}

function buildRationaleMarkdown(draft: GeneratedSimulationDraft): string {
  const lines: string[] = [];
  lines.push(`# ${draft.simulation.title} — 생성 근거`);
  lines.push("");
  if (draft.rationale.webResearchFacts.length > 0) {
    lines.push("## 웹 검색으로 확인한 기업 정보");
    draft.rationale.webResearchFacts.forEach((item) => {
      lines.push(`- [${webResearchCategoryLabels[item.category]}] ${item.fact} (${item.source})`);
    });
    lines.push("");
  }
  lines.push("## 사진 자료 판단");
  lines.push(
    `- ${draft.rationale.photoPlan.needed ? "필요" : "불필요"} — ${draft.rationale.photoPlan.reason || "근거 없음"}`,
  );
  draft.rationale.photoPlan.items.forEach((item) => {
    lines.push(`  - [${item.step || "단계 미상"}] ${item.description}`);
    if (item.purpose) lines.push(`    - 용도: ${item.purpose}`);
  });
  lines.push("");
  lines.push("## 평가 기준");
  draft.rationale.criteria.forEach((c, i) => {
    lines.push(`${i + 1}. **${c.title}**`);
    c.sources.forEach((s) => lines.push(`   - [${s.platform}] "${s.quote}"`));
    if (c.reflectedIn) lines.push(`   - 반영: ${c.reflectedIn}`);
  });
  if (draft.rationale.unreflected.length) {
    lines.push("");
    lines.push("## 미반영 요건");
    draft.rationale.unreflected.forEach((u) => lines.push(`- ${u.requirement} — ${u.reason}`));
  }
  return lines.join("\n");
}

function AdminSimulationGenerator() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { order: trialOrderId, jobRole, companyType } = Route.useSearch();

  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const loadedUserIdRef = useRef<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [roleName, setRoleName] = useState(jobRole ?? "");
  const [domain, setDomain] = useState<string>(DOMAIN_CATEGORIES[0]);
  const [sources, setSources] = useState<SourceInput[]>([createSource()]);
  const [note, setNote] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [draft, setDraft] = useState<GeneratedSimulationDraft | null>(null);
  const [saveCompanyCode, setSaveCompanyCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      const rows = await getAdminCompanies();
      setCompanies(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "기업 목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/simulation-generator" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void loadCompanies();
  }, [authLoading, userId, navigate, loadCompanies]);

  // 생성이 1~2분 걸리므로 경과 시간을 보여줍니다. 멈춘 화면처럼 보이지 않게.
  useEffect(() => {
    if (!isGenerating) return;
    setElapsedSeconds(0);
    const timer = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const canGenerate =
    companyName.trim().length > 0 &&
    roleName.trim().length > 0 &&
    sources.some((s) => s.jd.trim().length > 0);

  function updateSource(index: number, patch: Partial<SourceInput>) {
    setSources((current) =>
      current.map((source, i) => (i === index ? { ...source, ...patch } : source)),
    );
  }

  function addSource() {
    setSources((current) => [...current, createSource()]);
  }

  function removeSource(index: number) {
    setSources((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return;
    const cleanedSources = sources
      .map((s) => ({ platform: s.platform.trim(), jd: s.jd.trim() }))
      .filter((s) => s.jd.length > 0);
    if (cleanedSources.length === 0) {
      toast.error("JD를 최소 한 개 이상 붙여넣어 주세요.");
      return;
    }

    setIsGenerating(true);
    setDraft(null);
    try {
      const generated = await requestGeneration({
        companyName: companyName.trim(),
        roleName: roleName.trim(),
        domain,
        sources: cleanedSources,
        note: note.trim(),
      });
      setDraft(generated);
      const matched = companies.find((c) => c.name.trim() === generated.companyName.trim());
      setSaveCompanyCode(matched?.code ?? "");
      toast.success("시뮬레이션 초안을 생성했어요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "생성에 실패했어요.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!draft || isSaving) return;
    setIsSaving(true);
    try {
      let companyCode = saveCompanyCode;
      if (!companyCode) {
        const company = await resolveGeneratedCompany({
          data: {
            name: draft.companyName,
            roleLabel: draft.simulation.roleLabel,
          },
        });
        companyCode = company.code;
        setSaveCompanyCode(companyCode);
        setCompanies((current) =>
          current.some((item) => item.id === company.id) ? current : [...current, company],
        );
      }

      const result = await createCompanySimulation({
        data: {
          companyCode,
          title: draft.simulation.title,
          roleLabel: draft.simulation.roleLabel,
          description: draft.simulation.description,
          cardImageUrl: "",
          jobFamily: draft.simulation.roleLabel,
          domain: draft.domain as (typeof DOMAIN_CATEGORIES)[number],
          estimatedMinutes: draft.simulation.estimatedMinutes,
          simulationFormat: "selection",
          selectionMode: "separated",
          singleAnswerQuestion: "",
          taskPrompt: "",
          sharedSituation: "",
          sharedMaterials: "",
          steps: draft.simulation.steps,
        },
      });
      if (trialOrderId) {
        // 체험 주문 전용 과제 — 주문에 연결하고 현직자 검수 링크까지 한 번에 발급한다.
        await assignTrialSimulation({
          data: { orderId: trialOrderId, simulationId: result.id },
        });
        toast.success("과제를 주문에 배정했어요. 검수 링크를 현직자에게 전달하세요.");
        navigate({ to: "/admin/landing" });
        return;
      }
      toast.success("비공개 시뮬레이션으로 저장했어요. 시뮬레이션 관리에서 공개·수정할 수 있어요.");
      navigate({ to: "/admin/simulations" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyRationale() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(buildRationaleMarkdown(draft));
      toast.success("근거를 마크다운으로 복사했어요.");
    } catch {
      toast.error("복사에 실패했어요.");
    }
  }

  return (
    <AdminShell>
      <div className="border-b border-neutral-200 pb-6">
        <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wand2 className="h-6 w-6 text-neutral-700" /> JD 시뮬레이션 생성기
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          채용공고를 붙여넣으면 평가 기준을 추출해 스텝형 시뮬레이션 초안을 만듭니다. 생성물은 비공개로
          저장되며, 시뮬레이션 관리에서 공개·수정할 수 있습니다.
          <br />
          생성에 쓰이는 설계 지침은{" "}
          <Link to="/admin/ai-prompts" className="underline hover:text-neutral-900">
            AI 프롬프트 설정
          </Link>
          에서 수정할 수 있습니다.
        </p>
      </div>

      {trialOrderId && (
        <div className="mt-6 rounded-md border border-neutral-300 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-900">체험 주문 전용 과제 모드</p>
          <p className="mt-1 text-sm text-neutral-600">
            {[jobRole, companyType].filter(Boolean).join(" · ") || "주문 정보 없음"} — 저장하면 이
            주문에 배정되고 현직자 검수 링크가 발급됩니다. 공개 목록에는 노출되지 않습니다.
          </p>
        </div>
      )}

      {/* 입력 */}
      <section className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">기업명</span>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="예: 당근마켓"
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">직무명</span>
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="예: 그로스 마케터"
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium">도메인</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-10 max-w-xs rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
          >
            {DOMAIN_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">JD 소스 (1개 이상)</span>
            <button
              type="button"
              onClick={addSource}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-300 px-2.5 text-xs font-medium hover:bg-neutral-50"
            >
              <Plus className="h-3.5 w-3.5" /> 소스 추가
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {sources.map((source, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[140px_1fr]"
              >
                <div className="flex flex-col gap-2">
                  <select
                    value={source.platform}
                    onChange={(e) => updateSource(index, { platform: e.target.value })}
                    className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-neutral-900"
                  >
                    {PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                  {sources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSource(index)}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 삭제
                    </button>
                  )}
                </div>
                <textarea
                  value={source.jd}
                  onChange={(e) => updateSource(index, { jd: e.target.value })}
                  placeholder="채용공고의 주요업무·자격요건·우대사항을 붙여넣어 주세요."
                  className="min-h-[120px] w-full resize-y rounded-md border border-neutral-300 bg-white p-3 text-sm leading-6 outline-none focus:border-neutral-900"
                />
              </div>
            ))}
          </div>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium">참고사항 (선택)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 초심자도 40분 안에 끝낼 수 있는 난이도로"
            className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
          />
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {isGenerating ? "생성 중..." : "시뮬레이션 생성"}
          </button>
        </div>
      </section>

      {/* 로딩 */}
      {isGenerating && (
        <div className="mt-8 rounded-md border border-neutral-200 p-6">
          <p className="text-sm font-medium text-neutral-700">
            {elapsedSeconds < 30
              ? "기업 정보를 검색하고 있어요"
              : "시뮬레이션 초안을 작성하고 있어요"}
            <span className="ml-2 text-xs font-normal text-neutral-400">{elapsedSeconds}초</span>
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            보통 1~2분 걸려요. 이 페이지를 벗어나면 생성이 취소됩니다.
          </p>
          <div className="mt-4 animate-pulse">
            <div className="h-3 w-full rounded bg-neutral-100" />
            <div className="mt-2 h-3 w-5/6 rounded bg-neutral-100" />
            <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100" />
          </div>
        </div>
      )}

      {/* 결과 */}
      {draft && !isGenerating && (
        <section className="mt-8 border-t border-neutral-200 pt-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            {/* 초안 */}
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-500">생성된 초안</h2>
              <div className="mt-3 rounded-md border border-neutral-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold text-neutral-900">{draft.simulation.title}</p>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    비공개
                  </span>
                </div>
                {draft.simulation.description && (
                  <p className="mt-1.5 text-sm text-neutral-500">{draft.simulation.description}</p>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  {draft.simulation.roleLabel} · {draft.domain}
                  {draft.simulation.estimatedMinutes
                    ? ` · 약 ${draft.simulation.estimatedMinutes}분`
                    : ""}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {draft.simulation.steps.map((step, i) => (
                    <details key={step.id} className="rounded-md border border-neutral-200">
                      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-neutral-800">
                        <span>
                          <span className="text-neutral-400">스텝 {i + 1} ·</span> {step.title}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-400">
                          {step.difficulty ? `★${step.difficulty}` : ""}
                          {step.durationMin ? ` · ${step.durationMin}분` : ""}
                        </span>
                      </summary>
                      <div className="border-t border-neutral-100 px-3 py-3">
                        {step.situation && (
                          <StepBlock label="상황 안내" value={step.situation} />
                        )}
                        {step.materials && (
                          <StepBlock label="제공 자료" value={step.materials} />
                        )}
                        <StepBlock label="질문" value={step.prompts[0]?.body ?? ""} />
                        {step.hint && <StepBlock label="힌트" value={step.hint} />}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            {/* 근거 */}
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-500">생성 근거</h2>
              <div className="mt-3 rounded-md border border-neutral-200 p-4">
                {draft.rationale.webResearchFacts.length > 0 && (
                  <div className="border-b border-neutral-100 pb-4">
                    <p className="text-sm font-semibold text-neutral-900">웹 검색으로 확인한 기업 정보</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {draft.rationale.webResearchFacts.map((item, index) => (
                        <li key={index} className="text-xs leading-5 text-neutral-700">
                          <span className="mr-1 font-medium text-neutral-500">
                            [{webResearchCategoryLabels[item.category]}]
                          </span>
                          <span>{item.fact}</span>
                          <span className="ml-1 text-neutral-400">{item.source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="border-b border-neutral-100 pb-4">
                  <p className="text-sm font-semibold text-neutral-900">사진 자료 판단</p>
                  <div className="mt-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        draft.rationale.photoPlan.needed
                          ? "bg-blue-100 text-blue-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {draft.rationale.photoPlan.needed ? "사진 필요" : "사진 불필요"}
                    </span>
                    <p className="mt-1.5 text-xs leading-5 text-neutral-700">
                      {draft.rationale.photoPlan.reason || "판단 근거가 기록되지 않았어요."}
                    </p>
                    {draft.rationale.photoPlan.items.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {draft.rationale.photoPlan.items.map((item, index) => (
                          <li
                            key={index}
                            className="rounded-r-md border-l-2 border-blue-500 bg-blue-50 px-2.5 py-1.5"
                          >
                            {item.step && (
                              <p className="text-[11px] font-semibold text-blue-700">{item.step}</p>
                            )}
                            <p className="whitespace-pre-wrap text-xs leading-5 text-neutral-700">
                              {item.description}
                            </p>
                            {item.purpose && (
                              <p className="mt-0.5 text-[11px] text-neutral-500">
                                → {item.purpose}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {draft.rationale.criteria.length === 0 && (
                  <p className="pt-4 text-sm text-neutral-400">추출된 평가 기준이 없어요.</p>
                )}
                <div className="flex flex-col gap-4 pt-4">
                  {draft.rationale.criteria.map((c, i) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-neutral-900">
                        평가 기준 {i + 1} · {c.title}
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {c.sources.map((s, si) => (
                          <div
                            key={si}
                            className="rounded-r-md border-l-2 border-emerald-500 bg-emerald-50 px-2.5 py-1.5"
                          >
                            <p className="text-[11px] font-semibold text-emerald-700">
                              {s.platform || "JD"} 인용
                            </p>
                            <p className="text-xs text-neutral-700">"{s.quote}"</p>
                          </div>
                        ))}
                      </div>
                      {c.reflectedIn && (
                        <p className="mt-1 text-xs text-neutral-500">→ {c.reflectedIn}</p>
                      )}
                    </div>
                  ))}
                </div>

                {draft.rationale.unreflected.length > 0 && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <p className="text-xs font-semibold text-amber-700">미반영 요건</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {draft.rationale.unreflected.map((u, i) => (
                        <li
                          key={i}
                          className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"
                        >
                          <span className="font-medium">{u.requirement}</span> — {u.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 저장 바 */}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">저장할 기업</span>
              <select
                value={saveCompanyCode}
                onChange={(e) => setSaveCompanyCode(e.target.value)}
                className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-neutral-900"
              >
                <option value="">자동 생성</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.code}>
                    {company.name} ({company.code})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "비공개로 저장"}
            </button>
            <button
              type="button"
              onClick={handleCopyRationale}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50"
            >
              근거 마크다운 복사
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              다시 생성
            </button>
          </div>
          {companies.length === 0 && (
            <p className="mt-3 text-xs text-amber-700">
              등록된 기업이 없어요.{" "}
              <Link to="/admin/simulations" className="underline">
                시뮬레이션 관리
              </Link>
              에서 기업을 먼저 추가하면 저장할 수 있어요.
            </p>
          )}
        </section>
      )}
    </AdminShell>
  );
}

function StepBlock({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <div className="prose prose-sm prose-neutral mt-1 max-w-none prose-table:text-xs prose-headings:text-sm">
        <RichTextContent value={value} compact />
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-16 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <Link to="/admin" className="text-sm font-semibold tracking-tight">
          <BrandLogo className="inline-block h-5 w-auto align-middle" />
          <span className="ml-1 text-xs font-normal text-neutral-500">Admin</span>
        </Link>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
