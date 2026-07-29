import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const USER_STORAGE_BUCKETS = ["avatars", "resumes", "resume-photos", "expert-verification", "mission-submissions"] as const;
const STORAGE_REMOVE_BATCH_SIZE = 100;

function isMissingBucketError(message: string) {
  return /bucket .* not found|bucket not found/i.test(message);
}

async function collectStorageFiles(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  bucket: (typeof USER_STORAGE_BUCKETS)[number],
  prefix: string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    if (isMissingBucketError(error.message)) return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id) {
      files.push(path);
      continue;
    }
    files.push(...(await collectStorageFiles(supabaseAdmin, bucket, path)));
  }

  return files;
}

async function deleteUserStorage(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  userId: string,
) {
  for (const bucket of USER_STORAGE_BUCKETS) {
    const files = await collectStorageFiles(supabaseAdmin, bucket, userId);
    for (let index = 0; index < files.length; index += STORAGE_REMOVE_BATCH_SIZE) {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove(files.slice(index, index + STORAGE_REMOVE_BATCH_SIZE));
      if (error) throw error;
    }
  }
}

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

    try {
      await deleteUserStorage(supabaseAdmin, user.id);
    } catch (storageError) {
      console.error("Failed to delete user storage:", storageError);
      throw new Error("회원 파일 삭제에 실패했습니다. 다시 시도해주세요.");
    }

    const { data: submissionRows, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("job_seeker_id", user.id);

    if (submissionError) {
      console.error("Failed to load user submissions:", submissionError);
      throw new Error("회원 데이터 삭제를 준비하지 못했습니다.");
    }

    const submissionIds = (submissionRows ?? []).map((submission) => submission.id);

    // 일부 초기 검토 데이터는 submission_id가 비어 있을 수 있어, 탈퇴 전에 명시적으로 정리한다.
    if (submissionIds.length > 0) {
      const cleanupResults = await Promise.all([
        supabaseAdmin.from("company_saved_applicants").delete().in("submission_id", submissionIds),
        supabaseAdmin.from("company_saved_applicants").delete().in("applicant_id", submissionIds),
        supabaseAdmin.from("company_applicant_review_states").delete().in("submission_id", submissionIds),
        supabaseAdmin.from("company_applicant_review_states").delete().in("applicant_id", submissionIds),
        supabaseAdmin.from("company_applicant_ai_reviews").delete().in("applicant_id", submissionIds),
        supabaseAdmin.from("company_simulation_ai_reviews").delete().in("applicant_id", submissionIds),
      ]);
      const cleanupError = cleanupResults.find((result) => result.error)?.error;
      if (cleanupError) {
        console.error("Failed to delete related applicant data:", cleanupError);
        throw new Error("회원 데이터 삭제에 실패했습니다.");
      }

      const { error: submissionsDeleteError } = await supabaseAdmin
        .from("submissions")
        .delete()
        .in("id", submissionIds);
      if (submissionsDeleteError) {
        console.error("Failed to delete submissions:", submissionsDeleteError);
        throw new Error("제출 데이터 삭제에 실패했습니다.");
      }
    }

    const { error: legacyApplicantError } = await supabaseAdmin
      .from("applicants")
      .delete()
      .eq("email", user.email ?? "");

    if (legacyApplicantError) {
      console.error("Failed to delete legacy applicant data:", legacyApplicantError);
      throw new Error("회원 데이터 삭제에 실패했습니다.");
    }

    // job_seekers 삭제는 이력서 등 사용자 소유 데이터의 FK cascade를 실행한다.
    const { error: seekerError } = await supabaseAdmin
      .from("job_seekers")
      .delete()
      .eq("id", user.id);

    if (seekerError) {
      console.error("Failed to delete job seeker data:", seekerError);
      throw new Error("회원 데이터 삭제에 실패했습니다.");
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id, false);
    if (authError) {
      console.error("Failed to delete auth user:", authError);
      throw new Error("계정 삭제에 실패했습니다.");
    }

    return { ok: true };
  });
