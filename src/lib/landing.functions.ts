import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// 수요조사 랜딩페이지 2종(/lp/outsourcing, /lp/trial) 전용 서버 함수.
// CLAUDE.md §1의 현행 제품(기업은 답안 열람만)과 무관한 별도 수요검증 흐름이며
// job_seekers/submissions/company_role_requests와 조인하지 않는다.

// ── 인증 헬퍼 (inquiries.functions.ts에서 복제) ─────────────────────
function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Backend is not configured");
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getRequestUser() {
  const authorization = getRequest()?.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;
  const { data } = await createPublicServerClient().auth.getUser(token);
  return data.user ?? null;
}

async function assertAdmin() {
  const user = await getRequestUser();
  if (user?.app_metadata?.role !== "admin") {
    throw new Error("관리자 권한이 없습니다.");
  }
}

function formatDateTime(iso: string): string {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// Discord 알림 (ads.functions.ts의 notifyDiscord 패턴). 웹훅 미설정 시 조용히 skip.
async function notifyDiscord(title: string, fields: { name: string; value: string; inline?: boolean }[]) {
  const webhookUrl = process.env.LANDING_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "Beginner 수요조사",
        allowed_mentions: { parse: [] },
        embeds: [{ title, color: 4431066, fields, timestamp: new Date().toISOString() }],
      }),
    });
    if (!response.ok) {
      console.error("Discord landing notification failed:", response.status);
    }
  } catch (error) {
    console.error("Discord landing notification failed:", error);
  }
}

// ── 27a: 사전예약 리드 ────────────────────────────────────────────
const landingLeadSchema = z.object({
  email: z.string().trim().email().max(200),
  website: z.string().max(0).optional().default(""), // honeypot
});

export const submitLandingLead = createServerFn({ method: "POST" })
  .inputValidator(landingLeadSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("landing_leads").insert({
      email: data.email,
      source: "outsourcing",
    });
    if (error) {
      console.error("Failed to insert landing lead:", error);
      throw new Error("접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    await notifyDiscord("새 사전예약 리드 (외주 플랫폼)", [
      { name: "이메일", value: data.email, inline: true },
    ]);
    return { ok: true as const };
  });

// ── 27b: 직무 체험 주문 (PG: 페이앱) ─────────────────────────────
export const TRIAL_PLAN_PRICES = {
  single: 9900,
  pack3: 19800,
  monthly: 29000,
} as const;

export const TRIAL_PLAN_LABELS: Record<keyof typeof TRIAL_PLAN_PRICES, { name: string; sub: string }> = {
  single: { name: "체험 1회", sub: "과제 1건 · 현직자 답안 포함" },
  pack3: { name: "3회 패키지", sub: "회당 6,600원 · 직무 비교용" },
  monthly: { name: "월 무제한", sub: "모든 직무 · 피드백 리포트" },
};

const trialPlanSchema = z.enum(["single", "pack3", "monthly"]);

const createTrialOrderSchema = z.object({
  jobRole: z.string().trim().min(1).max(100),
  companyType: z.string().trim().min(1).max(100),
  plan: trialPlanSchema,
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(9).max(20).regex(/^[\d\-+() ]+$/),
  agreedToTerms: z.literal(true),
  website: z.string().max(0).optional().default(""), // honeypot
});

const PAYAPP_API_URL = "https://api.payapp.kr/oapi/apiLoad.html";

function getPayappCredentials() {
  const userid = process.env.PAYAPP_USERID;
  const linkkey = process.env.PAYAPP_LINKKEY;
  const linkval = process.env.PAYAPP_LINKVAL;
  if (!userid || !linkkey || !linkval) {
    throw new Error("결제 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.");
  }
  return { userid, linkkey, linkval };
}

// 페이앱 응답은 JSON이 아니라 "state=1&errorMessage=&mul_no=...&payurl=..." 형태의
// URL-encoded 쿼리 문자열이다 (공식 문서 예시 그대로).
async function payappRequest(params: Record<string, string>): Promise<URLSearchParams> {
  const response = await fetch(PAYAPP_API_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
    body: new URLSearchParams(params),
  });
  const text = await response.text();
  return new URLSearchParams(text);
}

function siteOrigin(): string {
  return process.env.PUBLIC_SITE_URL || "https://beginner.today";
}

