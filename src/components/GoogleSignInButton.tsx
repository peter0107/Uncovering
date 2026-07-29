import { useEffect, useId, useRef } from "react";
import { useGoogleAuth } from "@/components/GoogleAuthProvider";
import { markGoogleLoginPending } from "@/lib/posthog";

type Props = {
  onSuccess?: () => void;
  size?: "default" | "large";
};

export function GoogleSignInButton({ onSuccess, size = "default" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const buttonState = `beginner-google-${useId().replaceAll(":", "")}`;
  const {
    google,
    status,
    isAuthenticating,
    registerAction,
    setPendingAction,
    retry,
  } = useGoogleAuth();
  onSuccessRef.current = onSuccess;

  useEffect(
    () =>
      registerAction(buttonState, {
        onSuccess: () => onSuccessRef.current?.(),
      }),
    [buttonState, registerAction],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!google || !container || status !== "ready" || isAuthenticating) {
      return;
    }

    let previousWidth = 0;
    const render = () => {
      const scale = size === "large" ? 1.2 : 1;
      const width = Math.min(
        Math.max(Math.round(container.clientWidth / scale), 200),
        400,
      );
      if (width === previousWidth) return;
      previousWidth = width;

      container.replaceChildren();
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width,
        logo_alignment: size === "large" ? "center" : "left",
        state: buttonState,
        click_listener: () => {
          setPendingAction(buttonState);
          markGoogleLoginPending();
        },
      });
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => {
      observer.disconnect();
      container.replaceChildren();
    };
  }, [
    buttonState,
    google,
    isAuthenticating,
    setPendingAction,
    size,
    status,
  ]);

  function startGoogleIdentity() {
    if (status === "error") {
      retry();
      return;
    }
    if (!google || status !== "ready" || isAuthenticating) return;

    setPendingAction(buttonState);
    markGoogleLoginPending();
    google.accounts.id.prompt();
  }

  if (size === "large") {
    return (
      <button
        type="button"
        onClick={startGoogleIdentity}
        disabled={status === "loading" || isAuthenticating}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 font-sans text-base font-medium text-[#202124] shadow-none transition-colors hover:bg-[#f8fafd] disabled:cursor-wait disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.39 13.86A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z" />
          <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
        </svg>
        <span>{isAuthenticating ? "Google 로그인 중..." : "Google 계정으로 계속하기"}</span>
      </button>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={retry}
        className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        Google 로그인 다시 불러오기
      </button>
    );
  }

  if (isAuthenticating) {
    return (
      <button
        type="button"
        disabled
        className="flex h-10 w-full cursor-wait items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground opacity-60"
      >
        Google 로그인 중...
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div
        aria-label="Google 로그인 준비 중"
        aria-busy="true"
        className="h-10 w-full rounded-[4px] border border-[#dadce0] bg-white"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="google-signin-host flex min-h-10 w-full justify-center"
    />
  );
}
