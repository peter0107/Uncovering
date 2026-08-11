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

// Discord 알림. 웹훅 미설정 시 조용히 skip.
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

// ── 업무 의뢰 상담 ────────────────────────────────────────────────
const landingLeadSchema = z.object({
  companyName: z.string().trim().min(1).max(100),
  contactName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(9).max(20).regex(/^[\d\-+() ]+$/),
  requestDetail: z.string().trim().min(1).max(2000),
  website: z.string().max(0).optional().default(""), // honeypot
});

export const submitLandingLead = createServerFn({ method: "POST" })
  .inputValidator(landingLeadSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("landing_leads").insert({
      email: data.email,
      source: "outsourcing",
      payload: {
        companyName: data.companyName,
        contactName: data.contactName,
        phone: data.phone,
        requestDetail: data.requestDetail,
      },
    });
    if (error) {
      console.error("Failed to insert landing lead:", error);
      throw new Error("접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    await notifyDiscord("새 업무 의뢰 상담 신청", [
      { name: "기업", value: data.companyName, inline: true },
      { name: "담당자", value: data.contactName, inline: true },
      { name: "이메일", value: data.email, inline: true },
      { name: "연락처", value: data.phone, inline: true },
      { name: "의뢰 내용", value: data.requestDetail.slice(0, 1024), inline: false },
    ]);
    return { ok: true as const };
  });

// ── 27b: 직무 체험 주문 (PG: 페이앱) ─────────────────────────────
export const TRIAL_PLAN_PRICES = {
  single: 3990,
  pack3: 19800,
  monthly: 29000,
} as const;

export const TRIAL_SINGLE_ORIGINAL_PRICE = 25000;
export const TRIAL_SINGLE_DISCOUNT_PERCENT = 84;

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
  agreedToTerms: z.literal(true),
  website: z.string().max(0).optional().default(""), // honeypot
});

// 연락처는 더 이상 폼에서 받지 않는다 — 페이앱 payrequest API가 recvphone을 필수로
// 요구해서 고정값을 보낸다. smsuse=n이라 실제로 SMS는 발송되지 않는다.
const PLACEHOLDER_PHONE = "010-0000-0000";

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
      phone: PLACEHOLDER_PHONE,
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
      recvphone: PLACEHOLDER_PHONE,
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
    .select("order_id, amount, status, mul_no, email, job_role, company_type")
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
    // 위 멱등 가드(mul_no 일치 + status != pending)가 페이앱 재시도를 걸러내므로 메일도 1회만 나간다.
    try {
      await sendGmail({
        to: order.email,
        subject: `[Beginner] 결제가 완료됐어요 · ${order.job_role} 체험 과제를 준비하고 있어요`,
        html: buildTrialPaidEmailHtml({
          jobRole: order.job_role,
          companyType: order.company_type,
          amount: order.amount,
        }),
      });
    } catch (err) {
      // 메일 실패로 웹훅을 실패시키지 않는다 — 결제 상태 갱신이 더 중요하다.
      console.error("Trial paid confirmation email failed:", orderId, err);
    }

    await notifyDiscord("결제 완료 (직무 체험)", [
      { name: "주문", value: orderId, inline: true },
      { name: "금액", value: `${order.amount.toLocaleString()}원`, inline: true },
      { name: "이메일", value: order.email, inline: true },
      { name: "신청 직무", value: order.job_role, inline: true },
    ]);
  }

  return SUCCESS;
}

