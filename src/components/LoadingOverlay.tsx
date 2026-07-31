import { Loader2 } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LoadingOverlayContextValue = {
  isRequestLoading: boolean;
  showBriefLoading: (duration?: number) => void;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null);

function getRequestUrl(input: RequestInfo | URL): string | null {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function shouldTrackRequest(input: RequestInfo | URL): boolean {
  const rawUrl = getRequestUrl(input);
  if (!rawUrl) return false;

  try {
    const url = new URL(rawUrl, window.location.href);
    const analyticsHosts = [
      "posthog.com",
      "clarity.ms",
      "google-analytics.com",
      "googletagmanager.com",
    ];

    if (analyticsHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      return false;
    }

    return url.origin === window.location.origin || url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
  const [requestCount, setRequestCount] = useState(0);
  const [manualCount, setManualCount] = useState(0);

  const showBriefLoading = useCallback((duration = 280) => {
    setManualCount((count) => count + 1);
    window.setTimeout(() => {
      setManualCount((count) => Math.max(0, count - 1));
    }, duration);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch;
    const nativeFetch = originalFetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!shouldTrackRequest(input)) {
        return nativeFetch(input, init);
      }

      let isVisible = false;
      const timer = window.setTimeout(() => {
        isVisible = true;
        setRequestCount((count) => count + 1);
      }, 180);

      try {
        return await nativeFetch(input, init);
      } finally {
        window.clearTimeout(timer);
        if (isVisible) {
          setRequestCount((count) => Math.max(0, count - 1));
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const value = useMemo(
    () => ({
      isRequestLoading: requestCount > 0 || manualCount > 0,
      showBriefLoading,
    }),
    [manualCount, requestCount, showBriefLoading],
  );

  return <LoadingOverlayContext.Provider value={value}>{children}</LoadingOverlayContext.Provider>;
}

export function useLoadingOverlay() {
  const context = useContext(LoadingOverlayContext);
  if (!context) {
    throw new Error("useLoadingOverlay must be used within LoadingOverlayProvider");
  }
  return context;
}

export function LoadingOverlay({ message = "처리 중..." }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] grid place-items-center bg-background"
    >
      <div className="flex flex-col items-center gap-3 rounded-md border bg-background px-8 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
}

export function NavigationOverlay() {
  return <LoadingOverlay message="페이지 이동 중..." />;
}
