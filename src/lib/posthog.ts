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