// ── 관리자 ────────────────────────────────────────────────────────
export type AdminLandingLead = {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  requestDetail: string;
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
  /** 이 주문에 배정된 전용 시뮬레이션 */
  simulationId: string;
  simulationTitle: string;
  /** 현직자 검수 링크 토큰 (배정 시 발급) */
  reviewToken: string;
  reviewCount: number;
  /** 가장 최근 검수 판정. approved | revise | "" */
  reviewVerdict: string;
  /** 과제 수정 후 새 현직자 검수가 필요한지 여부 */
  reviewRequired: boolean;
  accessCode: string;
  answerSubmittedAt: string;
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

    // 배정된 시뮬레이션 제목·검수 토큰과 현직자 검수 현황을 곁들인다.
    const simulationIds = [
      ...new Set((ordersRes.data ?? []).map((row) => row.simulation_id).filter(Boolean)),
    ] as string[];

    const simulations = new Map<string, { title: string; token: string }>();
    const reviews = new Map<string, { count: number; verdict: string }>();

    if (simulationIds.length > 0) {
      const [simRes, reviewRes] = await Promise.all([
        supabaseAdmin
          .from("job_simulations")
          .select("id, title, feedback_share_token")
          .in("id", simulationIds),
        supabaseAdmin
          .from("expert_simulation_share_feedback")
          .select("simulation_id, verdict, created_at")
          .in("simulation_id", simulationIds)
          .order("created_at", { ascending: false }),
      ]);
      if (simRes.error) {
        console.error("Failed to load trial simulations:", simRes.error);
      } else {
        for (const row of simRes.data ?? []) {
          simulations.set(row.id, {
            title: row.title ?? "",
            token: row.feedback_share_token ?? "",
          });
        }
      }
      if (reviewRes.error) {
        console.error("Failed to load trial review feedback:", reviewRes.error);
      } else {
        for (const row of reviewRes.data ?? []) {
          const current = reviews.get(row.simulation_id) ?? { count: 0, verdict: "" };
          // created_at 내림차순이라 첫 판정이 최신이다.
          reviews.set(row.simulation_id, {
            count: current.count + 1,
            verdict: current.verdict || (row.verdict ?? ""),
          });
        }
      }
    }

    return {
      leads: (leadsRes.data ?? []).map((row) => {
        const payload: Record<string, unknown> =
          row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
            ? (row.payload as Record<string, unknown>)
            : {};
        const value = (key: string): string => {
          const item = payload[key];
          return typeof item === "string" ? item : "";
        };
        return {
          id: row.id,
          email: row.email,
          companyName: value("companyName"),
          contactName: value("contactName"),
          phone: value("phone"),
          requestDetail: value("requestDetail"),
          createdAt: formatDateTime(row.created_at),
        };
      }),
      orders: (ordersRes.data ?? []).map((row) => {
        const simulation = row.simulation_id ? simulations.get(row.simulation_id) : undefined;
        const review = row.simulation_id ? reviews.get(row.simulation_id) : undefined;
        return {
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
          simulationId: row.simulation_id ?? "",
          simulationTitle: simulation?.title ?? "",
          reviewToken: simulation?.token ?? "",
          reviewCount: review?.count ?? 0,
          reviewVerdict: review?.verdict ?? "",
          reviewRequired: row.review_required === true,
          accessCode: row.access_code ?? "",
          answerSubmittedAt: row.answer_submitted_at
            ? formatDateTime(row.answer_submitted_at)
            : "",
        };
      }),
    };
  },
);

const markDeliveredSchema = z.object({ orderId: z.string().uuid() });

export const markTrialOrderDelivered = createServerFn({ method: "POST" })
  .inputValidator(markDeliveredSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: orderError } = await supabaseAdmin
      .from("landing_trial_orders")
      .select("order_id, status, simulation_id, review_required")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (orderError || !order) throw new Error("주문을 찾을 수 없습니다.");
    if (order.status !== "paid" || !order.simulation_id) {
      throw new Error("결제 완료된 배정 과제만 완료 처리할 수 있습니다.");
    }
    if (order.review_required) {
      throw new Error("수정된 과제는 현직자 재검수 후 완료 처리할 수 있습니다.");
    }
    const { count: reviewCount, error: reviewError } = await supabaseAdmin
      .from("expert_simulation_share_feedback")
      .select("id", { count: "exact", head: true })
      .eq("simulation_id", order.simulation_id);
    if (reviewError || !reviewCount) {
      throw new Error("현직자 검수 의견을 받은 후 완료 처리할 수 있습니다.");
    }
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

// ── 체험 과제 배정 · 검수 · 코드 발급 ──────────────────────────────
// 흐름: [과제 생성/배정] → 현직자 검수 → [코드 발급] → [발송 완료] → 결제자 열람
// 결제자 코드는 status='paid' AND delivered_at is not null 일 때만 통한다 (trial-task.functions.ts).

/** 혼동하기 쉬운 글자(I·L·O·0·1)를 뺀 31자 알파벳. */
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_LENGTH = 10;

// 레포에 코드 대입 방어(레이트리밋)가 없으므로 길이로 방어한다. 31^10 ≈ 8.2e14.
function generateAccessCode(): string {
  // 256 % 31 != 0 이라 나머지 연산은 앞 글자에 편향이 생긴다. 248 이상은 버려 균등하게 뽑는다.
  const limit = Math.floor(256 / ACCESS_CODE_ALPHABET.length) * ACCESS_CODE_ALPHABET.length;
  let code = "";
  while (code.length < ACCESS_CODE_LENGTH) {
    const bytes = new Uint8Array(ACCESS_CODE_LENGTH);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length];
      if (code.length === ACCESS_CODE_LENGTH) break;
    }
  }
  return code;
}

