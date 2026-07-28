import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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

type LoginView = "choice" | "email" | "verify";
type LoginMode = "signup" | "login";

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<LoginView>("choice");
  const [mode, setMode] = useState<LoginMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const isEmailFormValid =
    email.includes("@") &&
    password.length >= 6 &&
    (!isSignup || (password === passwordConfirm && agree));

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: getPostLoginPath(user.email, redirect), replace: true });
    }
  }, [authLoading, user, redirect, navigate]);

  function openEmail(mode: LoginMode) {
    setMode(mode);
    setView("email");
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (!isEmailFormValid || submitting) return;

    setSubmitting(true);
    try {
      if (!isSignup) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }

        if (data.user) await captureLogin(data.user.id);
        navigate({
          to: getPostLoginPath(data.user?.email ?? email, redirect),
          replace: true,
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session && data.user) {
        await captureSignup(data.user.id);
        navigate({
          to: getPostLoginPath(data.user.email ?? email, redirect),
          replace: true,
        });
        return;
      }

      setVerificationCode("");
      setView("verify");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyEmailCode(e: FormEvent) {
    e.preventDefault();
    if (verificationCode.length !== 6 || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: "email",
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) await captureSignup(data.user.id);
      navigate({
        to: getPostLoginPath(data.user?.email ?? email, redirect),
        replace: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerificationCode() {
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("인증번호를 다시 보냈습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md items-center px-5 py-12">
      <div className="w-full">
        {view === "choice" && (
          <section>
            <h1 className="text-center text-2xl font-semibold text-foreground">
              Beginner 시작하기
            </h1>

            <div className="mt-10 space-y-3">
              <GoogleSignInButton />
              <Button
                type="button"
                variant="outline"
                className="relative h-10 w-full rounded-[4px] border-[#dadce0] bg-white px-4 font-[Roboto,Arial,sans-serif] text-[14px] font-medium text-[#3c4043] hover:bg-[#f8fafd] hover:text-[#3c4043]"
                onClick={() => openEmail("signup")}
              >
                <Mail className="absolute left-3.5 h-[18px] w-[18px]" />
                <span>이메일로 시작하기</span>
              </Button>
            </div>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              기존 계정이 있으신가요?{" "}
              <button
                type="button"
                onClick={() => openEmail("login")}
                className="font-medium text-foreground underline underline-offset-4"
              >
                로그인
              </button>
            </div>

            <AgreementText className="mt-12" />
          </section>
        )}

        {view === "email" && (
          <section>
            <BackButton onClick={() => setView("choice")} />
            <h1 className="mt-5 text-2xl font-semibold text-foreground">
              {isSignup ? "이메일로 시작하기" : "로그인"}
            </h1>

            <form onSubmit={submitEmail} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상"
                    className="pl-9"
                  />
                </div>
              </div>

              {isSignup && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="password-confirm">비밀번호 재입력</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {passwordConfirm.length > 0 && password !== passwordConfirm && (
                      <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
                    )}
                  </div>

                  <label className="flex items-start gap-2 pt-1 text-sm text-muted-foreground">
                    <Checkbox
                      checked={agree}
                      onCheckedChange={(value) => setAgree(Boolean(value))}
                      className="mt-0.5"
                    />
                    <span>개인정보 처리방침과 이용약관에 동의합니다.</span>
                  </label>
                </>
              )}

              <Button
                type="submit"
                disabled={!isEmailFormValid || submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? "처리 중..." : isSignup ? "인증번호 보내기" : "로그인"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
              <button
                type="button"
                onClick={() => setMode(isSignup ? "login" : "signup")}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {isSignup ? "로그인" : "회원가입"}
              </button>
            </p>
          </section>
        )}

        {view === "verify" && (
          <section>
            <BackButton onClick={() => setView("email")} />
            <h1 className="mt-5 text-2xl font-semibold text-foreground">이메일 인증</h1>

            <form onSubmit={verifyEmailCode} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="verification-code">인증번호</Label>
                <InputOTP
                  id="verification-code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  inputMode="numeric"
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={verificationCode.length !== 6 || submitting}
              >
                {submitting ? "처리 중..." : "인증하고 시작하기"}
              </Button>
            </form>

            <button
              type="button"
              onClick={resendVerificationCode}
              disabled={submitting}
              className="mt-5 w-full text-center text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-50"
            >
              인증번호 다시 보내기
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      이전
    </button>
  );
}

function AgreementText({ className }: { className?: string }) {
  return (
    <p className={`text-center text-xs leading-5 text-muted-foreground ${className ?? ""}`}>
      <span className="block">
        <Link to="/privacy" className="underline underline-offset-4">
          개인정보 처리방침
        </Link>{" "}
        <span>·</span>{" "}
        <Link to="/terms" className="underline underline-offset-4">
          이용약관
        </Link>
      </span>
      위 내용을 모두 확인하였으며, 회원가입에 동의합니다.
    </p>
  );
}
