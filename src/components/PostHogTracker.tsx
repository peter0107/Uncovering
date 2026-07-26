import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { consumeGoogleLoginPending, getPostHogClient } from "@/lib/posthog";

const EXCLUDED_POSTHOG_HOSTS = new Set([
  "efe62646-aba5-4e7f-a36e-bfb36fc5947e.lovableproject.com",
  "localhost",
  "127.0.0.1",
]);
const EXCLUDED_POSTHOG_EMAILS = new Set(["standard1414@g.skku.edu"]);
// Google 가입은 OAuth 리다이렉트로 페이지를 떠나 클릭 시점 캡처가 유실되므로,
// 복귀 후 created_at이 이 시간 이내면 신규 가입으로 판단해 user_signed_up을 보낸다.
const SIGNUP_DETECTION_WINDOW_MS = 10 * 60 * 1000;

function markSignupCaptured(userId: string): boolean {
  const key = `ph_signup_captured_${userId}`;
  try {
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

export function PostHogTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  const email = user?.email?.trim().toLowerCase();
  const userId = user?.id;
  const provider = user?.app_metadata?.provider;
  const createdAt = user?.created_at;
  const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const isExcludedHost = EXCLUDED_POSTHOG_HOSTS.has(hostname);
  const isExcludedEmail = email ? EXCLUDED_POSTHOG_EMAILS.has(email) : false;
  const isExcluded = isExcludedHost || isExcludedEmail;

  useEffect(() => {
    if (loading) return;

    let cancelled = false;
    void getPostHogClient().then((posthog) => {
      if (cancelled || !posthog) return;

      if (isExcluded) {
        posthog.reset();
        posthog.opt_out_capturing();
        return;
      }

      posthog.opt_in_capturing();
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isExcluded]);

  useEffect(() => {
    if (loading || isExcluded) return;

    let cancelled = false;
    void getPostHogClient().then((posthog) => {
      if (cancelled || !posthog) return;
      posthog.capture("$pageview", {
        $current_url: window.location.href,
        route: pathname,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isExcluded, pathname]);

  useEffect(() => {
    if (loading || isExcluded) return;

    let cancelled = false;
    void getPostHogClient().then((posthog) => {
      if (cancelled || !posthog) return;

      if (email) {
        posthog.identify(email, { email });

        // Google OAuth는 전면 리다이렉트로 클릭 시점 캡처가 유실되므로
        // 가입·로그인 모두 복귀 후 이 지점에서 판별해 전송한다
        const loginPending = consumeGoogleLoginPending();

        // 이메일 가입은 login.tsx에서 클릭 시점에 캡처하므로 Google 가입만 여기서 감지
        const createdAtMs = createdAt ? Date.parse(createdAt) : Number.NaN;
        const isNewGoogleSignup =
          provider === "google" &&
          !!userId &&
          Number.isFinite(createdAtMs) &&
          Date.now() - createdAtMs < SIGNUP_DETECTION_WINDOW_MS &&
          markSignupCaptured(userId);

        if (isNewGoogleSignup) {
          posthog.capture("user_signed_up", { email, method: "google" });
        } else if (loginPending && provider === "google") {
          posthog.capture("user_logged_in", { email, method: "google" });
        }
        return;
      }

      posthog.reset();
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isExcluded, email, userId, provider, createdAt]);

  return null;
}
