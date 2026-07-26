type PostHogClient = (typeof import("posthog-js"))["default"];

let posthogPromise: Promise<PostHogClient | null> | null = null;

function getPostHogConfig() {
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!apiKey || typeof window === "undefined") return null;
  // 프로덕션 도메인에서만 수집한다 (lovable.app 프리뷰·localhost 제외)
  if (window.location.hostname !== "beginner.today") return null;

  return {
    apiKey,
    options: {
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST || "https://us.posthog.com",
      defaults: "2025-05-24" as const,
      capture_exceptions: true,
      capture_pageview: false,
      disable_session_recording: false,
      debug: import.meta.env.DEV,
    },
  };
}

export function getPostHogClient() {
  const config = getPostHogConfig();
  if (!config) return Promise.resolve(null);

  if (!posthogPromise) {
    posthogPromise = import("posthog-js").then(({ default: posthog }) => {
      posthog.init(config.apiKey, config.options);
      return posthog;
    });
  }

  return posthogPromise;
}

const GOOGLE_LOGIN_PENDING_KEY = "ph_google_login_pending";
// OAuth 복귀가 이 시간을 넘기면 중도 이탈로 보고 플래그를 무시한다
const GOOGLE_LOGIN_PENDING_TTL_MS = 10 * 60 * 1000;

// Google OAuth는 전면 리다이렉트라 클릭 시점 캡처가 유실된다.
// 클릭 시 플래그만 남기고, 복귀 후 PostHogTracker가 소비해 user_logged_in을 보낸다.
export function markGoogleLoginPending() {
  try {
    window.localStorage.setItem(GOOGLE_LOGIN_PENDING_KEY, String(Date.now()));
  } catch {
    // localStorage 불가 환경에서는 로그인 이벤트만 포기한다
  }
}

export function consumeGoogleLoginPending(): boolean {
  try {
    const raw = window.localStorage.getItem(GOOGLE_LOGIN_PENDING_KEY);
    if (!raw) return false;
    window.localStorage.removeItem(GOOGLE_LOGIN_PENDING_KEY);
    const markedAt = Number(raw);
    return Number.isFinite(markedAt) && Date.now() - markedAt < GOOGLE_LOGIN_PENDING_TTL_MS;
  } catch {
    return false;
  }
}

export async function capturePostHogEvent(
  event: string,
  properties?: Record<string, unknown>,
  email?: string,
) {
  const posthog = await getPostHogClient();
  if (!posthog) return;

  if (email) posthog.identify(email, { email });
  posthog.capture(event, properties);
}
