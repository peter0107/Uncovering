import { z } from "zod";

const nicknameSchema = z.string().trim().toLowerCase().min(2).max(20).regex(/^[0-9a-z가-힣_-]+$/);
const ADMIN_NICKNAME = "beginner";
const ADMIN_EMAIL = "u.ncovering2026@gmail.com";
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });

async function syntheticEmail(nickname: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nickname));
  const id = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
  return `${id}@nickname.beginner.today`;
}

export async function handleNicknameCheckRequest(request: Request) {
  const parsed = nicknameSchema.safeParse(new URL(request.url).searchParams.get("nickname") ?? "");
  if (!parsed.success) return json({ error: "사용할 수 없는 닉네임 형식입니다." }, 400);
  if (parsed.data === ADMIN_NICKNAME) return json({ available: false, admin: true });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("job_seekers").select("id").eq("nickname", parsed.data).limit(1).maybeSingle();
  if (error) return json({ error: "닉네임을 확인하지 못했습니다." }, 500);
  return json({ available: !data });
}

export async function handleNicknameLoginRequest(request: Request) {
  const payload = (await request.json().catch(() => null)) as { nickname?: unknown; password?: unknown } | null;
  const parsed = nicknameSchema.safeParse(payload?.nickname);
  if (!parsed.success) return json({ error: "닉네임은 2~20자의 한글, 영문, 숫자로 입력해주세요." }, 400);
  const nickname = parsed.data;
  const isAdmin = nickname === ADMIN_NICKNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim() || "beginner";
  if (isAdmin && payload?.password !== configuredPassword) return json({ error: "관리자 비밀번호가 올바르지 않습니다." }, 403);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let email = isAdmin ? ADMIN_EMAIL : await syntheticEmail(nickname);
  const { data: seeker, error: lookupError } = await supabaseAdmin.from("job_seekers").select("id, email").eq("nickname", nickname).limit(1).maybeSingle();
  if (lookupError) return json({ error: "닉네임 계정을 확인하지 못했습니다." }, 500);

  if (seeker && !isAdmin) email = seeker.email || email;
  if (!seeker && !isAdmin) {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nickname } });
    if (createError || !created.user) return json({ error: "닉네임 계정을 만들지 못했습니다." }, 500);
    const { error: profileError } = await supabaseAdmin.from("job_seekers").upsert({ id: created.user.id, email, nickname, display_name: nickname }, { onConflict: "id" });
    if (profileError) return json({ error: "닉네임을 저장하지 못했습니다." }, 500);
  }

  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.hashed_token) return json({ error: "닉네임 로그인을 시작하지 못했습니다." }, 500);
  const userId = seeker?.id ?? link.user.id;
  if (isAdmin) {
    const { error: roleError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { role: "admin" },
    });
    if (roleError) return json({ error: "관리자 권한을 발급하지 못했습니다." }, 500);
  }
  if (isAdmin) await supabaseAdmin.from("job_seekers").upsert({ id: userId, email, nickname, display_name: nickname }, { onConflict: "id" });
  return json({ tokenHash: link.properties.hashed_token, admin: isAdmin });
}