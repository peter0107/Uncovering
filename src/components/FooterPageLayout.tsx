import type { ReactNode } from "react";

type FooterPageLayoutProps = {
  title: string;
  effectiveDate?: string;
  children: ReactNode;
};

export function FooterPageLayout({ title, effectiveDate, children }: FooterPageLayoutProps) {
  return (
    <article className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-20">
      <header className="border-b border-zinc-200 pb-8">
        <h1 className="text-3xl font-semibold text-zinc-950 sm:text-4xl">{title}</h1>
        {effectiveDate && <p className="mt-3 text-sm text-zinc-500">시행일 {effectiveDate}</p>}
      </header>
      <div className="divide-y divide-zinc-200">{children}</div>
    </article>
  );
}

export function FooterPageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-9 first:pt-9">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-zinc-600">{children}</div>
    </section>
  );
}
