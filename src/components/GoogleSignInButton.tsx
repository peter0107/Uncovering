import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createGoogleNonce,
  hashGoogleNonce,
  loadGoogleIdentity,
  type GoogleIdentity,
} from "@/lib/google-identity";
import { markGoogleLoginPending } from "@/lib/posthog";

type Props = {
  onSuccess?: () => void;
  postLoginPath?: string;
};

export function GoogleSignInButton({ onSuccess, postLoginPath = "/" }: Props) {
  const googleRef = useRef<GoogleIdentity | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleIdentityReady, setIsGoogleIdentityReady] = useState(false);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    let cancelled = false;

    async function initializeGoogleSignIn() {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
        if (!clientId) {
          // Supabase OAuth redirect remains available even when Google Identity is unavailable.
          return;
        }

        const google = await loadGoogleIdentity();
        const nonce = createGoogleNonce();
        const hashedNonce = await hashGoogleNonce(nonce);

        if (cancelled) return;

        google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          auto_select: false,
          use_fedcm_for_prompt: false,
          callback: async ({ credential }) => {
            if (cancelled) return;

            markGoogleLoginPending();
            setIsLoading(true);
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: credential,
              nonce,
            });

            if (error) {
              setIsLoading(false);
              toast.error("Google 로그인에 실패했습니다.");
              console.error("[Google Sign-In]", error);
              return;
            }

            onSuccessRef.current?.();
          },
        });

        googleRef.current = google;
        setIsGoogleIdentityReady(true);
      } catch (error) {
        console.error("[Google Sign-In]", error);
      }
    }

    void initializeGoogleSignIn();

    return () => {
      cancelled = true;
      googleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const google = googleRef.current;
    const container = googleButtonRef.current;
    if (!google || !container || !isGoogleIdentityReady || isLoading) return;

    const render = () => {
      container.replaceChildren();
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: Math.min(Math.max(container.clientWidth, 200), 400),
        logo_alignment: "left",
      });
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isGoogleIdentityReady, isLoading]);

  async function startOAuthRedirect() {
    setIsLoading(true);
    markGoogleLoginPending();

    const callbackUrl = new URL("/login", window.location.origin);
    callbackUrl.searchParams.set("redirect", postLoginPath);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });

    if (error) {
      setIsLoading(false);
      toast.error("Google 로그인을 시작하지 못했습니다.");
      console.error("[Google OAuth]", error);
    }
  }

  if (isGoogleIdentityReady) {
    return <div ref={googleButtonRef} className="flex min-h-10 w-full justify-center" />;
  }

  return (
    <button
      type="button"
      onClick={() => void startOAuthRedirect()}
      disabled={isLoading}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.55l3.35-2.62Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
        />
      </svg>
      {isLoading ? "Google 로그인 중..." : "Google 계정으로 계속하기"}
    </button>
  );
}