export const createTrialOrder = createServerFn({ method: "POST" })
  .inputValidator(createTrialOrderSchema)
  .handler(async ({ data }): Promise<{ payurl: string }> => {
    const { userid, linkkey } = getPayappCredentials();
    const amount = TRIAL_PLAN_PRICES[data.plan];
    const orderId = crypto.randomUUID();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("landing_trial_orders").insert({
      order_id: orderId,
      email: data.email,
      phone: data.phone,
      job_role: data.jobRole,
      company_type: data.companyType,
      plan: data.plan,
      amount,
      status: "pending",
    });
    if (insertError) {
      console.error("Failed to insert trial order:", insertError);
      throw new Error("주문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    const origin = siteOrigin();
    const result = await payappRequest({
      cmd: "payrequest",
      userid,
      linkkey,
      goodname: `직무 체험 - ${data.jobRole}`,
      price: String(amount),
      recvphone: data.phone,
      shopname: "Beginner",
      smsuse: "n",
      skip_cstpage: "y",
      var1: orderId,
      feedbackurl: `${origin}/api/payapp/feedback`,
      returnurl: `${origin}/lp/trial-complete?order=${orderId}`,
    });

    if (result.get("state") !== "1") {
      const errorMessage = result.get("errorMessage") || "알 수 없는 오류";
      console.error("PayApp payrequest failed:", errorMessage);
      await supabaseAdmin.from("landing_trial_orders").update({ status: "failed" }).eq("order_id", orderId);
      throw new Error("결제 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    const payurl = result.get("payurl");
    if (!payurl) {
      console.error("PayApp payrequest missing payurl:", Object.fromEntries(result));
      throw new Error("결제 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return { payurl };
  });

const trialOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
});

export type TrialOrderStatus = {
  status: "pending" | "paid" | "failed" | "canceled" | "refunded";
  plan: keyof typeof TRIAL_PLAN_PRICES;
  amount: number;
};

// 공개 엔드포인트: 완료 페이지 폴링용. 이메일·전화번호 등 개인정보는 절대 반환하지 않는다.
export const getTrialOrderStatus = createServerFn({ method: "GET" })
  .inputValidator(trialOrderStatusSchema)
  .handler(async ({ data }): Promise<TrialOrderStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("landing_trial_orders")
      .select("status, plan, amount")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (error) {
      console.error("Failed to load trial order status:", error);
      throw new Error("주문 상태를 확인하지 못했습니다.");
    }
    if (!row) {
      throw new Error("주문을 찾을 수 없습니다.");
    }
    return {
      status: row.status as TrialOrderStatus["status"],
      plan: row.plan as TrialOrderStatus["plan"],
      amount: row.amount,
    };
  });

// 페이앱 웹훅(feedbackurl). src/server.ts가 /api/payapp/feedback으로 연결한다.
// createServerFn을 쓰지 않는 이유: 외부 시스템이 form-urlencoded로 POST하고
// attachSupabaseAuth 미들웨어(Bearer 토큰 전제)와 무관하기 때문 — onboarding.functions.ts 선례.
export async function handlePayappFeedbackRequest(request: Request): Promise<Response> {
  const SUCCESS = new Response("SUCCESS", { status: 200 });

  let form: URLSearchParams;
  try {
    const text = await request.text();
    form = new URLSearchParams(text);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const linkval = process.env.PAYAPP_LINKVAL;
  if (!linkval || form.get("linkval") !== linkval) {
    console.error("PayApp feedback linkval mismatch");
    return new Response("Unauthorized", { status: 401 });
  }

  const orderId = form.get("var1");
  const mulNo = form.get("mul_no");
  const payState = form.get("pay_state");
  const price = form.get("price");
  const payType = form.get("pay_type");

  if (!orderId || !mulNo || !payState) {
    console.error("PayApp feedback missing required fields:", Object.fromEntries(form));
    return SUCCESS; // 재시도를 유발하지 않는다 — 페이앱 쪽 데이터 문제로 우리 쪽 재처리로 해결되지 않음.
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error: fetchError } = await supabaseAdmin
    .from("landing_trial_orders")
    .select("order_id, amount, status, mul_no")
    .eq("order_id", orderId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to load order for PayApp feedback:", fetchError);
    return SUCCESS;
  }
  if (!order) {
    console.error("PayApp feedback for unknown order:", orderId);
    return SUCCESS;
  }
  // 멱등: 이미 이 mul_no로 처리된 주문이면 재처리하지 않는다 (페이앱이 최대 10회 재시도).
  if (order.mul_no === mulNo && order.status !== "pending") {
    return SUCCESS;
  }

  if (price && Number(price) !== order.amount) {
    console.error("PayApp feedback amount mismatch:", { orderId, expected: order.amount, received: price });
    return SUCCESS;
  }

  let nextStatus: string | null = null;
  if (payState === "4") nextStatus = "paid";
  else if (["8", "9", "32", "64"].includes(payState)) nextStatus = "canceled";
  // 10(가상계좌 입금대기)·기타 값은 상태를 바꾸지 않고 로그만 남긴다.

  if (!nextStatus) {
    return SUCCESS;
  }

  const { error: updateError } = await supabaseAdmin
    .from("landing_trial_orders")
    .update(
      nextStatus === "paid"
        ? { status: nextStatus, mul_no: mulNo, paid_at: new Date().toISOString(), pay_type: payType }
        : { status: nextStatus, mul_no: mulNo },
    )
    .eq("order_id", orderId);

  if (updateError) {
    console.error("Failed to update order from PayApp feedback:", updateError);
    return SUCCESS;
  }

  if (nextStatus === "paid") {
    await notifyDiscord("결제 완료 (직무 체험)", [
      { name: "주문", value: orderId, inline: true },
      { name: "금액", value: `${order.amount.toLocaleString()}원`, inline: true },
    ]);
  }

  return SUCCESS;
}

// ── 관리자 ────────────────────────────────────────────────────────
export type AdminLandingLead = {
  id: string;
  email: string;
  createdAt: string;
};

export type AdminLandingTrialOrder = {
  id: string;
  orderId: string;
  email: string;
  phone: string;
  jobRole: string;
  companyType: string;
  plan: keyof typeof TRIAL_PLAN_PRICES;
  amount: number;
  status: string;
  payType: string;
  paidAt: string;
  deliveredAt: string;
  refundedAt: string;
  refundReason: string;
  createdAt: string;
};

export type AdminLandingData = {
  leads: AdminLandingLead[];
  orders: AdminLandingTrialOrder[];
};

export const getAdminLandingData = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminLandingData> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [leadsRes, ordersRes] = await Promise.all([
      supabaseAdmin.from("landing_leads").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("landing_trial_orders").select("*").order("created_at", { ascending: false }),
    ]);
    if (leadsRes.error) {
      console.error("Failed to load landing leads:", leadsRes.error);
      throw new Error("리드 목록을 불러오지 못했습니다.");
    }
    if (ordersRes.error) {
      console.error("Failed to load landing trial orders:", ordersRes.error);
      throw new Error("주문 목록을 불러오지 못했습니다.");
    }
    return {
      leads: (leadsRes.data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        createdAt: formatDateTime(row.created_at),
      })),
      orders: (ordersRes.data ?? []).map((row) => ({
        id: row.id,
        orderId: row.order_id,
        email: row.email,
        phone: row.phone,
        jobRole: row.job_role,
        companyType: row.company_type,
        plan: row.plan as keyof typeof TRIAL_PLAN_PRICES,
        amount: row.amount,
        status: row.status,
        payType: row.pay_type ?? "",
        paidAt: row.paid_at ? formatDateTime(row.paid_at) : "",
        deliveredAt: row.delivered_at ? formatDateTime(row.delivered_at) : "",
        refundedAt: row.refunded_at ? formatDateTime(row.refunded_at) : "",
        refundReason: row.refund_reason ?? "",
        createdAt: formatDateTime(row.created_at),
      })),
    };
  },
);

