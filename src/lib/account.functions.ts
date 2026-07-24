import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const deleteAccountSchema = z.object({
  confirmation: z.literal("탈퇴"),
});

function getBearerToken(): string {
  const request = getRequest();
  const authorization = request?.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Error("로그인이 필요합니다.");
  }

  return authorization.slice("Bearer ".length).trim();
}

function createPublicServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Backend is not configured");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const deleteMyAccount = createServerFn({ method: "POST" })
  .validator(deleteAccountSchema)
  .handler(async () => {
    const token = getBearerToken();
    const publicClient = createPublicServerClient();
    const { data: userData, error: userError } = await publicClient.auth.getUser(token);
    const user = userData.user;

    if (userError || !user) {
      throw new Error("로그인이 필요합니다.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // job_seekers 삭제는 이력서와 제출물 등 사용자 소유 데이터의 FK cascade를 실행한다.
    const { error: seekerError } = await supabaseAdmin
      .from("job_seekers")
      .delete()
      .eq("id", user.id);

    if (seekerError) {
      console.error("Failed to delete job seeker data:", seekerError);
      throw new Error("회원 데이터 삭제에 실패했습니다.");
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error("Failed to delete auth user:", authError);
      throw new Error("계정 삭제에 실패했습니다.");
    }

    return { ok: true };
  });
