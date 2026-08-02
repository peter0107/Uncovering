import { supabase } from "@/integrations/supabase/client";
export const ADMIN_NICKNAME = "beginner";
export const normalizeNickname = (value: string) => value.trim().toLowerCase();
export function validateNickname(value: string) {
  const nickname = normalizeNickname(value);
  if (nickname.length < 2 || nickname.length > 20) return "닉네임은 2~20자로 입력해주세요.";
  if (!/^[0-9a-z가-힣_-]+$/.test(nickname)) return "한글, 영문 소문자, 숫자, 밑줄, 하이픈만 사용할 수 있어요.";
  return null;
}
export async function signInWithNickname(input: string, password?: string) {
  const nickname = normalizeNickname(input);
  const validationError = validateNickname(nickname);
  if (validationError) throw new Error(validationError);
  await supabase.auth.signOut();
  const response = await fetch("/api/nickname/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname, password }) });
  const result = (await response.json().catch(() => null)) as {
    tokenHash?: string;
    accessToken?: string;
    refreshToken?: string;
    admin?: boolean;
    error?: string;
  } | null;
  if (!response.ok || !result) throw new Error(result?.error || "닉네임으로 로그인하지 못했습니다.");

  const authResult = result.accessToken && result.refreshToken
    ? await supabase.auth.setSession({ access_token: result.accessToken, refresh_token: result.refreshToken })
    : result.tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: result.tokenHash, type: "magiclink" })
      : { data: { user: null }, error: new Error("로그인 토큰이 없습니다.") };
  if (authResult.error || !authResult.data.user) throw new Error("로그인 세션을 만들지 못했습니다.");
  return { user: authResult.data.user, admin: result.admin === true };
}
export async function getCurrentNickname(userId: string) {
  const { data } = await supabase.from("job_seekers").select("nickname, display_name").eq("id", userId).maybeSingle();
  return data?.nickname || data?.display_name?.trim().toLowerCase() || null;
}