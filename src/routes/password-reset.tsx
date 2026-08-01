import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getPostLoginPath } from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/password-reset")({
  head: () => ({ meta: [{ title: "비밀번호 재설정 — Beginner" }] }),
  component: PasswordResetPage,
});

function PasswordResetPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmVisible, setIsPasswordConfirmVisible] = useState(false);
  const [passwordLockState, setPasswordLockState] = useState({ capsLock: false, numLock: false });
  const [activePasswordField, setActivePasswordField] = useState<"password" | "confirm" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFormValid = password.length >= 8 && password === passwordConfirm;

  function updatePasswordLockState(event: KeyboardEvent<HTMLInputElement>) {
    setPasswordLockState({
      capsLock: event.getModifierState("CapsLock"),
      numLock: event.getModifierState("NumLock"),
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isFormValid || submitting || !user) return;

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error("비밀번호를 변경하지 못했습니다. 재설정 메일을 다시 열어주세요.");
      return;
    }

    toast.success("비밀번호를 변경했습니다.");
    await navigate({ to: getPostLoginPath(user.email, "/"), replace: true });
  }

  if (loading) return null;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md items-center px-5 py-12">
        <div className="w-full">
          <p className="text-sm text-muted-foreground">링크가 만료되었거나 유효하지 않습니다.</p>
          <Link
            to="/login"
            search={{ redirect: "/" }}
            className="mt-5 inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4"
          >
            <ArrowLeft className="h-4 w-4" />
            로그인으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md items-center px-5 py-12">
      <section className="w-full">
        <h1 className="text-xl font-semibold text-foreground">비밀번호 재설정</h1>
        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <div className="space-y-2.5">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onFocus={() => setActivePasswordField("password")}
                onBlur={() => setActivePasswordField(null)}
                onKeyDown={updatePasswordLockState}
                onKeyUp={updatePasswordLockState}
                placeholder="8자 이상"
                className="ph-mask rounded-[4px] pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {activePasswordField === "password" && (passwordLockState.capsLock || passwordLockState.numLock) && (
              <p className="text-xs text-muted-foreground">
                {passwordLockState.capsLock && "Caps Lock이 켜져 있습니다."}
                {passwordLockState.capsLock && passwordLockState.numLock && " "}
                {passwordLockState.numLock && "Num Lock이 켜져 있습니다."}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="new-password-confirm">새 비밀번호 재입력</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password-confirm"
                type={isPasswordConfirmVisible ? "text" : "password"}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                onFocus={() => setActivePasswordField("confirm")}
                onBlur={() => setActivePasswordField(null)}
                onKeyDown={updatePasswordLockState}
                onKeyUp={updatePasswordLockState}
                className="ph-mask rounded-[4px] pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setIsPasswordConfirmVisible((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={isPasswordConfirmVisible ? "비밀번호 재입력 숨기기" : "비밀번호 재입력 보기"}
              >
                {isPasswordConfirmVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {activePasswordField === "confirm" && (passwordLockState.capsLock || passwordLockState.numLock) && (
              <p className="text-xs text-muted-foreground">
                {passwordLockState.capsLock && "Caps Lock이 켜져 있습니다."}
                {passwordLockState.capsLock && passwordLockState.numLock && " "}
                {passwordLockState.numLock && "Num Lock이 켜져 있습니다."}
              </p>
            )}
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          <Button type="submit" size="lg" disabled={!isFormValid || submitting} className="w-full rounded-[4px]">
            {submitting ? "처리 중..." : "비밀번호 재설정"}
          </Button>
        </form>
      </section>
    </main>
  );
}
