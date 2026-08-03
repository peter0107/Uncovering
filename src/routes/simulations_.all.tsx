import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutGrid, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardSkeleton, SimCard, fetchAll, type Simulation } from "./simulations";
import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";
import { submitCompanyRoleRequest } from "@/lib/inquiries.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/simulations_/all")({
  head: () => ({ meta: [{ title: "전체 직무 — Beginner" }] }),
  component: AllSimulationsPage,
});

function AllSimulationsPage() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestedCompanyName, setRequestedCompanyName] = useState("");
  const [requestedRoleName, setRequestedRoleName] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setSims(await fetchAll());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 실제 존재하는 도메인만 필터 옵션으로 노출
  const availableDomains = useMemo(() => {
    const set = new Set(sims.map((s) => s.domain).filter(Boolean) as string[]);
    return DOMAIN_CATEGORIES.filter((d) => set.has(d));
  }, [sims]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sims.filter((s) => {
      if (selectedDomain && s.domain !== selectedDomain) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.company_name ?? "").toLowerCase().includes(q) ||
        (s.role_label ?? "").toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        (s.job_family ?? "").toLowerCase().includes(q) ||
        (s.domain ?? "").toLowerCase().includes(q)
      );
    });
  }, [sims, query, selectedDomain]);

  async function submitRequest() {
    const companyName = requestedCompanyName.trim();
    const roleName = requestedRoleName.trim();
    if (!companyName || !roleName) {
      toast.error("희망 기업과 희망 직무를 입력해주세요.");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await submitCompanyRoleRequest({ data: { companyName, roleName } });
      setRequestDialogOpen(false);
      setRequestedCompanyName("");
      setRequestedRoleName("");
      toast.success("요청을 보냈습니다.");
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "요청을 보내지 못했습니다.");
    } finally {
      setIsSubmittingRequest(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* 뒤로 */}
      <Link
        to="/simulations"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        추천으로 돌아가기
      </Link>

      <h1 className="mt-5 text-2xl font-bold text-zinc-900 md:text-3xl">
        모든 직무 시뮬레이션 둘러보기
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        관심 직무·기업과 상관없이 현재 열려있는 모든 시뮬레이션을 볼 수 있어요.
      </p>

      {/* 직무군 필터 + 검색 */}
      {!loading && availableDomains.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedDomain(null)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                selectedDomain === null
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              )}
            >
              전체
            </button>
            {availableDomains.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDomain(d === selectedDomain ? null : d)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedDomain === d
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="relative md:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="직무, 기업, 키워드로 검색"
              className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-6 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 결과 카운트 */}
      {!loading && !error && (
        <p className="mt-6 text-xs text-zinc-400">
          총 {filtered.length}개{(query || selectedDomain) && ` (전체 ${sims.length}개 중)`}
        </p>
      )}

      {/* 카드 목록 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : filtered.length > 0 ? (
          filtered.map((sim) => <SimCard key={sim.id} sim={sim} />)
        ) : sims.length > 0 ? (
          <div className="col-span-full flex flex-col items-center py-20 text-center">
            <Search className="h-8 w-8 text-zinc-300" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-700">
              조건에 맞는 시뮬레이션이 없어요
            </h3>
            <p className="mt-2 max-w-xs text-sm text-zinc-400">
              검색어나 직무군 필터를 바꿔 다시 시도해 보세요.
            </p>
            <div className="mt-6 text-sm text-zinc-500">
              <span>원하는 기업과 원하는 직무가 없나요? </span>
              <button
                type="button"
                onClick={() => setRequestDialogOpen(true)}
                className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600"
              >
                요청하기
              </button>
            </div>
          </div>
        ) : (
          <div className="col-span-full flex flex-col items-center py-20 text-center">
            <LayoutGrid className="h-8 w-8 text-zinc-300" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-700">
              아직 준비된 시뮬레이션이 없어요
            </h3>
            <p className="mt-2 max-w-xs text-sm text-zinc-400">
              곧 기업 시뮬레이션이 추가될 예정이에요. 조금만 기다려 주세요!
            </p>
            <Link to="/simulations" className="mt-6">
              <Button className="rounded-md bg-zinc-900 text-white hover:bg-zinc-700">
                추천 보러 가기
              </Button>
            </Link>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-10 text-center text-sm text-zinc-500">
          <span>원하는 기업과 원하는 직무가 없나요? </span>
          <button
            type="button"
            onClick={() => setRequestDialogOpen(true)}
            className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600"
          >
            요청하기
          </button>
        </div>
      )}

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md rounded-md p-6 shadow-none data-[state=closed]:!animate-none data-[state=open]:!animate-none">
          <DialogHeader>
            <DialogTitle>희망 기업·직무 요청</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="grid gap-2 text-sm font-medium text-zinc-800" htmlFor="request-company-name">
              희망 기업
              <input
                id="request-company-name"
                value={requestedCompanyName}
                onChange={(event) => setRequestedCompanyName(event.target.value)}
                maxLength={120}
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-zinc-800" htmlFor="request-role-name">
              희망 직무
              <input
                id="request-role-name"
                value={requestedRoleName}
                onChange={(event) => setRequestedRoleName(event.target.value)}
                maxLength={120}
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
              disabled={isSubmittingRequest}
              className="rounded-md"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={submitRequest}
              disabled={isSubmittingRequest}
              className="rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
            >
              {isSubmittingRequest ? "보내는 중..." : "보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