type SupabaseAdminClient = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** 고유코드를 발급해 저장한다 (unique 충돌 시 최대 5회 재시도). */
async function assignAccessCode(
  supabaseAdmin: SupabaseAdminClient,
  orderId: string,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const accessCode = generateAccessCode();
    const { error } = await supabaseAdmin
      .from("landing_trial_orders")
      .update({ access_code: accessCode })
      .eq("order_id", orderId);
    if (!error) return accessCode;
    if (error.code !== "23505") {
      console.error("Failed to issue trial access code:", error);
      throw new Error("코드를 발급하지 못했습니다.");
    }
  }
  throw new Error("코드를 발급하지 못했습니다. 다시 시도해주세요.");
}

const assignTrialSimulationSchema = z.object({
  orderId: z.string().uuid(),
  simulationId: z.string().uuid(),
});

/** 주문에 전용 시뮬레이션을 연결하고 현직자 검수 링크 토큰을 발급한다. */
export const assignTrialSimulation = createServerFn({ method: "POST" })
  .inputValidator(assignTrialSimulationSchema)
  .handler(async ({ data }): Promise<{ reviewToken: string }> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("landing_trial_orders")
      .select("order_id, status")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (orderError) {
      console.error("Failed to load trial order for assignment:", orderError);
      throw new Error("주문을 불러오지 못했습니다.");
    }
    if (!order) throw new Error("주문을 찾을 수 없습니다.");
    if (order.status !== "paid") throw new Error("결제 완료된 주문에만 과제를 배정할 수 있습니다.");

    const { data: simulation, error: simulationError } = await supabaseAdmin
      .from("job_simulations")
      .select("id, feedback_share_token")
      .eq("id", data.simulationId)
      .is("deleted_at", null)
      .maybeSingle();
    if (simulationError) {
      console.error("Failed to load simulation for trial assignment:", simulationError);
      throw new Error("시뮬레이션을 불러오지 못했습니다.");
    }
    if (!simulation) throw new Error("시뮬레이션을 찾을 수 없습니다.");

    const reviewToken = simulation.feedback_share_token ?? crypto.randomUUID();

    // 체험 과제는 절대 공개 목록에 뜨면 안 된다.
    const { error: markError } = await supabaseAdmin
      .from("job_simulations")
      .update({
        simulation_source: "trial",
        is_public: false,
        feedback_share_token: reviewToken,
      })
      .eq("id", data.simulationId);
    if (markError) {
      console.error("Failed to mark simulation as trial:", markError);
      throw new Error("과제를 체험용으로 전환하지 못했습니다.");
    }

    const { error: linkError } = await supabaseAdmin
      .from("landing_trial_orders")
      .update({
        simulation_id: data.simulationId,
        review_required: true,
        trial_content_updated_at: new Date().toISOString(),
        last_reviewed_at: null,
      })
      .eq("order_id", data.orderId);
    if (linkError) {
      console.error("Failed to link trial simulation to order:", linkError);
      throw new Error("주문에 과제를 연결하지 못했습니다.");
    }

    return { reviewToken };
  });

const issueTrialAccessCodeSchema = z.object({ orderId: z.string().uuid() });

/** 결제자 고유코드를 발급한다. 재발급하면 기존 코드는 즉시 무효가 된다. */
export const issueTrialAccessCode = createServerFn({ method: "POST" })
  .inputValidator(issueTrialAccessCodeSchema)
  .handler(async ({ data }): Promise<{ accessCode: string }> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("landing_trial_orders")
      .select("order_id, status, simulation_id, review_required")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (orderError) {
      console.error("Failed to load trial order for code issue:", orderError);
      throw new Error("주문을 불러오지 못했습니다.");
    }
    if (!order) throw new Error("주문을 찾을 수 없습니다.");
    if (order.status !== "paid") throw new Error("결제 완료된 주문에만 코드를 발급할 수 있습니다.");
    if (!order.simulation_id) throw new Error("먼저 과제를 배정해주세요.");
    if (order.review_required) {
      throw new Error("수정된 과제는 현직자 재검수 후 코드를 발급할 수 있습니다.");
    }

    // 클라이언트 게이트를 우회해도 서버가 다시 막는다 — 검수 의견이 하나라도 있어야 한다.
    // 승인/수정 구분은 없다 — 현직자는 의견만 남기고, 관리자가 내용을 보고 최종 승인한다.
    const { count: reviewCount, error: reviewError } = await supabaseAdmin
      .from("expert_simulation_share_feedback")
      .select("id", { count: "exact", head: true })
      .eq("simulation_id", order.simulation_id);
    if (reviewError) {
      console.error("Failed to load review count for code issue:", reviewError);
      throw new Error("검수 상태를 확인하지 못했습니다.");
    }
    if (!reviewCount) {
      throw new Error("현직자 검수 의견을 받은 후 코드를 발급할 수 있습니다.");
    }

    return { accessCode: await assignAccessCode(supabaseAdmin, data.orderId) };
  });

