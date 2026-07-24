import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ confirmation: z.literal("탈퇴") }).parse(data))
  .handler(async () => {
    const request = getRequest();
    const authorization = request?.headers.get("authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      throw new Error("로그인이 필요합니다.");
    }

    const token = authorization.slice("Bearer ".length).trim();
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error("Backend is not configured");
    }

    const publicClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

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
