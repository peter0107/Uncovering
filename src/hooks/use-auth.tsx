import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/admin";
import { AUTHENTICATION_ENABLED } from "@/lib/auth-features";

let cachedSession: Session | null = null;
let cachedUser: User | null = null;
let authInitialized = false;

// 로그인 UI를 감춘 MVP 동안 닉네임 방문자는 비로그인으로 취급하지만,
// /admin은 세션의 admin 권한으로 접근을 판별하므로 관리자 세션은 그대로 노출한다.
const visibleSession = (s: Session | null) =>
  AUTHENTICATION_ENABLED || isAdminUser(s?.user) ? s : null;

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
      supabase.auth.getSession().then(({ data }) => apply(data.session));
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
