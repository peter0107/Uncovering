import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createGoogleNonce,
  hashGoogleNonce,
  loadGoogleIdentity,
} from "@/lib/google-identity";
import { markGoogleLoginPending } from "@/lib/posthog";

type Props = {
  onSuccess?: () => void;
};

export function GoogleSignInButton({ onSuccess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    let cancelled = false;

    async function initializeGoogleButton() {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
        if (!clientId) {
          throw new Error("VITE_GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
        }

        const google = await loadGoogleIdentity();
        const nonce = createGoogleNonce();
        const hashedNonce = await hashGoogleNonce(nonce);
        const container = containerRef.current;

        if (cancelled || !container) return;

        google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            if (cancelled) return;

            markGoogleLoginPending();
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: credential,
              nonce,
            });

            if (error) {
              toast.error("Google 로그인에 실패했습니다.");
              console.error("[Google Sign-In]", error);
              return;
            }

            onSuccessRef.current?.();
          },
        });

        container.replaceChildren();
        google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: Math.max(200, Math.min(container.clientWidth || 320, 400)),
          logo_alignment: "left",
        });
      } catch (error) {
        console.error("[Google Sign-In]", error);
        if (!cancelled) {
          toast.error("Google 로그인을 준비하지 못했습니다.");
        }
      }
    }

    void initializeGoogleButton();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex min-h-10 w-full justify-center"
      style={{ fontFeatureSettings: "normal" }}
    />
  );
}
