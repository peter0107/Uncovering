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

type LoginView = "choice" | "email";
type LoginMode = "signup" | "login";
type SignupStep = "email" | "verify" | "password";

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
  const [verificationEmail, setVerificationEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [temporaryPassword] = useState(() => `${crypto.randomUUID().replaceAll("-", "")}Aa1!`);

  const isSignup = mode === "signup";
  const isLoginFormValid = email.includes("@") && password.length >= 6;
  const isSignupFormValid =
    signupStep === "password" && password.length >= 6 && password === passwordConfirm && agree;

  useEffect(() => {
    if (!authLoading && user && !(view === "email" && isSignup)) {
      navigate({ to: getPostLoginPath(user.email, redirect), replace: true });
    }
  }, [authLoading, user, redirect, navigate, view, isSignup]);

  function openEmail(mode: LoginMode) {
    setMode(mode);
    setView("email");
    setSignupStep("email");
    setVerificationCode("");
    setVerificationEmail("");
    setPassword("");
    setPasswordConfirm("");
    setAgree(false);
  }

  async function sendSignupVerification() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || submitting) return;

    setSubmitting(true);
    try {
      if (signupStep === "verify") {
        const { error } = await supabase.auth.resend({ type: "signup", email: verificationEmail });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("인증번호를 다시 보냈습니다.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: temporaryPassword,
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        setSignupStep("password");
        return;
      }

      // 새 가입과 기존 미인증 가입 모두 마지막으로 발급한 코드만 검증합니다.
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });
      if (resendError) {
        toast.error(resendError.message);
        return;
      }

      setVerificationEmail(normalizedEmail);
      setVerificationCode("");
      setSignupStep("verify");
      toast.success("인증번호를 보냈습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (!isSignup) {
        if (!isLoginFormValid) return;
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

      if (!isSignupFormValid) return;

      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        await captureSignup(data.user.id);
        navigate({
          to: getPostLoginPath(data.user.email ?? email, redirect),
          replace: true,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyEmailCode() {
    if (verificationCode.length !== 6 || !verificationEmail || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: verificationCode,
        type: "signup",
      });
      if (error) {
        toast.error("인증번호가 만료되었거나 일치하지 않습니다. 재전송 후 가장 최근에 받은 번호를 입력해주세요.");
        return;
      }

      if (data.user) setSignupStep("password");
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

            <div className="mx-auto mt-10 w-full max-w-[400px] space-y-3">
              <GoogleSignInButton />
              <Button
                type="button"
                variant="outline"
                className="relative h-10 w-full rounded-[4px] border-[#dadce0] bg-white px-4 font-[Roboto,Arial,sans-serif] text-[14px] font-medium text-[#3c4043] hover:bg-[#f8fafd] hover:text-[#3c4043]"
                onClick={() => openEmail("login")}
              >
                <Mail className="absolute left-3.5 h-[18px] w-[18px]" />
                <span>이메일로 시작하기</span>
              </Button>
            </div>

            <AgreementText className="mt-12" />
          </section>
        )}

        {view === "email" && (
          <section>
            <BackButton onClick={() => setView("choice")} />
            {isSignup && (
              <h1 className="mt-5 text-2xl font-semibold text-foreground">이메일로 시작하기</h1>
            )}

            <form onSubmit={submitEmail} className={`${isSignup ? "mt-7" : "mt-8"} space-y-5`}>
              <div className="space-y-2.5">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (isSignup && signupStep !== "email") {
                        setSignupStep("email");
                        setVerificationCode("");
                        setVerificationEmail("");
                      }
                    }}
                    placeholder="name@example.com"
                    className={`rounded-[4px] pl-9 ${isSignup ? "pr-28" : ""}`}
                  />
                  {isSignup && signupStep !== "password" && email.includes("@") && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void sendSignupVerification()}
                      disabled={submitting}
                      className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-[3px] px-2 text-xs"
                    >
                      {submitting
                        ? "전송 중..."
                        : signupStep === "verify"
                          ? "재전송"
                          : "인증번호 보내기"}
                    </Button>
                  )}
                </div>
              </div>

              {isSignup && signupStep === "verify" && (
                <div className="space-y-2.5">
                  <Label htmlFor="verification-code">인증번호</Label>
                  <div className="flex items-center gap-2">
                    <InputOTP
                      id="verification-code"
                      maxLength={6}
                      value={verificationCode}
                      onChange={setVerificationCode}
                      inputMode="numeric"
                      containerClassName="flex-1 justify-start"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }, (_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 shrink-0 rounded-[4px] px-3"
                      onClick={() => void verifyEmailCode()}
                      disabled={verificationCode.length !== 6 || submitting}
                    >
                      인증
                    </Button>
                  </div>
                </div>
              )}

              {(!isSignup || signupStep === "password") && (
                <div className="space-y-2.5">
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
                      className="rounded-[4px] pl-9"
                    />
                  </div>
                </div>
              )}

              {isSignup && signupStep === "password" && (
                <>
                  <div className="space-y-2.5">
                    <Label htmlFor="password-confirm">비밀번호 재입력</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className="rounded-[4px] pl-9"
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

              {(!isSignup || signupStep === "password") && (
                <Button
                  type="submit"
                  disabled={!(isSignup ? isSignupFormValid : isLoginFormValid) || submitting}
                  size="lg"
                  className="w-full rounded-[4px]"
                >
                  {submitting ? "처리 중..." : isSignup ? "가입하기" : "로그인"}
                </Button>
              )}
            </form>

            {!isSignup && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => openEmail("signup")}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  회원가입
                </button>
              </p>
            )}
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