// ── 체험 과제 이메일 자동 발송 (Gmail API) ────────────────────────
// info@beginner.today는 사용자 Gmail 계정에 "보내는 사람" 별칭으로 이미 등록돼 있어,
// Cloudflare Workers에서 못 여는 SMTP 소켓 대신 Gmail REST API(fetch)로 그 계정을 통해 보낸다.

async function getGmailAccessToken(): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail 발송 설정이 완료되지 않았습니다.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    console.error("Gmail token refresh failed:", response.status, await response.text());
    throw new Error("이메일 인증에 실패했습니다.");
  }
  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeMimeSubject(subject: string): string {
  // 제목에 한글이 들어가므로 MIME encoded-word로 인코딩한다.
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
}

function buildTrialTaskEmailHtml(params: {
  jobRole: string;
  companyType: string;
  taskLink: string;
}): string {
  return `<!doctype html>
<html lang="ko"><body style="margin:0;padding:0;background:#F5F6F9;font-family:'Wanted Sans Variable','Wanted Sans',-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:40px 20px;">
  <div style="background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E7E9EE;">
    <div style="padding:40px 36px 36px;">
      <p style="font-size:15px;color:#14181F;line-height:1.7;margin:0 0 22px;">안녕하세요, Beginner예요.<br />신청하신 체험 과제 검수가 끝나서 보내드려요.</p>
      <div style="border:1px solid #E7E9EE;border-radius:12px;padding:18px 20px;margin:0 0 26px;">
        <p style="font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#435BDA;margin:0 0 6px;">신청 정보</p>
        <p style="font-size:16px;font-weight:800;color:#14181F;margin:0;">${params.jobRole}</p>
        <p style="font-size:13px;color:#6B7280;margin:3px 0 0;">${params.companyType}</p>
      </div>
      <a href="${params.taskLink}" style="display:block;text-align:center;background:#435BDA;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 0;border-radius:10px;margin:0 0 24px;">체험 과제 열기 →</a>
      <p style="font-size:12.5px;color:#9AA2AE;line-height:1.7;margin:0 0 26px;">이 링크는 본인만 사용할 수 있으니 다른 사람과 공유하지 말아주세요.<br />궁금한 점이 있으면 이 메일에 회신해주세요.</p>
      <p style="font-size:14px;color:#14181F;margin:0;">Beginner 드림</p>
    </div>
    <div style="background:#FAFAFB;border-top:1px solid #E7E9EE;padding:16px 36px;font-size:11.5px;color:#9AA2AE;">이 메일은 Beginner 체험 신청자에게 발송되는 안내 메일이에요.</div>
  </div>
</div>
</body></html>`;
}

async function sendGmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const from = "Beginner <info@beginner.today>";
  const { to, subject, html } = params;

  const rawMessage =
    `From: ${from}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${encodeMimeSubject(subject)}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
    html;

  const accessToken = await getGmailAccessToken();
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw: base64UrlEncode(rawMessage) }),
  });
  if (!response.ok) {
    console.error("Gmail send failed:", response.status, await response.text());
    throw new Error(`이메일 발송에 실패했습니다 (${response.status}).`);
  }
}

async function sendTrialTaskEmail(params: {
  to: string;
  jobRole: string;
  companyType: string;
  taskLink: string;
}): Promise<void> {
  await sendGmail({
    to: params.to,
    subject: `[Beginner] ${params.jobRole} 체험 과제가 도착했어요`,
    html: buildTrialTaskEmailHtml(params),
  });
}

function buildTrialPaidEmailHtml(params: { jobRole: string; companyType: string; amount: number }): string {
  return `<!doctype html>
