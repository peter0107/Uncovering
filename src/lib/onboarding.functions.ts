import { z } from "zod";

const onboardingPayloadSchema = z.object({
  jobInterests: z.array(z.string().trim().min(1)).min(1).max(25),
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

export async function handleCompleteOnboardingRequest(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse({ error: "로그인이 필요합니다." }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "잘못된 요청입니다." }, 400);
  }

  const parsed = onboardingPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse({ error: "관심 직무를 선택해주세요." }, 400);
  }

  const token = authorization.slice("Bearer ".length).trim();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return jsonResponse({ error: "로그인이 필요합니다." }, 401);
  }

  const { error } = await supabaseAdmin.from("job_seekers").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      job_interests: parsed.data.jobInterests,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[Complete onboarding]", error);
    return jsonResponse({ error: "온보딩 정보를 저장하지 못했습니다." }, 500);
  }

  return jsonResponse({ ok: true });
}
