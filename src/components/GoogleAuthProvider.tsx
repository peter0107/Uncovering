import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createGoogleNonce,
  hashGoogleNonce,
  loadGoogleIdentity,
  type GoogleIdentity,
} from "@/lib/google-identity";
import { captureLogin, captureSignup, consumeGoogleLoginPending } from "@/lib/posthog";

const SIGNUP_DETECTION_WINDOW_MS = 2 * 60 * 1000;

type GoogleAuthStatus = "loading" | "ready" | "error";

type GoogleButtonAction = {
  onSuccess?: () => void;
};

type GoogleAuthContextValue = {
  google: GoogleIdentity | null;
  status: GoogleAuthStatus;
  isAuthenticating: boolean;
  registerAction: (state: string, action: GoogleButtonAction) => () => void;
  setPendingAction: (state: string) => void;
  retry: () => void;
};

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

async function resolveGoogleClientId(): Promise<string> {
  const bundledClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (bundledClientId) return bundledClientId;

  const response = await fetch("/api/google-client-id", {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Google 로그인 설정을 불러오지 못했습니다.");
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") return "";
  const clientId = (payload as { clientId?: unknown }).clientId;
  return typeof clientId === "string" ? clientId.trim() : "";
}

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const actionsRef = useRef(new Map<string, GoogleButtonAction>());
  const pendingActionRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const [google, setGoogle] = useState<GoogleIdentity | null>(null);
  const [status, setStatus] = useState<GoogleAuthStatus>("loading");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initializeGoogleIdentity() {
      if (initializedRef.current) return;

      setStatus("loading");
      try {
        // Cloudflare bindings are read at request time so credential updates do
        // not require a client-side Vite rebuild.
        const clientId = await resolveGoogleClientId();
        if (!clientId) {
          throw new Error("Google Client ID가 설정되지 않았습니다.");
        }

        const googleIdentity = await loadGoogleIdentity();
        const nonce = createGoogleNonce();
        const hashedNonce = await hashGoogleNonce(nonce);
        if (cancelled) return;

        googleIdentity.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          auto_select: false,
          use_fedcm_for_prompt: false,
          use_fedcm_for_button: false,
          callback: async ({ credential, state }) => {
            if (cancelled) return;

            setIsAuthenticating(true);
            const actionState = state || pendingActionRef.current;
            const action = actionState
              ? actionsRef.current.get(actionState)
              : undefined;

            try {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: credential,
                nonce,
              });

              if (error) {
                toast.error("Google 로그인에 실패했습니다.");
                console.error("[Google Sign-In]", error);
                return;
              }

              const user = data.user;
              if (user && consumeGoogleLoginPending()) {
                const createdAtMs = Date.parse(user.created_at);
                const isNewSignup =
                  Number.isFinite(createdAtMs) &&
                  Date.now() - createdAtMs < SIGNUP_DETECTION_WINDOW_MS;
                const signupCaptured = isNewSignup
                  ? await captureSignup(user.id, user.email)
                  : false;
                if (!signupCaptured) {
                  await captureLogin(user.id, user.email);
                }
              }

              pendingActionRef.current = null;
              action?.onSuccess?.();
            } catch (error) {
              console.error("[Google Sign-In]", error);
              toast.error("Google 로그인에 실패했습니다.");
            } finally {
              if (!cancelled) {
                setIsAuthenticating(false);
              }
            }
          },
        });

        initializedRef.current = true;
        setGoogle(googleIdentity);
        setStatus("ready");
      } catch (error) {
        console.error("[Google Sign-In]", error);
        if (!cancelled) {
          setGoogle(null);
          setStatus("error");
        }
      }
    }

    void initializeGoogleIdentity();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const registerAction = useCallback(
    (state: string, action: GoogleButtonAction) => {
      actionsRef.current.set(state, action);
      return () => {
        actionsRef.current.delete(state);
        if (pendingActionRef.current === state) {
          pendingActionRef.current = null;
        }
      };
    },
    [],
  );

  const setPendingAction = useCallback((state: string) => {
    pendingActionRef.current = state;
  }, []);

  const retry = useCallback(() => {
    if (initializedRef.current) return;
    setAttempt((value) => value + 1);
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{
        google,
        status,
        isAuthenticating,
        registerAction,
        setPendingAction,
        retry,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error("useGoogleAuth must be used inside GoogleAuthProvider.");
  }
  return context;
}
