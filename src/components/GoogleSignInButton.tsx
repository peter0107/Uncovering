import { useEffect, useId, useRef } from "react";
import { useGoogleAuth } from "@/components/GoogleAuthProvider";
import { markGoogleLoginPending } from "@/lib/posthog";

type Props = {
  onSuccess?: () => void;
  size?: "default" | "large";
  appearance?: "native" | "matched";
};

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285f4"
        d="M21.8 12.23c0-.72-.06-1.42-.19-2.1H12v3.97h5.5a4.7 4.7 0 0 1-2.04 3.08v2.57h3.3c1.93-1.77 3.04-4.38 3.04-7.52Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.75 0 5.05-.9 6.74-2.25l-3.3-2.57c-.92.62-2.1.99-3.44.99-2.65 0-4.89-1.79-5.69-4.2H2.9v2.65A10.18 10.18 0 0 0 12 22Z"
      />
      <path
        fill="#fbbc04"
        d="M6.31 13.97A6.08 6.08 0 0 1 6 12c0-.69.12-1.36.31-1.97V7.38H2.9A10 10 0 0 0 1.82 12c0 1.6.38 3.12 1.08 4.62l3.41-2.65Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.83c1.49 0 2.83.51 3.89 1.5l2.92-2.92C17.04 2.76 14.74 2 12 2a10.18 10.18 0 0 0-9.1 5.38l3.41 2.65c.8-2.41 3.04-4.2 5.69-4.2Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  onSuccess,
  size = "default",
  appearance = "native",
}: Props) {
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
      const width = Math.min(
        Math.max(Math.round(container.clientWidth), 200),
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
        logo_alignment: "left",
        locale: "ko",
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

  const matchedAppearance = appearance === "matched";

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={retry}
        className={`flex w-full items-center justify-center border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent ${
          matchedAppearance ? "h-12 rounded-[14px]" : "h-10 rounded-md"
        }`}
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
        className={`flex w-full cursor-wait items-center justify-center border border-input bg-background px-4 text-sm font-medium text-foreground opacity-60 ${
          matchedAppearance ? "h-12 rounded-[14px]" : "h-10 rounded-md"
        }`}
      >
        Google 로그인 중...
      </button>
    );
  }

  if (status === "loading") {
    if (matchedAppearance) {
      return (
        <div className="relative flex h-12 w-full items-center justify-center rounded-[14px] border border-[#dadce0] bg-white text-base font-medium text-[#202124]">
          <GoogleMark className="absolute left-4 h-5 w-5" />
          <span>Google 계정으로 계속하기</span>
        </div>
      );
    }

    return (
      <div
        aria-label="Google 로그인 준비 중"
        aria-busy="true"
        className="h-10 w-full rounded-[4px] border border-[#dadce0] bg-white"
      />
    );
  }

  if (matchedAppearance) {
    return (
      <div className="relative h-12 w-full overflow-hidden rounded-[14px] border border-[#dadce0] bg-white text-base font-medium text-[#202124]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <GoogleMark className="absolute left-4 h-5 w-5" />
          <span>Google 계정으로 계속하기</span>
        </div>
        <div
          ref={containerRef}
          className="google-signin-host absolute inset-0 z-10 opacity-[0.01] [&>div]:!h-full [&_iframe]:!h-full"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`google-signin-host flex w-full justify-center ${size === "large" ? "min-h-12" : "min-h-10"}`}
    />
  );
}
