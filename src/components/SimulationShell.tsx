import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { RichTextContent } from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";

/** 시뮬레이션 수행 화면 공용 셸 — 상단 진행바 + 콘텐츠 + 하단 고정 액션바. */
export function SimulationShell({
  label,
  step,
  totalSteps,
  bottomBar,
  children,
}: {
  label: string;
  step: number;
  totalSteps: number;
  bottomBar?: ReactNode;
  children: ReactNode;
}) {
  const progress = totalSteps > 0 ? Math.round((Math.min(step, totalSteps) / totalSteps) * 100) : 0;
  return (
    <div className="flex min-h-dvh flex-col bg-[#EEF0F3]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-3.5 sm:px-10">
        <Link to="/" className="flex items-center">
          <BrandLogo className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-2.5 text-xs text-zinc-500 sm:gap-3.5">
          <span>{label}</span>
          <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-zinc-200 sm:inline-block">
            <span
              className="block h-full rounded-full bg-zinc-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </span>
          <span>
            {Math.min(step, totalSteps)}/{totalSteps}
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {bottomBar && (
        <div className="sticky bottom-0 z-10 border-t border-zinc-200 bg-white">{bottomBar}</div>
      )}
    </div>
  );
}

export function MaterialTabStrip({
  tabs,
  value,
  onValueChange,
  className = "",
}: {
  tabs: { label: string }[];
  value: number;
  onValueChange: (index: number) => void;
  className?: string;
}) {
  if (tabs.length <= 1) return null;
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto", className)}>
      {tabs.map((tab, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onValueChange(i)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
            i === value
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 text-zinc-500 hover:border-zinc-400",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function MaterialBody({ body, className = "" }: { body: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white p-4", className)}>
      <RichTextContent
        value={body}
        compact
        className="prose prose-sm prose-zinc max-w-none prose-table:text-sm"
      />
    </div>
  );
}
