import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { AUTHENTICATION_ENABLED } from "@/lib/auth-features";

const NAV: { to: string; label: string }[] = [];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLoginPage = pathname === "/login";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[72.5rem] items-center justify-between px-12 max-[42rem]:px-5">
          <Link
            to="/"
            className="flex items-center"
            aria-label="Beginner 홈"
          >
            <BrandLogo className="h-[1.9rem] w-auto max-w-[9.75rem] object-contain object-left" />
          </Link>

          <nav className="hidden items-center gap-7 min-[42rem]:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-semibold" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {!isLoginPage && AUTHENTICATION_ENABLED && (
            <div className="hidden items-center gap-4 min-[42rem]:flex">
              {user ? (
                <AccountMenu />
              ) : (
                <>
                  <Link
                    to="/login"
                    search={{ redirect: "/" }}
                    className="text-[13px] font-semibold leading-none text-[#4b5563] transition-colors hover:text-[#1659e3]"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/start"
                    className="inline-flex h-9 items-center rounded-[8px] bg-[#1659e3] px-[1.05rem] text-[13px] font-bold leading-none text-white transition-colors hover:bg-[#0f49c5] hover:text-white"
                  >
                    시작하기
                  </Link>
                </>
              )}
            </div>
          )}

          {!isLoginPage && (user || AUTHENTICATION_ENABLED || NAV.length > 0) && <div className="flex items-center gap-1 min-[42rem]:hidden">
            {user && <AccountMenu />}
            <button
              aria-label="메뉴"
              onClick={() => setOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-[8px] bg-white text-[#1a2340] transition-colors hover:bg-[#e5edfb]"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>}
        </div>

        {!isLoginPage && open && (user || AUTHENTICATION_ENABLED || NAV.length > 0) && (
          <div className="border-t border-border bg-background min-[42rem]:hidden">
            <div className="mx-auto flex max-w-[72.5rem] flex-col gap-1 px-5 py-3">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  {n.label}
                </Link>
              ))}
              {AUTHENTICATION_ENABLED && !user && (
                <>
                  <Link
                    to="/login"
                    search={{ redirect: "/" }}
                    onClick={() => setOpen(false)}
                    className="flex min-h-10 items-center rounded-[8px] px-3 text-sm font-semibold text-[#4b5563] transition-colors hover:bg-[#e5edfb]"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/start"
                    onClick={() => setOpen(false)}
                    className="mt-1 flex min-h-10 items-center justify-center rounded-[8px] bg-[#1659e3] px-3 text-sm font-bold text-white transition-colors hover:bg-[#0f49c5] hover:text-white"
                  >
                    시작하기
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
