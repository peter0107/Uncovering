import { useEffect, useState, type FormEvent } from "react";
import { Pencil, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSavedSimulationNickname, saveSimulationNickname } from "@/lib/pending-simulation-nickname";

function profileLabel(nickname: string) {
  return `${nickname.replace(/님$/, "")}님`;
}

export function GuestProfileMenu() {
  const [nickname, setNickname] = useState(() => getSavedSimulationNickname());
  const [draftNickname, setDraftNickname] = useState(nickname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleNicknameUpdate = (event: Event) => {
      const nextNickname = (event as CustomEvent<string>).detail?.trim();
      if (!nextNickname) return;
      setNickname(nextNickname);
      setDraftNickname(nextNickname);
    };

    window.addEventListener("beginner:guest-nickname-updated", handleNicknameUpdate);
    return () => window.removeEventListener("beginner:guest-nickname-updated", handleNicknameUpdate);
  }, []);

  if (!nickname) return null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) setDraftNickname(nickname);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextNickname = saveSimulationNickname(draftNickname);
    if (!nextNickname) return;
    setNickname(nextNickname);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="프로필"
          className="flex items-center gap-2 text-[#1a2340] transition-colors hover:text-[#1659e3]"
        >
          <span className="max-w-28 truncate text-sm font-semibold" title={profileLabel(nickname)}>
            {profileLabel(nickname)}
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-[#c8d2e3] bg-white">
            <UserRound className="h-4 w-4" strokeWidth={2.2} />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-lg p-5 shadow-none data-[state=closed]:!animate-none data-[state=open]:!animate-none">
        <DialogHeader>
          <DialogTitle>프로필</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="guest-profile-nickname">닉네임</Label>
            <Input
              id="guest-profile-nickname"
              value={draftNickname}
              onChange={(event) => setDraftNickname(event.target.value.slice(0, 30))}
              maxLength={30}
              autoFocus
              className="rounded-md"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!draftNickname.trim()}
              className="gap-2 rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
            >
              <Pencil className="h-4 w-4" />
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
