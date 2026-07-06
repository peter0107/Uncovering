import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ListChecks, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  createCompanySimulation,
  getAdminCompanySimulations,
  type AdminCompanySimulation,
} from "@/lib/simulations.functions";

type SimulationForm = {
  companyCode: string;
  roleLabel: string;
  title: string;
  description: string;
  jobFamily: string;
  domain: string;
  estimatedMinutes: string;
  taskPrompt: string;
};

const EMPTY_FORM: SimulationForm = {
  companyCode: "BGNR-2024-A",
  roleLabel: "",
  title: "",
  description: "",
  jobFamily: "",
  domain: "",
  estimatedMinutes: "60",
  taskPrompt: "",
};

export const Route = createFileRoute("/admin/simulations")({
  head: () => ({
    meta: [
      { title: "Beginner - 직무 시뮬레이션 관리자" },
      { name: "description", content: "기업별 직무 시뮬레이션을 관리합니다." },
    ],
  }),
  component: AdminSimulations,
});

function AdminSimulations() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [simulations, setSimulations] = useState<AdminCompanySimulation[]>([]);
  const [form, setForm] = useState<SimulationForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSimulations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const simulationData = await getAdminCompanySimulations();
      setSimulations(simulationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/admin/simulations" } });
      return;
    }
    void loadSimulations();
  }, [authLoading, user, navigate, loadSimulations]);

  function updateForm<K extends keyof SimulationForm>(key: K, value: SimulationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitSimulation(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const estimatedMinutes = form.estimatedMinutes.trim()
        ? Number(form.estimatedMinutes.trim())
        : null;

      await createCompanySimulation({
        data: {
          companyCode: form.companyCode.trim(),
          roleLabel: form.roleLabel.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          jobFamily: form.jobFamily.trim(),
          domain: form.domain.trim(),
          estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : null,
          taskPrompt: form.taskPrompt.trim(),
        },
      });

      setForm(EMPTY_FORM);
      await loadSimulations();
      setMessage("직무 시뮬레이션을 추가했습니다. 기업 페이지 드롭다운에 반영됩니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "직무 시뮬레이션을 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading || isLoading) {
    return (
      <AdminShell>
        <div className="py-16 text-center text-sm text-neutral-500">
          관리자 정보를 확인 중입니다...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            직무 시뮬레이션 관리
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            기업 코드별 직무 시뮬레이션을 등록하고 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSimulations}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      {(message || error) && (
        <div
          className={`mt-5 rounded-md border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <section className="rounded-md border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">등록된 시뮬레이션</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  현재 DB에 있는 직무 시뮬레이션 {simulations.length}건
                </p>
              </div>
              <ListChecks className="h-4 w-4 text-neutral-400" />
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
              {simulations.map((simulation) => (
                <article key={simulation.id} className="rounded-md border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {simulation.roleLabel}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500">
                        {simulation.companyName} · {simulation.companyCode}
                      </p>
                    </div>
                    {simulation.estimatedMinutes && (
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                        {simulation.estimatedMinutes}분
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium text-neutral-800">{simulation.title}</p>
                  {simulation.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">
                      {simulation.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                    {simulation.jobFamily && (
                      <span className="rounded bg-neutral-50 px-2 py-1">
                        {simulation.jobFamily}
                      </span>
                    )}
                    {simulation.domain && (
                      <span className="rounded bg-neutral-50 px-2 py-1">{simulation.domain}</span>
                    )}
                  </div>
                </article>
              ))}

              {simulations.length === 0 && (
                <div className="rounded-md border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
                  등록된 직무 시뮬레이션이 없습니다.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-md border border-neutral-200">
          <div className="border-b border-neutral-200 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">시뮬레이션 입력</h2>
            <p className="mt-1 text-xs text-neutral-500">
              저장하면 해당 기업의 직무 선택 목록에 표시됩니다.
            </p>
          </div>

          <form onSubmit={submitSimulation} className="grid gap-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="기업 코드"
                value={form.companyCode}
                onChange={(value) => updateForm("companyCode", value)}
                required
              />
              <InputField
                label="드롭다운 직무명"
                value={form.roleLabel}
                onChange={(value) => updateForm("roleLabel", value)}
                placeholder="예: 마케팅 매니저"
                required
              />
            </div>

            <InputField
              label="시뮬레이션 제목"
              value={form.title}
              onChange={(value) => updateForm("title", value)}
              placeholder="예: 마케팅 캠페인 A/B 테스트 결과 해석"
              required
            />

            <TextareaField
              label="간단 설명"
              value={form.description}
              onChange={(value) => updateForm("description", value)}
              rows={3}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="직무군"
                value={form.jobFamily}
                onChange={(value) => updateForm("jobFamily", value)}
                placeholder="예: 데이터"
              />
              <InputField
                label="도메인"
                value={form.domain}
                onChange={(value) => updateForm("domain", value)}
                placeholder="예: 에듀테크"
              />
              <InputField
                label="예상 소요 시간"
                type="number"
                value={form.estimatedMinutes}
                onChange={(value) => updateForm("estimatedMinutes", value)}
              />
            </div>

            <TextareaField
              label="과제 본문"
              value={form.taskPrompt}
              onChange={(value) => updateForm("taskPrompt", value)}
              rows={16}
              required
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
                className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50"
              >
                초기화
              </button>
              <button
                type="submit"
                disabled={
                  isSaving ||
                  !form.companyCode.trim() ||
                  !form.roleLabel.trim() ||
                  !form.title.trim() ||
                  !form.taskPrompt.trim()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {isSaving ? "저장 중..." : "시뮬레이션 추가"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 px-6">
        <div>
          <span className="text-sm font-semibold tracking-tight">Beginner</span>
          <span className="ml-2 text-xs text-neutral-500">Admin</span>
        </div>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        className="mt-2 w-full resize-y rounded-md border border-neutral-300 p-3 text-sm leading-relaxed outline-none focus:border-neutral-900"
      />
    </label>
  );
}
