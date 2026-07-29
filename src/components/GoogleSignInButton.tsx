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
        className={
          size === "large"
            ? "h-12 w-full rounded-xl border border-[#dadce0] bg-white"
            : "h-10 w-full rounded-[4px] border border-[#dadce0] bg-white"
        }
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        size === "large"
          ? "google-signin-host google-signin-host--large flex h-12 w-full items-center justify-center overflow-hidden rounded-xl"
          : "google-signin-host flex min-h-10 w-full justify-center"
      }
    />
  );
}
