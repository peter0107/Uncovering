import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LoadingOverlay, LoadingOverlayProvider, useLoadingOverlay } from "@/components/LoadingOverlay";
import { ClarityTracker } from "@/components/ClarityTracker";
import { GoogleAnalyticsTracker } from "@/components/GoogleAnalyticsTracker";
import { PostHogTracker } from "@/components/PostHogTracker";
import { GoogleAuthProvider } from "@/components/GoogleAuthProvider";
import { SimulationStartProvider } from "@/components/SimulationStartProvider";
import { useRouterState } from "@tanstack/react-router";

function useDelayedLoading(active: boolean, delay = 450) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);

  return isVisible;
}

function GlobalNavigationOverlay() {
  const isNavigating = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });
  const { isRequestLoading } = useLoadingOverlay();
  const showNavigationLoading = useDelayedLoading(isNavigating);

  if (!showNavigationLoading && !isRequestLoading) return null;
  return <LoadingOverlay message={showNavigationLoading ? "페이지 이동 중..." : "불러오는 중..."} />;
}

function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  // 시뮬레이션 수행 화면은 전체화면 셸(SimulationShell)을 쓴다. 피드백 화면은 제외.
  const isSimulationRun = pathname.startsWith("/simulation/") && !pathname.endsWith("/feedback");
  const isBareFullscreen = isHome || pathname.startsWith("/lp") || isSimulationRun;
  const usesOwnHeader =
    isBareFullscreen ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/biz") ||
    pathname.startsWith("/admin");
  if (isBareFullscreen) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      {!usesOwnHeader && <SiteHeader />}
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 hover:text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 hover:text-white"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Beginner" },
      { name: "application-name", content: "Beginner" },
      {
        name: "description",
        content: "Beginner는 실제 직무를 온라인으로 경험할 수 있는 직무 시뮬레이션 서비스입니다.",
      },
      { property: "og:title", content: "Beginner" },
      {
        property: "og:description",
        content: "Beginner는 실제 직무를 온라인으로 경험할 수 있는 직무 시뮬레이션 서비스입니다.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Beginner" },
      { name: "twitter:description", content: "Beginner는 실제 직무를 온라인으로 경험할 수 있는 직무 시뮬레이션 서비스입니다." },
      { property: "og:image", content: "https://beginner.today/og-image.png" },
      { name: "twitter:image", content: "https://beginner.today/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://cdn.jsdelivr.net",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "style",
        href: "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LoadingOverlayProvider>
        <GoogleAuthProvider>
          <SimulationStartProvider>
            <ClarityTracker />
            <GoogleAnalyticsTracker />
            <PostHogTracker />
            <SiteLayout>
              <Outlet />
            </SiteLayout>
            <GlobalNavigationOverlay />
            <Toaster />
          </SimulationStartProvider>
        </GoogleAuthProvider>
      </LoadingOverlayProvider>
    </QueryClientProvider>
  );
}
