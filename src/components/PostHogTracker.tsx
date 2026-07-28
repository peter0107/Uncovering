import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { getPostHogClient } from "@/lib/posthog";

const EXCLUDED_POSTHOG_EMAILS = new Set(["standard1414@g.skku.edu"]);

export function PostHogTracker() {
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const { user, loading } = useAuth();
  const email = user?.email?.trim().toLowerCase();
  const userId = user?.id;
  const isExcluded = email ? EXCLUDED_POSTHOG_EMAILS.has(email) : false;

  useEffect(() => {
    if (loading) return;

    let cancelled = false;
    void getPostHogClient().then((posthog) => {
      if (cancelled || !posthog) return;

      if (isExcluded) {
        posthog.reset();
        posthog.opt_out_capturing();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isExcluded]);

  useEffect(() => {
    if (loading || isExcluded) return;

    let cancelled = false;
    void getPostHogClient().then((posthog) => {
      if (cancelled || !posthog || posthog.has_opted_out_capturing()) return;
      posthog.capture("$pageview", {
        $current_url: window.location.href,
        route: window.location.pathname,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isExcluded, locationHref]);

  useEffect(() => {
    if (loading || isExcluded) return;

    let cancelled = false;
    void getPostHogClient().then((posthog) => {
      if (cancelled || !posthog || posthog.has_opted_out_capturing()) return;

      if (userId) {
        posthog.identify(userId);
        return;
      }
      posthog.reset();
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isExcluded, userId]);

  return null;
}
