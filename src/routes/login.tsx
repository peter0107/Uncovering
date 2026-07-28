import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getPostLoginPath } from "@/lib/admin";
import { captureLogin, captureSignup } from "@/lib/posthog";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 — Beginner" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const valid =
    email.includes("@") &&
    password.length >= 6 &&
    (!isSignup || (password === passwordConfirm && agree));

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: getPostLoginPath(user.email, redirect), replace: true });
    }
  }, [authLoading, user, redirect, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}`,
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (data.user) await captureSignup(data.user.id);
        toast.success("회원가입이 완료되었습니다. 메일함에서 인증을 완료해주세요.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }
        const signedInEmail = data.user?.email ?? email;
        if (data.user) await captureLogin(data.user.id);
        navigate({ to: getPostLoginPath(signedInEmail, redirect), replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8">
        <h1 className="text-2xl font-bold text-primary">{isSignup ? "회원가입" : "로그인"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? "직무 체험을 시작하려면 계정을 만들어주세요." : "계정에 로그인해주세요."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
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
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              <span className="text-muted-foreground">
                서비스 이용 약관 및 개인정보 처리방침에 동의합니다.{" "}
                <span className="text-brand">(필수)</span>
              </span>
            </label>
          )}

          <Button
            type="submit"
            disabled={!valid || submitting}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90 hover:text-white"
            size="lg"
          >
            {submitting ? "처리 중..." : isSignup ? "가입하고 시작하기" : "로그인"}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        <GoogleSignInButton />

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isSignup ? "login" : "signup")}
            className="font-medium text-brand hover:underline"
          >
            {isSignup ? "로그인" : "회원가입"}
          </button>
        </div>

        <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground">
          홈으로
        </Link>
      </Card>
    </div>
  );
}
