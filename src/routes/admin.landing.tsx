import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminLandingData,
  getTrialOrderDetail,
  issueTrialAccessCode,
  markTrialOrderDelivered,
  refundTrialOrder,
  TRIAL_PLAN_LABELS,
  type AdminLandingData,
  type TrialOrderDetail,
} from "@/lib/landing.functions";

export const Route = createFileRoute("/admin/landing")({
  head: () => ({
    meta: [{ title: "Beginner Admin - 랜딩 신청 관리" }],
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

const VERDICT_LABELS: Record<string, string> = {
  approved: "승인",
  revise: "수정 필요",
};

type TrialOrder = AdminLandingData["orders"][number];

/**
 * 체험 주문의 진행 단계. 관리자가 다음에 뭘 눌러야 하는지 한 줄로 보여주기 위한 것.
 * 과제 배정 → 현직자 검수 → 코드 발급 → 발송(코드 활성화) → 결제자 제출
 */
function trialStage(order: TrialOrder): { label: string; tone: "todo" | "wait" | "done" } {
  if (order.status !== "paid") return { label: "결제 전", tone: "wait" };
  if (!order.simulationId) return { label: "과제 미생성", tone: "todo" };
  if (order.reviewVerdict === "revise") return { label: "수정 필요", tone: "todo" };
  if (order.reviewVerdict !== "approved") return { label: "검수 대기", tone: "wait" };
  if (!order.accessCode) return { label: "코드 미발급", tone: "todo" };
  if (!order.deliveredAt) return { label: "발송 대기", tone: "todo" };
  if (!order.answerSubmittedAt) return { label: "발송 완료 · 미제출", tone: "done" };
  return { label: "제출 완료", tone: "done" };
}

function reviewLinkFor(order: TrialOrder): string {
  if (!order.simulationId || !order.reviewToken) return "";
  return `${window.location.origin}/expert-simulation/${order.simulationId}/review?token=${order.reviewToken}`;
}

function trialTaskLinkFor(order: TrialOrder): string {
  if (!order.accessCode) return "";
  return `${window.location.origin}/lp/trial-task?code=${order.accessCode}`;
}

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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TrialOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  const issueCode = useCallback(
    async (order: TrialOrder) => {
      if (busyOrderId) return;
      if (order.accessCode && !window.confirm("코드를 다시 발급하면 기존 코드는 즉시 무효가 됩니다. 진행할까요?")) {
        return;
      }
      setBusyOrderId(order.orderId);
      try {
        const { accessCode } = await issueTrialAccessCode({ data: { orderId: order.orderId } });
        toast.success(`코드를 발급했습니다: ${accessCode}`);
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "코드 발급에 실패했습니다.");
      } finally {
        setBusyOrderId(null);
      }
    },
    [busyOrderId, load],
  );

  const copyText = useCallback(async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }, []);

  const toggleDetail = useCallback(
    async (orderId: string) => {
      if (expandedOrderId === orderId) {
        setExpandedOrderId(null);
        setDetail(null);
        return;
      }
      setExpandedOrderId(orderId);
      setDetail(null);
      setDetailLoading(true);
      try {
        setDetail(await getTrialOrderDetail({ data: { orderId } }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "상세를 불러오지 못했습니다.");
        setExpandedOrderId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [expandedOrderId],
  );

  const leads = data.leads;
  const orders = data.orders;

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">랜딩 신청 관리</h1>
          <p className="mt-2 text-sm text-neutral-500">
            /lp/outsourcing 업무 의뢰 상담과 /lp/trial 체험 주문을 확인합니다.
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
          상담 신청 <TabCount>{leads.length}</TabCount>
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
              <div key={item.id} className="rounded-md border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {item.companyName || "업무 의뢰 상담"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {[item.contactName, item.email].filter(Boolean).join(" · ") || "연락처 없음"}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400">{item.createdAt}</span>
                </div>
                {(item.phone || item.requestDetail) && (
                  <div className="mt-3 border-t border-neutral-100 pt-3">
                    {item.phone && <p className="text-sm text-neutral-600">{item.phone}</p>}
                    {item.requestDetail && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                        {item.requestDetail}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">신청 시각</th>
                  <th className="px-4 py-3 font-medium">직무 / 기업유형</th>
                  <th className="px-4 py-3 font-medium">플랜 / 금액</th>
                  <th className="px-4 py-3 font-medium">연락처</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">과제 / 검수</th>
                  <th className="px-4 py-3 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {orders.map((order) => (
                  <Fragment key={order.id}>
                  <tr className={isOverdue(order) ? "bg-red-50 align-top" : "align-top"}>
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
                    <td className="px-4 py-3">
                      {order.status === "paid" ? (
                        <div className="space-y-1.5">
                          <StageBadge stage={trialStage(order)} />
                          {order.simulationTitle && (
                            <p className="max-w-[220px] truncate text-xs text-neutral-500">
                              {order.simulationTitle}
                            </p>
                          )}
                          {order.reviewCount > 0 && (
                            <button
                              type="button"
                              onClick={() => void toggleDetail(order.orderId)}
                              className="text-xs text-neutral-500 underline hover:text-neutral-900"
                            >
                              검수 의견 {order.reviewCount}건
                              {order.reviewVerdict
                                ? ` · ${VERDICT_LABELS[order.reviewVerdict] ?? order.reviewVerdict}`
                                : ""}
                            </button>
                          )}
                          {order.accessCode && (
                            <p className="font-mono text-xs tracking-wider text-neutral-700">
                              {order.accessCode}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {order.status === "paid" && !order.simulationId && (
                          <ActionButton
                            disabled={busyOrderId !== null}
                            onClick={() =>
                              navigate({
                                to: "/admin/simulation-generator",
                                search: {
                                  order: order.orderId,
                                  jobRole: order.jobRole,
                                  companyType: order.companyType,
                                },
                              })
                            }
                          >
                            과제 생성
                          </ActionButton>
                        )}
                        {order.reviewToken && (
                          <ActionButton
                            disabled={busyOrderId !== null}
                            onClick={() =>
                              void copyText(reviewLinkFor(order), "검수 링크를 복사했습니다.")
                            }
                          >
                            검수 링크 복사
                          </ActionButton>
                        )}
                        {order.status === "paid" && order.simulationId && (
                          <ActionButton
                            disabled={busyOrderId !== null}
                            onClick={() => void issueCode(order)}
                          >
                            {order.accessCode ? "코드 재발급" : "코드 발급"}
                          </ActionButton>
                        )}
                        {order.accessCode && (
                          <ActionButton
                            disabled={busyOrderId !== null}
                            onClick={() =>
                              void copyText(
                                trialTaskLinkFor(order),
                                "과제 링크를 복사했습니다. 코드와 함께 보내주세요.",
                              )
                            }
                          >
                            과제 링크 복사
                          </ActionButton>
                        )}
                        {order.status === "paid" && !order.deliveredAt && (
                          <button
                            type="button"
                            onClick={() => void markDelivered(order.orderId)}
                            disabled={busyOrderId !== null || !order.accessCode}
                            title={
                              order.accessCode
                                ? "발송 완료로 표시하면 결제자가 코드로 과제를 열 수 있습니다."
                                : "먼저 코드를 발급해주세요."
                            }
                            className="inline-flex h-8 items-center justify-center rounded-md border border-neutral-900 bg-neutral-900 px-2.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            발송 완료
                          </button>
                        )}
                        {order.answerSubmittedAt && (
                          <ActionButton
                            disabled={busyOrderId !== null}
                            onClick={() => void toggleDetail(order.orderId)}
                          >
                            답안 보기
                          </ActionButton>
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
                  {expandedOrderId === order.orderId && (
                    <tr>
                      <td colSpan={7} className="bg-neutral-50 px-4 py-4">
                        {detailLoading ? (
                          <p className="text-sm text-neutral-500">불러오는 중입니다...</p>
                        ) : !detail ? (
                          <p className="text-sm text-neutral-500">표시할 내용이 없습니다.</p>
                        ) : (
                          <div className="space-y-5">
                            <div>
                              <p className="text-xs font-semibold text-neutral-700">현직자 검수 의견</p>
                              {detail.reviews.length === 0 ? (
                                <p className="mt-1 text-sm text-neutral-500">아직 검수 의견이 없습니다.</p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {detail.reviews.map((review) => (
                                    <li
                                      key={review.id}
                                      className="rounded-md border border-neutral-200 bg-white p-3"
                                    >
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                                        <span className="font-medium text-neutral-800">
                                          {review.reviewerName || "익명"}
                                        </span>
                                        {review.verdict && (
                                          <span
                                            className={`rounded-full px-2 py-0.5 font-medium ${
                                              review.verdict === "approved"
                                                ? "bg-neutral-900 text-white"
                                                : "bg-amber-100 text-amber-800"
                                            }`}
                                          >
                                            {VERDICT_LABELS[review.verdict] ?? review.verdict}
                                          </span>
                                        )}
                                        <span>{review.createdAt}</span>
                                      </div>
                                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                                        {review.feedback}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {detail.answerSubmittedAt && (
                              <div>
                                <p className="text-xs font-semibold text-neutral-700">
                                  결제자 제출 답안 · {detail.answerSubmittedAt}
                                </p>
                                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-neutral-200 bg-white p-3 text-sm leading-6 text-neutral-700">
                                  {detail.answerText || "내용 없음"}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
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

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center justify-center rounded-md border border-neutral-300 px-2.5 text-xs font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StageBadge({ stage }: { stage: ReturnType<typeof trialStage> }) {
  const tone =
    stage.tone === "todo"
      ? "bg-amber-100 text-amber-800"
      : stage.tone === "done"
        ? "bg-neutral-900 text-white"
        : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {stage.label}
    </span>
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
