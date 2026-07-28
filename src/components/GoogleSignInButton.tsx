import { useEffect, useId, useRef } from "react";
import { useGoogleAuth } from "@/components/GoogleAuthProvider";
import { markGoogleLoginPending } from "@/lib/posthog";

type Props = {
  onSuccess?: () => void;
};

export function GoogleSignInButton({ onSuccess }: Props) {
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
        logo_alignment: "center",
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
      <button
        type="button"
        disabled
        className="flex h-10 w-full cursor-wait items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-muted-foreground opacity-60"
      >
        Google 로그인 불러오는 중...
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="google-signin-host flex min-h-10 w-full justify-center"
    />
  );
}
