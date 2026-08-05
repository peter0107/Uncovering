import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const exitReasonSchema = z.enum([
  "too_difficult",
  "too_long",
  "too_much_effort",
  "not_fun",
  "other",
]);

const submitExitSurveySchema = z
  .object({
    simulationId: z.string().uuid(),
    reason: exitReasonSchema,
    otherText: z.string().trim().max(300).optional().default(""),
    stepIndex: z.number().int().min(1),
    totalSteps: z.number().int().min(1),
    answeredCount: z.number().int().min(0),
    elapsedSeconds: z.number().int().min(0),
  })
  .superRefine((data, context) => {
    if (data.reason === "other" && !data.otherText) {
      context.addIssue({
        code: "custom",
        path: ["otherText"],
        message: "기타 이유를 입력해 주세요.",
      });
    }
  });

const deleteExitSurveySchema = z.object({
  id: z.string().uuid(),
});

function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Backend is not configured");
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

export type AdminExitSurvey = {
  id: string;
  reason: z.infer<typeof exitReasonSchema>;
  otherText: string;
  simulationId: string;
  simulationTitle: string;
  applicantName: string;
  stepIndex: number;
  totalSteps: number;
  answeredCount: number;
  elapsedSeconds: number;
  createdAt: string;
};

export const submitSimulationExitSurvey = createServerFn({ method: "POST" })
  .inputValidator(submitExitSurveySchema)
  .handler(async ({ data }) => {
    const user = await getRequestUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("simulation_exit_surveys").insert({
      job_seeker_id: user.id,
      job_simulation_id: data.simulationId,
      reason: data.reason,
      other_text: data.reason === "other" ? data.otherText : null,
      step_index: data.stepIndex,
      total_steps: data.totalSteps,
      answered_count: data.answeredCount,
      elapsed_seconds: data.elapsedSeconds,
    });
    if (error) {
      console.error("Failed to save simulation exit survey:", error);
      throw new Error("이탈 설문을 저장하지 못했습니다.");
    }
    return { ok: true as const };
  });

export const getAdminSimulationExitSurveys = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminExitSurvey[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("simulation_exit_surveys")
      .select(
        "id, reason, other_text, job_simulation_id, step_index, total_steps, answered_count, elapsed_seconds, created_at, job_simulations(title), job_seekers(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("Failed to load simulation exit surveys:", error);
      throw new Error("이탈 설문 목록을 불러오지 못했습니다.");
    }

    return (data ?? []).map((row) => {
      const simulation = row.job_simulations as { title?: string | null } | null;
      const seeker = row.job_seekers as { display_name?: string | null } | null;
      return {
        id: row.id,
        reason: exitReasonSchema.parse(row.reason),
        otherText: row.other_text ?? "",
        simulationId: row.job_simulation_id,
        simulationTitle: simulation?.title ?? "삭제된 시뮬레이션",
        applicantName: seeker?.display_name ?? "알 수 없음",
        stepIndex: row.step_index,
        totalSteps: row.total_steps,
        answeredCount: row.answered_count,
        elapsedSeconds: row.elapsed_seconds,
        createdAt: row.created_at,
      };
    });
  },
);

export const deleteAdminSimulationExitSurvey = createServerFn({ method: "POST" })
  .inputValidator(deleteExitSurveySchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("simulation_exit_surveys")
      .delete()
      .eq("id", data.id);

    if (error) {
      console.error("Failed to delete simulation exit survey:", error);
      throw new Error("이탈 설문을 삭제하지 못했습니다.");
    }

    return { ok: true as const };
  });
