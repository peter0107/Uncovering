import type { User } from "@supabase/supabase-js";

// 관리자 화면은 탭 단위로 잠근다.
//
// Supabase 세션은 localStorage에 저장돼서 탭을 닫아도, 브라우저를 꺼도 남는다.
// getSession()은 localStorage만 읽고 서버에 유효성을 묻지 않으므로, 서버에서
// 이미 폐기된 세션으로도 관리자 화면이 열려버린다(화면은 정상, 서버 호출만 전부
// 실패). sessionStorage는 탭을 닫으면 사라지기 때문에, 이 표식을 함께 요구하면
// 새 탭에서 /admin에 들어갈 때마다 비밀번호를 다시 받고 그때 세션도 새로 발급된다.
const ADMIN_TAB_KEY = "beginner-admin-tab";

// sessionStorage가 막힌 환경(스토리지 차단 등)에서 잠금이 풀리지 않아 아예 못
// 들어가는 상황을 막는 폴백. 이 경우 잠금 범위가 탭이 아니라 페이지 로드 단위가
// 된다(새로고침하면 다시 로그인).
let memoryUnlocked = false;

export function isAdminTabUnlocked(): boolean {
  if (memoryUnlocked) return true;
  // SSR에는 sessionStorage가 없다. 잠긴 것으로 보고 클라이언트에서 다시 판정한다.
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(ADMIN_TAB_KEY) === "1";
  } catch {
    return false;
  }
}

export function unlockAdminTab(): void {
  memoryUnlocked = true;
  try {
    sessionStorage.setItem(ADMIN_TAB_KEY, "1");
  } catch {
    // 저장이 막히면 메모리 표식만 사용한다.
  }
}

export function isAdminUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "admin" && isAdminTabUnlocked();
}

export function getPostLoginPath(_email: string | null | undefined, redirect: string): string {
  return redirect === "/" ? "/start" : redirect;
}
