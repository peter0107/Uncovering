import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let cachedSession: Session | null = null;
let cachedUser: User | null = null;
let authInitialized = false;
let storedSessionValidated = false;

// getSession()은 localStorage만 읽고 서버에 유효성을 묻지 않는다. 그래서 서버에서 이미
// 폐기된 세션(session_not_found)도 통과하고, 그 토큰이 모든 서버 함수에 붙어 나가 화면은
// 정상인데 데이터만 비는 상태가 된다. 한 번만 뒤늦게 검증하고, 서버가 명확히 거절하면
// 세션을 버린다(signOut이 SIGNED_OUT을 흘려 화면 상태도 따라 정리된다).
//
// 첫 화면을 늦추지 않으려고 일부러 apply() 뒤에서 돌린다. 검증을 앞에 두면 인증 확정이
// 서버 왕복만큼 밀려서, 그동안 목록이 빈 것처럼 보인다.
async function validateStoredSession(): Promise<void> {
  if (storedSessionValidated) return;
  storedSessionValidated = true;
  const { error } = await supabase.auth.getUser();
  // 네트워크 장애로 로그아웃시키면 안 된다. 서버가 명확히 거절한 경우만 버린다.
  if (error && (error.status === 401 || error.status === 403)) {
    await supabase.auth.signOut({ scope: "local" });
  }
}

// Account UI visibility is controlled at its call sites. The nickname session must remain
// available here because simulation submission requires its user id and JWT.
const visibleSession = (session: Session | null) => session;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!authInitialized);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const apply = (raw: Session | null) => {
      const next = visibleSession(raw);
      cachedSession = next;
      cachedUser = next?.user ?? null;
      authInitialized = true;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => apply(s));

    if (!authInitialized) {
      supabase.auth.getSession().then(({ data }) => {
        apply(data.session);
        if (data.session) void validateStoredSession();
      });
    } else {
      setLoading(false);
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      // 로컬 캐시 정리: 다음 로그인 시 새로운 계정 선택 가능하게
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
      // 잠시 보여준 뒤 새로고침으로 상태 완전 초기화
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = "/";
    } catch {
      setSigningOut(false);
    }
  };

  return { session, user, loading, signOut, signingOut };
}
