import { supabase } from "@/integrations/supabase/client";
import { unlockAdminTab } from "@/lib/admin";
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
  // scope를 생략하면 global이라 이 계정의 모든 기기 세션이 폐기된다. 관리자는 계정
  // 하나를 공유하므로, 다른 사람이 쓰고 있는 세션까지 끊어버린다. 여기서는 계정 교체
  // 전에 이 브라우저의 세션만 비우면 된다.
  await supabase.auth.signOut({ scope: "local" });
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
  // 관리자 화면은 탭 단위로 잠겨 있다(src/lib/admin.ts). 이 탭의 잠금을 여기서 푼다.
  if (result.admin === true) unlockAdminTab();
  return { user: authResult.data.user, admin: result.admin === true };
}
export async function getCurrentNickname(userId: string) {
  const { data } = await supabase.from("job_seekers").select("nickname, display_name").eq("id", userId).maybeSingle();
  return data?.nickname || data?.display_name?.trim().toLowerCase() || null;
}