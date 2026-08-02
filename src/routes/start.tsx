import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AUTHENTICATION_ENABLED } from "@/lib/auth-features";

export const Route = createFileRoute("/start")({
  head: () => ({ meta: [{ title: "시작하기" }] }),
  component: StartDispatcher,
});

function StartDispatcher() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!AUTHENTICATION_ENABLED) {
      navigate({ to: "/simulations", replace: true });
      return;
    }

    if (!user) {
      navigate({ to: "/login", search: { redirect: "/start" }, replace: true });
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("job_seekers")
        .select("id, job_interests")
        .eq("id", user.id)
        .maybeSingle();

      const completed =
        !error &&
        !!data &&
        Array.isArray(data.job_interests) &&
        data.job_interests.length > 0;

      navigate({
        to: completed ? "/simulations" : "/onboarding",
        replace: true,
      });
    })();
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-400">
      불러오는 중...
    </div>
  );
}
