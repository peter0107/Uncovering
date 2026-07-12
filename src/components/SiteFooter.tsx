export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[#EEF0F4]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Beginner. All rights reserved.</span>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a href="/#faq" className="transition-colors hover:text-zinc-600">
            자주 묻는 질문
          </a>
          <a href="/#terms" className="transition-colors hover:text-zinc-600">
            이용약관
          </a>
          <a href="/#privacy" className="transition-colors hover:text-zinc-600">
            개인정보처리방침
          </a>
        </nav>
      </div>
    </footer>
  );
}
