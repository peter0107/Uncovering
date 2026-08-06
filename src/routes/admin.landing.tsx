import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminLandingData,
  markTrialOrderDelivered,
  refundTrialOrder,
  TRIAL_PLAN_LABELS,
  type AdminLandingData,
} from "@/lib/landing.functions";

export const Route = createFileRoute("/admin/landing")({
  head: () => ({
    meta: [{ title: "Beginner Admin - 수요조사 랜딩" }],
  }),
  component: AdminLanding,
});

type Tab = "leads" | "orders";

const EMPTY: AdminLandingData = { leads: [], orders: [] };

const STATUS_LABELS: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  failed: "실패",
  canceled: "취소",
  refunded: "환불됨",
};

function isOverdue(order: AdminLandingData["orders"][number]): boolean {
  if (order.status !== "paid" || order.deliveredAt) return false;
  const paidAtSource = order.paidAt || order.createdAt;
  // formatDateTime은 "YYYY-MM-DD HH:mm" (KST) 문자열이라 Date로 재파싱한다.
  const paidAtMs = Date.parse(paidAtSource.replace(" ", "T") + ":00+09:00");
  if (Number.isNaN(paidAtMs)) return false;
  return Date.now() - paidAtMs > 24 * 60 * 60 * 1000;
}

function AdminLanding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminLandingData>(EMPTY);
  const [tab, setTab] = useState<Tab>("leads");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const result = await getAdminLandingData();
      setData(result);
    } catch (error) {
      setLoadError(true);
      toast.error(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/landing" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void load();
  }, [authLoading, userId, navigate, load]);

  const markDelivered = useCallback(
    async (orderId: string) => {
      if (busyOrderId) return;
      if (!window.confirm("이 주문을 발송 완료로 표시할까요?")) return;
      setBusyOrderId(orderId);
      try {
        await markTrialOrderDelivered({ data: { orderId } });
        toast.success("발송 완료로 표시했습니다.");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "발송 완료 처리에 실패했습니다.");
      } finally {
        setBusyOrderId(null);
      }
    },
    [busyOrderId, load],
  );

  const refund = useCallback(
    async (orderId: string) => {
      if (busyOrderId) return;
      const reason = window.prompt("환불 사유를 입력해주세요.");
      if (!reason || !reason.trim()) return;
      if (!window.confirm("페이앱에서 실제로 결제를 취소합니다. 진행할까요?")) return;
      setBusyOrderId(orderId);
      try {
        await refundTrialOrder({ data: { orderId, reason: reason.trim() } });
        toast.success("환불 처리했습니다.");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "환불 처리에 실패했습니다.");
      } finally {
        setBusyOrderId(null);
      }
    },
    [busyOrderId, load],
  );

  const leads = data.leads;
  const orders = data.orders;

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">수요조사 랜딩</h1>
          <p className="mt-2 text-sm text-neutral-500">
            /lp/outsourcing 사전예약 리드와 /lp/trial 체험 주문을 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      <div className="mt-6 flex gap-6 border-b border-neutral-200">
        <TabButton active={tab === "leads"} onClick={() => setTab("leads")}>
          사전예약 리드 <TabCount>{leads.length}</TabCount>
        </TabButton>
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>
          체험 주문 <TabCount>{orders.length}</TabCount>
        </TabButton>
      </div>

      {authLoading || isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-500">불러오는 중입니다...</div>
      ) : loadError ? (
        <div className="mt-6 rounded-md border border-dashed border-red-300 px-5 py-16 text-center">
          <p className="text-sm text-red-600">데이터를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            다시 시도
          </button>
        </div>
      ) : tab === "leads" ? (
        leads.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6 space-y-3">
            {leads.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 p-4"
              >
                <p className="text-sm font-semibold text-neutral-900">{item.email}</p>
                <span className="text-xs text-neutral-400">{item.createdAt}</span>
              </div>
            ))}
          </div>
        )
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">신청 시각</th>
                  <th className="px-4 py-3 font-medium">직무 / 기업유형</th>
                  <th className="px-4 py-3 font-medium">플랜 / 금액</th>
                  <th className="px-4 py-3 font-medium">연락처</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {orders.map((order) => (
                  <tr key={order.id} className={isOverdue(order) ? "bg-red-50 align-top" : "align-top"}>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{order.createdAt}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {order.jobRole} · {order.companyType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                      {TRIAL_PLAN_LABELS[order.plan]?.name ?? order.plan} · {order.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      <p>{order.email}</p>
                      <p>{order.phone}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      {order.deliveredAt && (
                        <p className="mt-1 text-xs text-neutral-400">발송 {order.deliveredAt}</p>
                      )}
                      {isOverdue(order) && (
                        <p className="mt-1 text-xs font-medium text-red-600">24시간 경과, 미발송</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === "paid" && !order.deliveredAt && (
                          <button
                            type="button"
                            onClick={() => void markDelivered(order.orderId)}
                            disabled={busyOrderId !== null}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-neutral-300 px-2.5 text-xs font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            발송 완료
                          </button>
                        )}
                        {order.status === "paid" && (
                          <button
                            type="button"
                            onClick={() => void refund(order.orderId)}
                            disabled={busyOrderId !== null}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-red-300 px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            환불
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors ${
        active
          ? "border-neutral-900 text-neutral-900"
          : "border-transparent text-neutral-500 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">{children}</span>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-md border border-dashed border-neutral-300 px-5 py-16 text-center text-sm text-neutral-500">
      아직 데이터가 없습니다.
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
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
