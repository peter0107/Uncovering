import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  clearPendingProfileNickname,
  getPendingProfileNickname,
  getSavedSimulationNickname,
  saveSimulationNickname,
} from "@/lib/pending-simulation-nickname";
import {
  captureNicknameSubmitted,
  trackSimulationCardClick,
  type SimulationEntrySource,
} from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";
import { signInWithNickname } from "@/lib/nickname-auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StartRequest = {
  id: string;
  title: string;
  source: SimulationEntrySource;
};

type SimulationStartContextValue = {
  startSimulation: (request: StartRequest) => void;
};

const SimulationStartContext = createContext<SimulationStartContextValue | null>(null);

async function persistNickname(userId: string, email: string, displayName: string) {
  const { data, error: updateError } = await supabase
    .from("job_seekers")
    .update({ display_name: displayName })
    .eq("id", userId)
    .select("id");

  if (updateError) throw updateError;
  if (data?.length) return;

  const { error: insertError } = await supabase
    .from("job_seekers")
    .insert({ id: userId, email, display_name: displayName });
  if (insertError) throw insertError;
}

export function SimulationStartProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<StartRequest | null>(null);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);

  const continueToSimulation = useCallback(
    async (nextRequest: StartRequest, displayName: string) => {
      try {
        const activeUser = user ?? (await signInWithNickname(displayName)).user;
        await persistNickname(activeUser.id, activeUser.email ?? "", displayName);
        clearPendingProfileNickname();
        await captureNicknameSubmitted(displayName, {
          id: nextRequest.id,
          name: nextRequest.title,
          source: nextRequest.source,
        });
      } catch (error) {
        console.error("[Simulation nickname]", error);
        toast.error(error instanceof Error ? error.message : "닉네임을 저장하지 못했습니다.");
        return;
      }

      setRequest(null);
      await navigate({ to: "/simulation/$id", params: { id: nextRequest.id } });
    },
    [navigate, user],
  );

  const startSimulation = useCallback(
    (nextRequest: StartRequest) => {
      trackSimulationCardClick(nextRequest.id, nextRequest.title, nextRequest.source);
      const savedNickname = getSavedSimulationNickname();
      if (savedNickname) {
        void continueToSimulation(nextRequest, savedNickname);
        return;
      }

      setNickname("");
      setRequest(nextRequest);
    },
    [continueToSimulation],
  );

  useEffect(() => {
    if (!user) return;
    const pendingNickname = getPendingProfileNickname();
    if (!pendingNickname) return;

    void persistNickname(user.id, user.email ?? "", pendingNickname)
      .then(clearPendingProfileNickname)
      .catch((error) => console.error("[Pending simulation nickname]", error));
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || saving) return;

    const savedNickname = saveSimulationNickname(nickname);
    if (!savedNickname) return;

    setSaving(true);
    try {
      await continueToSimulation(request, savedNickname);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimulationStartContext.Provider value={{ startSimulation }}>
      {children}
      <Dialog open={Boolean(request)} onOpenChange={(open) => !open && setRequest(null)}>
        <DialogContent className="max-w-sm rounded-lg p-5 shadow-none data-[state=closed]:!animate-none data-[state=open]:!animate-none">
          <DialogHeader>
            <DialogTitle>닉네임 입력</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="simulation-nickname">닉네임</Label>
              <Input
                id="simulation-nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value.slice(0, 30))}
                maxLength={30}
                autoFocus
                className="rounded-md"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!nickname.trim() || saving}
                className="rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
              >
                {saving ? "저장 중..." : "시작하기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SimulationStartContext.Provider>
  );
}

export function useSimulationStart() {
  const context = useContext(SimulationStartContext);
  if (!context) {
    throw new Error("useSimulationStart must be used inside SimulationStartProvider.");
  }
  return context;
}
