import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { BrandLogo } from "@/components/BrandLogo";
import { getTrialOrderStatus, type TrialOrderStatus } from "@/lib/landing.functions";

const searchSchema = z.object({
  order: z.string().catch(""),
});

export const Route = createFileRoute("/lp_/trial-complete")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "결제 확인 중 | Beginner" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LpTrialCompletePage,
});

const MAX_POLLS = 10;
const POLL_INTERVAL_MS = 2000;

function formatPrice(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function LpTrialCompletePage() {
  const { order } = Route.useSearch();
  const [status, setStatus] = useState<TrialOrderStatus | null>(null);
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;

    async function poll(attempt: number) {
      try {
        const result = await getTrialOrderStatus({ data: { orderId: order } });
        if (cancelled) return;
        setStatus(result);
        setPollCount(attempt);
        if (result.status === "pending" && attempt < MAX_POLLS) {
          timerRef.current = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
        }
      } catch (fetchError) {
        if (cancelled) return;
        setError(
          fetchError instanceof Error ? fetchError.message : "주문 상태를 확인하지 못했습니다.",
        );
      }
    }

    poll(1);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [order]);

  return (
    <div className="lp-trial">
      <div className="wrap" style={{ maxWidth: 480, padding: "80px 24px" }}>
        <div className="card" style={{ textAlign: "center", alignItems: "center" }}>
          <BrandLogo className="h-8 w-auto max-w-[9.75rem] object-contain" />

          {!order && (
            <>
              <h3>주문 정보를 찾을 수 없어요</h3>
              <p>결제 링크가 올바르지 않습니다. 다시 신청해주세요.</p>
            </>
          )}

          {order && error && (
            <>
              <h3>확인 중 문제가 발생했어요</h3>
              <p>{error}</p>
            </>
          )}

          {order && !error && !status && (
            <>
              <h3>결제를 확인하고 있어요...</h3>
              <p>잠시만 기다려주세요.</p>
            </>
          )}

          {order && !error && status?.status === "paid" && (
            <>
              <h3>결제가 완료됐어요</h3>
              <p>
                {TRIAL_PLAN_LABEL[status.plan]} · {formatPrice(status.amount)}
                <br />
                24시간 안에 이메일로 체험 과제를 보내드릴게요.
              </p>
            </>
          )}

          {order && !error && (status?.status === "canceled" || status?.status === "failed") && (
            <>
              <h3>결제가 완료되지 않았어요</h3>
              <p>결제가 취소되었거나 실패했습니다. 다시 시도해주세요.</p>
              <Link to="/lp/trial" className="btn">
                다시 신청하기
              </Link>
            </>
          )}

          {order && !error && status?.status === "refunded" && (
            <>
              <h3>환불된 주문이에요</h3>
              <p>이 주문은 환불 처리되었습니다.</p>
            </>
          )}

          {order && !error && status?.status === "pending" && pollCount >= MAX_POLLS && (
            <>
              <h3>결제 확인 중이에요</h3>
              <p>확인되는 대로 이메일로 안내드릴게요. 잠시 뒤 새로고침해도 괜찮아요.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const TRIAL_PLAN_LABEL: Record<TrialOrderStatus["plan"], string> = {
  single: "체험 1회",
  pack3: "3회 패키지",
  monthly: "월 무제한",
};