<html lang="ko"><body style="margin:0;padding:0;background:#F5F6F9;font-family:'Wanted Sans Variable','Wanted Sans',-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:40px 20px;">
  <div style="background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E7E9EE;">
    <div style="padding:40px 36px 36px;">
      <p style="font-size:15px;color:#14181F;line-height:1.7;margin:0 0 22px;">안녕하세요, Beginner예요.<br />결제가 정상적으로 완료됐어요. 신청하신 직무에 맞는 체험 과제를 지금 만들기 시작했어요.</p>
      <div style="border:1px solid #E7E9EE;border-radius:12px;padding:18px 20px;margin:0 0 26px;">
        <p style="font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#435BDA;margin:0 0 6px;">신청 정보</p>
        <p style="font-size:16px;font-weight:800;color:#14181F;margin:0;">${params.jobRole}</p>
        <p style="font-size:13px;color:#6B7280;margin:3px 0 0;">${params.companyType} · 결제금액 ${params.amount.toLocaleString()}원</p>
      </div>
      <p style="font-size:15px;color:#14181F;line-height:1.7;margin:0 0 26px;">과제는 현직자 검수를 거쳐 <strong>24시간 안에</strong> 이 메일 주소로 보내드릴게요.<br />조금만 기다려주세요.</p>
      <p style="font-size:12.5px;color:#9AA2AE;line-height:1.7;margin:0 0 26px;">궁금한 점이 있으면 이 메일에 회신해주세요.</p>
      <p style="font-size:14px;color:#14181F;margin:0;">Beginner 드림</p>
    </div>
    <div style="background:#FAFAFB;border-top:1px solid #E7E9EE;padding:16px 36px;font-size:11.5px;color:#9AA2AE;">이 메일은 Beginner 체험 신청자에게 발송되는 안내 메일이에요.</div>
  </div>
