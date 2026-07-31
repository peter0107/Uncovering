import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adsRequestSchema = z.object({
  jobRole: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  companyName: z.string().trim().max(100).optional().default(""),
  website: z.string().max(0).optional().default(""),
});

export const submitAdsRequest = createServerFn({ method: "POST" })
  .inputValidator(adsRequestSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const companyName = data.companyName.trim();
    const { error } = await supabaseAdmin.from("ads_requests").insert({
      job_role: data.jobRole,
      email: data.email,
      company_name: companyName || null,
    });

    if (error) {
      console.error("Failed to insert ads request:", error);
      throw new Error("제출하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return { ok: true as const };
  });
