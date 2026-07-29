import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowLeft, CircleCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";
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
type LoginMode = "signup" | "login" | "reset";
type SignupStep = "email" | "verify" | "password";
type ResetStep = "email" | "password";

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim() && message !== "{}") return message;
  }

  return fallback;
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<LoginView>("choice");
  const [mode, setMode] = useState<LoginMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmVisible, setIsPasswordConfirmVisible] = useState(false);
  const [passwordLockState, setPasswordLockState] = useState({ capsLock: false, numLock: false });
  const [activePasswordField, setActivePasswordField] = useState<"password" | "confirm" | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verifyingVerification, setVerifyingVerification] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null);
  const [verificationRemainingSeconds, setVerificationRemainingSeconds] = useState(0);
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [temporaryPassword] = useState(() => `${crypto.randomUUID().replaceAll("-", "")}Aa1!`);

  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const isPasswordRecoveryLink =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset") === "1";
  const isLoginFormValid = email.includes("@") && password.length >= 8;
  const isSignupFormValid =
    emailVerified && password.length >= 8 && password === passwordConfirm && agree;
  const isResetFormValid =
    resetStep === "email"
      ? email.includes("@")
      : password.length >= 8 && password === passwordConfirm;

  function updatePasswordLockState(event: KeyboardEvent<HTMLInputElement>) {
    setPasswordLockState({
      capsLock: event.getModifierState("CapsLock"),
      numLock: event.getModifierState("NumLock"),
    });
  }

  useEffect(() => {
    if (!authLoading && user && !(view === "email" && (isSignup || isReset))) {
      navigate({ to: getPostLoginPath(user.email, redirect), replace: true });
    }
  }, [authLoading, user, redirect, navigate, view, isSignup, isReset]);

  useEffect(() => {
    if (!isPasswordRecoveryLink || !user) return;
    setView("email");
    setMode("reset");
    setResetStep("password");
    setEmail(user.email ?? "");
  }, [isPasswordRecoveryLink, user]);

  useEffect(() => {
    if (!verificationExpiresAt || emailVerified) return;

    const updateRemainingSeconds = () => {
      setVerificationRemainingSeconds(Math.max(0, Math.ceil((verificationExpiresAt - Date.now()) / 1000)));
    };
    updateRemainingSeconds();

    const interval = window.setInterval(updateRemainingSeconds, 1_000);
    return () => window.clearInterval(interval);
  }, [emailVerified, verificationExpiresAt]);

  function startVerificationCountdown() {
    setVerificationExpiresAt(Date.now() + 2 * 60 * 1_000);
    setVerificationRemainingSeconds(2 * 60);
  }

  function openEmail(mode: LoginMode) {
    setMode(mode);
    setView("email");
    setSignupStep("email");
    setResetStep("email");
    setVerificationCode("");
    setVerificationEmail("");
    setEmailVerified(false);
    setVerificationExpiresAt(null);
    setVerificationRemainingSeconds(0);
    setPassword("");
    setPasswordConfirm("");
    setAgree(false);
    setLoginError(null);
  }

  async function sendPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/password-reset`,
      });
      if (error) {
        console.error("[Password reset]", error);
        toast.error(getAuthErrorMessage(error, "재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요."));
        return;
      }
      toast.success("비밀번호 재설정 메일을 보냈습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendSignupVerification() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || sendingVerification || verifyingVerification) return;

    setSendingVerification(true);
    try {
      if (signupStep === "verify") {
        const { error } = await supabase.auth.resend({ type: "signup", email: verificationEmail });
        if (error) {
          console.error("[Email verification resend]", error);
          toast.error(getAuthErrorMessage(error, "인증번호를 다시 보내지 못했습니다. 잠시 후 다시 시도해주세요."));
          return;
        }
        startVerificationCountdown();
        toast.success("인증번호를 다시 보냈습니다.");
        return;
      }

      setVerificationEmail(normalizedEmail);
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: temporaryPassword,
      });
      if (error) {
        console.error("[Email signup]", error);
        toast.error(getAuthErrorMessage(error, "회원가입을 시작하지 못했습니다. 잠시 후 다시 시도해주세요."));
        return;
      }

      if (data.session) {
        setEmailVerified(true);
        setSignupStep("password");
        return;
      }

      // 새 가입은 signUp이 인증번호를 이미 발송합니다. identities가 비어 있으면
      // 이전에 생성됐지만 인증되지 않은 계정일 수 있어 그때만 새 코드를 발급합니다.
      if ((data.user?.identities?.length ?? 0) === 0) {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: normalizedEmail,
        });
        if (resendError) {
          console.error("[Email verification resend]", resendError);
          toast.error(
            getAuthErrorMessage(
              resendError,
              "인증번호를 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
            ),
          );
          return;
        }
      }

      setVerificationCode("");
      setSignupStep("verify");
      startVerificationCountdown();
      toast.success("인증번호를 보냈습니다.");
    } finally {
      setSendingVerification(false);
    }
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (!isSignup && !isReset) {
        if (!isLoginFormValid) return;
        setLoginError(null);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          console.error("[Email login]", error);
          setLoginError("등록되지 않은 이메일이거나 비밀번호가 다릅니다. 다른 정보로 다시 시도해주세요.");
          return;
        }

        if (data.user) await captureLogin(data.user.id, data.user.email);
        navigate({
          to: getPostLoginPath(data.user?.email ?? email, redirect),
          replace: true,
        });
        return;
      }

      if (isReset) {
        if (!isResetFormValid) return;
        if (resetStep === "email") {
          await sendPasswordReset();
          return;
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          console.error("[Password reset update]", error);
          toast.error(getAuthErrorMessage(error, "비밀번호를 변경하지 못했습니다. 재설정 메일을 다시 열어주세요."));
          return;
        }

        toast.success("비밀번호를 변경했습니다.");
        navigate({ to: getPostLoginPath(user?.email ?? email, redirect), replace: true });
        return;
      }

      if (!isSignupFormValid) return;

      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        await captureSignup(data.user.id, data.user.email);
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
    if (
      verificationCode.length !== 6 ||
      !verificationEmail ||
      verifyingVerification ||
      sendingVerification ||
      emailVerified
    ) {
      return;
    }

    setVerifyingVerification(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: verificationCode,
        type: "signup",
      });
      if (error) {
        console.error("[Email verification]", error);
        toast.error("인증번호가 만료되었거나 일치하지 않습니다. 재전송 후 가장 최근에 받은 번호를 입력해주세요.");
        return;
      }

      if (data.user) {
        setEmailVerified(true);
        setVerificationExpiresAt(null);
        setVerificationRemainingSeconds(0);
        setSignupStep("password");
      }
    } finally {
      setVerifyingVerification(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md items-center px-5 py-12">
      <div className="w-full">
        {view === "choice" && (
          <section className="mx-auto w-full max-w-[400px]">
            <h1 className="text-center text-[24px] font-semibold leading-8 text-foreground">
              Beginner 시작하기
            </h1>

            <div className="mt-10 w-full space-y-4">
              <GoogleSignInButton size="large" appearance="matched" />
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full gap-3 rounded-[14px] border-[#dadce0] bg-white px-4 text-base font-medium text-[#202124] shadow-none hover:bg-[#f8fafd] hover:text-[#202124]"
                onClick={() => openEmail("login")}
              >
                <Mail className="!h-5 !w-5 stroke-[2]" />
                <span>이메일로 시작하기</span>
              </Button>
            </div>

            <AgreementText className="mt-12" />
          </section>
        )}

        {view === "email" && (
          <section>
            <BackButton onClick={() => ((isSignup || isReset) ? openEmail("login") : setView("choice"))} />
            {isSignup && (
              <h1 className="mt-5 text-xl font-semibold text-foreground">회원가입</h1>
            )}

            <form onSubmit={submitEmail} className={`${isSignup ? "mt-7" : "mt-8"} space-y-5`}>
              {(!isReset || resetStep === "email") && (
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
                      setLoginError(null);
                      if (isSignup) {
                        setEmailVerified(false);
                        setSignupStep("email");
                        setVerificationCode("");
                        setVerificationEmail("");
                        setVerificationExpiresAt(null);
                        setVerificationRemainingSeconds(0);
                      }
                    }}
                    placeholder="name@example.com"
                    className={`rounded-[4px] pl-9 ${isSignup ? emailVerified ? "pr-10" : "pr-28" : ""}`}
                  />
                  {isSignup && !emailVerified && email.includes("@") && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void sendSignupVerification()}
                      disabled={sendingVerification || verifyingVerification}
                      className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-[3px] px-2 text-xs"
                    >
                      {sendingVerification
                        ? "전송 중..."
                        : signupStep === "verify"
                          ? "재전송"
                          : "인증번호 보내기"}
                    </Button>
                  )}
                  {isSignup && emailVerified && (
                    <CircleCheck
                      aria-label="이메일 인증 완료"
                      className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600"
                    />
                  )}
                </div>
              </div>
              )}

              {isSignup && signupStep !== "email" && (
                <div className="space-y-2.5">
                  <Label htmlFor="verification-code">인증번호</Label>
                  <div className="flex items-center gap-2">
                    <InputOTP
                      id="verification-code"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(value) => setVerificationCode(value.replaceAll(/\D/g, ""))}
                      pattern={REGEXP_ONLY_DIGITS}
                      inputMode="numeric"
                      disabled={emailVerified}
                      containerClassName="flex-1 justify-start"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }, (_, index) => (
                          <InputOTPSlot key={index} index={index} className="h-8 w-8 text-xs" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 shrink-0 rounded-[4px] px-3 text-xs"
                      onClick={() => void verifyEmailCode()}
                      disabled={
                        emailVerified ||
                        verificationCode.length !== 6 ||
                        verificationRemainingSeconds === 0 ||
                        verifyingVerification ||
                        sendingVerification
                      }
                    >
                      {emailVerified ? "인증 완료" : verifyingVerification ? "인증 중..." : "인증"}
                    </Button>
                  </div>
                  {!emailVerified && (
                    <p className="text-xs text-muted-foreground">
                      {verificationRemainingSeconds > 0
                        ? `인증번호를 ${String(Math.floor(verificationRemainingSeconds / 60)).padStart(2, "0")}:${String(verificationRemainingSeconds % 60).padStart(2, "0")} 안에 입력해주세요.`
                        : "인증번호 입력 시간이 만료되었습니다. 재전송해주세요."}
                    </p>
                  )}
                </div>
              )}

              {((!isSignup && !isReset) || isSignup || (isReset && resetStep === "password")) && (
                <div className="space-y-2.5">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError(null);
                      }}
                      onFocus={() => setActivePasswordField("password")}
                      onBlur={() => setActivePasswordField(null)}
                      onKeyDown={updatePasswordLockState}
                      onKeyUp={updatePasswordLockState}
                      placeholder="8자 이상"
                      className="rounded-[4px] pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
                      title={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
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
              )}

              {(isSignup || (isReset && resetStep === "password")) && (
                <>
                  <div className="space-y-2.5">
                    <Label htmlFor="password-confirm">비밀번호 재입력</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password-confirm"
                        type={isPasswordConfirmVisible ? "text" : "password"}
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        onFocus={() => setActivePasswordField("confirm")}
                        onBlur={() => setActivePasswordField(null)}
                        onKeyDown={updatePasswordLockState}
                        onKeyUp={updatePasswordLockState}
                        className="rounded-[4px] pl-9 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordConfirmVisible((visible) => !visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={isPasswordConfirmVisible ? "비밀번호 재입력 숨기기" : "비밀번호 재입력 보기"}
                        title={isPasswordConfirmVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
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

                  {isSignup && <label className="flex items-start gap-2 pt-1 text-sm text-muted-foreground">
                    <Checkbox
                      checked={agree}
                      onCheckedChange={(value) => setAgree(Boolean(value))}
                      className="mt-0.5"
                    />
                    <span>개인정보 처리방침과 이용약관에 동의합니다.</span>
                  </label>}
                </>
              )}

              {!isSignup && !isReset && loginError && (
                <p role="alert" className="text-sm text-destructive">{loginError}</p>
              )}

              {((!isSignup && !isReset) || isSignup || (isReset && resetStep === "email") || (isReset && resetStep === "password")) && (
                <Button
                  type="submit"
                  disabled={!(isSignup ? isSignupFormValid : isReset ? isResetFormValid : isLoginFormValid) || submitting}
                  size="lg"
                  className="w-full rounded-[4px]"
                >
                  {submitting
                    ? "처리 중..."
                    : isSignup
                      ? "가입하기"
                      : isReset
                        ? resetStep === "email"
                          ? "비밀번호 재설정 메일 보내기"
                          : "비밀번호 재설정"
                        : "로그인"}
                </Button>
              )}
            </form>

            {!isSignup && !isReset && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => openEmail("signup")}
                  className="cursor-pointer font-medium text-foreground underline underline-offset-4"
                >
                  계정이 없으신가요?
                </button>
                <span className="mx-2 text-border">·</span>
                <button
                  type="button"
                  onClick={() => openEmail("reset")}
                  className="cursor-pointer font-medium text-foreground underline underline-offset-4"
                >
                  비밀번호를 잊으셨나요?
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
