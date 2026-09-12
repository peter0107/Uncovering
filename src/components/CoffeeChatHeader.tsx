import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";

const NAVIGATION = [
  { to: "/about", label: "서비스 소개" },
  { to: "/biz/coffee-chat", label: "소규모 커피챗" },
  { to: "/biz/coffee-chat/past", label: "지난 커피챗" },
] as const;

export function CoffeeChatHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <header className="reference-header sticky top-0 z-40 bg-[#edf3fe]/80 backdrop-blur">
      <div className="reference-shell reference-header-inner">
        <Link
          to="/"
          aria-label="Beginner 홈"
          className="flex shrink-0 items-center"
        >
          <BrandLogo className="reference-brand" />
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="reference-desktop-nav hidden sm:flex"
        >
          {NAVIGATION.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-[13px] font-semibold transition-colors ${
                  active
                    ? "font-semibold text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label="메뉴"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="reference-mobile-menu-button sm:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="모바일 주요 메뉴"
          className="reference-mobile-nav sm:hidden"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-1">
            {NAVIGATION.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm ${
                  pathname === item.to
                    ? "bg-neutral-100 font-semibold text-neutral-900"
                    : "text-neutral-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
