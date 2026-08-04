import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let cachedSession: Session | null = null;
let cachedUser: User | null = null;
let authInitialized = false;

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