</div>
</body></html>`;
}

/**
 * 관리자의 "최종 승인" 클릭에서만 호출한다. 현직자가 검수 의견을 남기는 것만으로는
 * 절대 자동 실행되지 않는다 — 관리자가 그 내용을 직접 읽고 이 버튼으로 최종 승인해야 한다.
 * 절대 throw하지 않고 결과 객체로 성공/실패를 알린다.
 */
async function deliverTrialTaskEmail(
  orderId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("landing_trial_orders")
      .select("order_id, status, email, job_role, company_type, access_code, simulation_id, review_required")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error || !order) return { ok: false, reason: "order-not-found" };
    if (order.status !== "paid") return { ok: false, reason: "not-paid" };
    if (!order.simulation_id) return { ok: false, reason: "no-simulation" };
    if (order.review_required) return { ok: false, reason: "needs-review" };

    // UI 가드를 우회한 호출을 막기 위해 서버에서도 재확인한다 — 승인/수정 구분 없이
    // 검수 의견이 하나라도 있으면 된다. 그 내용을 관리자가 직접 읽고 이 버튼으로 승인한다.
    const { count: reviewCount } = await supabaseAdmin
      .from("expert_simulation_share_feedback")
      .select("id", { count: "exact", head: true })
      .eq("simulation_id", order.simulation_id);
    if (!reviewCount) return { ok: false, reason: "not-approved" };

    const accessCode = order.access_code ?? (await assignAccessCode(supabaseAdmin, order.order_id));
    const taskLink = `${siteOrigin()}/lp/trial-task?code=${accessCode}`;

    await sendTrialTaskEmail({
      to: order.email,
      jobRole: order.job_role,
      companyType: order.company_type,
      taskLink,
    });

    const { error: updateError } = await supabaseAdmin
      .from("landing_trial_orders")
      .update({ delivered_at: new Date().toISOString() })
      .eq("order_id", order.order_id);
    if (updateError) {
      console.error("Trial task email sent but delivered_at update failed:", updateError);
      return { ok: false, reason: "delivered-flag-not-set" };
    }

    await notifyDiscord("체험 과제 최종 승인 · 발송 완료", [
      { name: "이메일", value: order.email, inline: true },
      { name: "직무", value: order.job_role, inline: true },
      { name: "코드", value: accessCode, inline: true },
    ]);
    return { ok: true };
  } catch (err) {
    console.error("deliverTrialTaskEmail failed:", err);
    return { ok: false, reason: "unexpected-error" };
  }
}

const finalizeTrialTaskDeliverySchema = z.object({ orderId: z.string().uuid() });

const FINALIZE_ERROR_MESSAGES: Record<string, string> = {
  "order-not-found": "주문을 찾을 수 없습니다.",
  "not-paid": "결제 완료된 주문이 아닙니다.",
  "no-simulation": "배정된 과제가 없습니다.",
  "needs-review": "수정된 과제는 현직자 재검수 후 발송할 수 있습니다.",
  "not-approved": "현직자 검수 의견이 아직 없습니다.",
  "delivered-flag-not-set": "메일은 발송됐지만 상태 갱신에 실패했습니다. 다시 시도해주세요.",
  "unexpected-error": "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
};

/** 관리자의 "최종 승인 · 발송" 버튼이 호출한다 — 코드 발급(필요 시)과 이메일 발송을 함께 처리. */
export const finalizeTrialTaskDelivery = createServerFn({ method: "POST" })
  .inputValidator(finalizeTrialTaskDeliverySchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const result = await deliverTrialTaskEmail(data.orderId);
    if (!result.ok) {
      throw new Error(FINALIZE_ERROR_MESSAGES[result.reason] ?? FINALIZE_ERROR_MESSAGES["unexpected-error"]);
    }
    return { ok: true as const };
  });

export type TrialReviewFeedback = {
  id: string;
  reviewerName: string;
  feedback: string;
  verdict: string;
  createdAt: string;
};

export type TrialOrderDetail = {
  reviews: TrialReviewFeedback[];
  answerText: string;
  answerSubmittedAt: string;
};

const trialOrderDetailSchema = z.object({ orderId: z.string().uuid() });

/** 주문 하나의 현직자 검수 의견과 결제자 제출 답안을 불러온다. */
export const getTrialOrderDetail = createServerFn({ method: "GET" })
  .inputValidator(trialOrderDetailSchema)
  .handler(async ({ data }): Promise<TrialOrderDetail> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("landing_trial_orders")
      .select("simulation_id, answer_text, answer_submitted_at")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (orderError) {
      console.error("Failed to load trial order detail:", orderError);
      throw new Error("주문을 불러오지 못했습니다.");
    }
    if (!order) throw new Error("주문을 찾을 수 없습니다.");

    let reviews: TrialReviewFeedback[] = [];
    if (order.simulation_id) {
      const { data: rows, error } = await supabaseAdmin
        .from("expert_simulation_share_feedback")
        .select("id, reviewer_name, feedback, verdict, created_at")
        .eq("simulation_id", order.simulation_id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load trial review feedback:", error);
        throw new Error("검수 의견을 불러오지 못했습니다.");
      }
      reviews = (rows ?? []).map((row) => ({
        id: row.id,
        reviewerName: row.reviewer_name ?? "",
        feedback: row.feedback,
        verdict: row.verdict ?? "",
        createdAt: formatDateTime(row.created_at),
      }));
    }

    return {
      reviews,
      answerText: order.answer_text ?? "",
      answerSubmittedAt: order.answer_submitted_at
        ? formatDateTime(order.answer_submitted_at)
        : "",
    };
  });

const updateTrialOrderSchema = z.object({
  orderId: z.string().uuid(),
  jobRole: z.string().trim().min(1).max(100),
  companyType: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(9).max(20).regex(/^[\d\-+() ]+$/),
  plan: trialPlanSchema,
  status: z.enum(["pending", "paid", "failed", "canceled", "refunded"]),
});

/** 관리자가 구매자 정보·결제 상태를 직접 정리한다 (테스트 주문·오타 수정용). */
export const updateTrialOrder = createServerFn({ method: "POST" })
  .inputValidator(updateTrialOrderSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("landing_trial_orders")
      .update({
        job_role: data.jobRole,
        company_type: data.companyType,
        email: data.email,
        phone: data.phone,
        plan: data.plan,
        amount: TRIAL_PLAN_PRICES[data.plan],
        status: data.status,
      })
      .eq("order_id", data.orderId);
    if (error) {
      console.error("Failed to update trial order:", error);
      throw new Error("주문을 수정하지 못했습니다.");
    }
    return { ok: true as const };
  });

const deleteTrialOrderSchema = z.object({ orderId: z.string().uuid() });

/** 주문 행만 삭제한다 — 배정된 시뮬레이션·검수 의견은 건드리지 않는다. */
export const deleteTrialOrder = createServerFn({ method: "POST" })
  .inputValidator(deleteTrialOrderSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("landing_trial_orders")
      .delete()
      .eq("order_id", data.orderId);
    if (error) {
      console.error("Failed to delete trial order:", error);
      throw new Error("주문을 삭제하지 못했습니다.");
    }
    return { ok: true as const };
  });
