type PostHogClient = (typeof import("posthog-js"))["default"];

let posthogPromise: Promise<PostHogClient | null> | null = null;

type PostHogConsentDirective = "opt-out" | "opt-in" | null;
const UTM_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function getPostHogConsentDirective(): PostHogConsentDirective {
  if (typeof window === "undefined") return null;

  const value = new URLSearchParams(window.location.search).get("ph_optout");
  if (value === "1") return "opt-out";
  if (value === "0") return "opt-in";
  return null;
}

function getSessionUtmProperties() {
  if (typeof window === "undefined") return null;

  const searchParams = new URLSearchParams(window.location.search);
  const hasUtmParameter = UTM_PARAMETERS.some((parameter) => searchParams.has(parameter));
  if (!hasUtmParameter) return null;

  return Object.fromEntries(
    UTM_PARAMETERS.flatMap((parameter) => {
      const value = searchParams.get(parameter)?.trim();
      return value ? [[`$${parameter}`, value]] : [];
    }),
  );
}

function getPostHogConfig() {
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim();
  const uiHost = import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST?.trim();
  if (!apiKey || !apiHost || typeof window === "undefined") return null;
  const consentDirective = getPostHogConsentDirective();
  const sessionUtmProperties = getSessionUtmProperties();

  return {
    apiKey,
    consentDirective,
    sessionUtmProperties,
    options: {
      api_host: apiHost,
      ...(uiHost ? { ui_host: uiHost } : {}),
      defaults: "2025-05-24" as const,
      capture_exceptions: true,
      capture_pageview: false,
      opt_out_capturing_by_default: consentDirective === "opt-out",
      opt_out_capturing_persistence_type: "localStorage" as const,
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
      if (config.consentDirective === "opt-out") {
        posthog.opt_out_capturing();
      } else if (config.consentDirective === "opt-in") {
        posthog.opt_in_capturing();
      }
      if (config.sessionUtmProperties && !posthog.has_opted_out_capturing()) {
        for (const parameter of UTM_PARAMETERS) {
          const property = `$${parameter}`;
          if (!(property in config.sessionUtmProperties)) {
            posthog.unregister_for_session(property);
          }
        }
        posthog.register_for_session(config.sessionUtmProperties);
      }
      return posthog;
    });
  }
  return posthogPromise;
}

const GOOGLE_LOGIN_PENDING_KEY = "ph_google_login_pending";
const GOOGLE_LOGIN_PENDING_TTL_MS = 10 * 60 * 1000;

export function markGoogleLoginPending() {
  try {
    window.localStorage.setItem(GOOGLE_LOGIN_PENDING_KEY, String(Date.now()));
  } catch {
    // Login still works when storage is unavailable; only analytics are skipped.
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

const SIMULATION_ENTRY_KEY = "ph_simulation_entry";
const SIMULATION_ENTRY_TTL_MS = 30 * 60 * 1000;

export type SimulationEntrySource = "home" | "simulations" | "expert_simulations";

export function markSimulationEntry(simulationId: string, source: SimulationEntrySource) {
  try {
    window.localStorage.setItem(
      SIMULATION_ENTRY_KEY,
      JSON.stringify({ simulationId, source, markedAt: Date.now() }),
    );
  } catch {
    // Entry attribution falls back to direct when storage is unavailable.
  }
}

export function trackSimulationCardClick(
  simulationId: string,
  simulationName: string,
  source: SimulationEntrySource,
) {
  markSimulationEntry(simulationId, source);
  void capturePostHogEvent("simulation_card_click", {
    simulation_id: String(simulationId),
    simulation_name: String(simulationName),
  });
}

export function consumeSimulationEntry(simulationId: string): SimulationEntrySource | null {
  try {
    const raw = window.localStorage.getItem(SIMULATION_ENTRY_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(SIMULATION_ENTRY_KEY);
    const parsed = JSON.parse(raw) as {
      simulationId?: unknown;
      source?: unknown;
      markedAt?: unknown;
    };
    if (parsed.simulationId !== simulationId) return null;
    if (typeof parsed.markedAt !== "number" || Date.now() - parsed.markedAt > SIMULATION_ENTRY_TTL_MS) {
      return null;
    }
    if (
      parsed.source === "home" ||
      parsed.source === "simulations" ||
      parsed.source === "expert_simulations"
    ) {
      return parsed.source;
    }
    return null;
  } catch {
    return null;
  }
}

export async function capturePostHogEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  const posthog = await getPostHogClient();
  if (!posthog) return;
  posthog.capture(event, properties);
}

const SIGNUP_CAPTURED_PREFIX = "ph_signup_captured_";

function getPostHogPersonProperties(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? { email: normalizedEmail } : undefined;
}

export async function captureSignup(userId: string, email?: string): Promise<boolean> {
  const key = `${SIGNUP_CAPTURED_PREFIX}${userId}`;
  try {
    if (window.localStorage.getItem(key)) return false;
  } catch {
    // Continue without local deduplication when storage is unavailable.
  }

  const posthog = await getPostHogClient();
  if (!posthog) return false;

  posthog.identify(userId, getPostHogPersonProperties(email));
  posthog.capture("user_signed_up");
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // The event is already queued.
  }
  return true;
}

export async function captureLogin(userId: string, email?: string) {
  const posthog = await getPostHogClient();
  if (!posthog) return;
  posthog.identify(userId, getPostHogPersonProperties(email));
  posthog.capture("user_logged_in");
}
