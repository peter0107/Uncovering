import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mail, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { capturePostHogEvent } from "@/lib/posthog";

type Props = {
  trigger: React.ReactNode;
  redirectTo?: string;
  defaultMode?: "signup" | "login";
};

export function SignupDialog({ trigger, redirectTo = "/experiences", defaultMode = "signup" }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const isSignup = mode === "signup";
  const valid =
    email.includes("@") &&
    password.length >= 6 &&
    (!isSignup || (password === passwordConfirm && agree));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        void capturePostHogEvent("user_signed_up", { email, method: "email" }, email);
        toast.success("회원가입이 완료되었습니다. 메일함에서 인증을 완료해주세요.");
        setOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }
        void capturePostHogEvent("user_logged_in", { email, method: "email" }, email);
        toast.success("로그인되었습니다.");
        setOpen(false);
        navigate({ to: redirectTo });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-w-[320px] gap-3 p-5 sm:max-w-[420px] sm:gap-4 sm:p-6"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">
            {isSignup ? "회원가입" : "로그인"}
          </DialogTitle>
          <DialogDescription>
            {isSignup
              ? "직무 체험을 시작하려면 계정을 만들어주세요."
              : "계정에 로그인해주세요."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="su-email">이메일</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="su-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력해주세요."
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="su-password">비밀번호</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="su-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                className="pl-9"
              />
            </div>
          </div>

          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="su-password2">비밀번호 재입력</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="su-password2"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력해주세요"
                  className="pl-9"
                />
              </div>
              {passwordConfirm.length > 0 && password !== passwordConfirm && (
                <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
          )}

          {isSignup && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={agree}
                onCheckedChange={(v) => setAgree(!!v)}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                서비스 이용 약관 및 개인정보 처리방침에 동의합니다.{" "}
                <span className="text-brand">(필수)</span>
              </span>
            </label>
          )}

          {email.length > 0 && password.length > 0 && (
          <Button
            type="submit"
            disabled={!valid || submitting}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            size="lg"
          >
            {submitting ? "처리 중..." : isSignup ? "가입하고 시작하기" : "로그인"}
          </Button>
          )}
        </form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        <GoogleSignInButton
          postLoginPath={redirectTo}
          onSuccess={() => {
            setOpen(false);
            navigate({ to: redirectTo });
          }}
        />

        <div className="text-center text-sm text-muted-foreground">
          {isSignup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isSignup ? "login" : "signup")}
            className="font-medium text-brand hover:underline"
          >
            {isSignup ? "로그인" : "회원가입"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