const markDeliveredSchema = z.object({ orderId: z.string().uuid() });

export const markTrialOrderDelivered = createServerFn({ method: "POST" })
  .inputValidator(markDeliveredSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("landing_trial_orders")
      .update({ delivered_at: new Date().toISOString() })
      .eq("order_id", data.orderId);
    if (error) {
      console.error("Failed to mark trial order delivered:", error);
      throw new Error("발송 완료 처리에 실패했습니다.");
    }
    return { ok: true as const };
  });

const refundTrialOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(1).max(300),
});

export const refundTrialOrder = createServerFn({ method: "POST" })
  .inputValidator(refundTrialOrderSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { userid, linkkey } = getPayappCredentials();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("landing_trial_orders")
      .select("status, mul_no")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (fetchError) {
      console.error("Failed to load order for refund:", fetchError);
      throw new Error("주문을 불러오지 못했습니다.");
    }
    if (!order || order.status !== "paid" || !order.mul_no) {
      throw new Error("환불 가능한 결제 완료 주문이 아닙니다.");
    }

    const result = await payappRequest({
      cmd: "paycancel",
      userid,
      linkkey,
      mul_no: order.mul_no,
      cancelmemo: data.reason,
    });

    if (result.get("state") !== "1") {
      const errorMessage = result.get("errorMessage") || "알 수 없는 오류";
      console.error("PayApp paycancel failed:", errorMessage);
      throw new Error(`페이앱 취소에 실패했습니다: ${errorMessage}`);
    }

    const { error: updateError } = await supabaseAdmin
      .from("landing_trial_orders")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_reason: data.reason,
      })
      .eq("order_id", data.orderId);
    if (updateError) {
      console.error("Failed to update order after refund:", updateError);
      throw new Error("환불 처리 중 오류가 발생했습니다.");
    }
    return { ok: true as const };
  });
