import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adsRequestSchema = z.object({
  jobRole: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  companyName: z.string().trim().max(100).optional().default(""),
  website: z.string().max(0).optional().default(""),
});

async function notifyDiscord(data: { jobRole: string; email: string; companyName: string }) {
  const webhookUrl = process.env.DISCORD_FORM_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "Beginner 직무 요청",
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: "새 직무 시뮬레이션 요청",
            color: 1464803,
            fields: [
              { name: "알고 싶은 직무", value: data.jobRole, inline: false },
              { name: "알고 싶은 기업", value: data.companyName || "미입력", inline: true },
              { name: "이메일", value: data.email, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Discord form notification failed:", response.status);
    }
  } catch (error) {
    console.error("Discord form notification failed:", error);
  }
}

export const submitAdsRequest = createServerFn({ method: "POST" })
  .inputValidator(adsRequestSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const companyName = data.companyName.trim();
    const { error } = await supabaseAdmin.from("company_role_requests").insert({
      role_name: data.jobRole,
      company_name: companyName || "기업 미지정",
      requester_email: data.email,
      requester_id: null,
    });

    if (error) {
      console.error("Failed to insert form request:", error);
      throw new Error("제출하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    await notifyDiscord({
      jobRole: data.jobRole,
      email: data.email,
      companyName,
    });

    return { ok: true as const };
  });
