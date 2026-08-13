import { useEffect, useState } from "react";
import { Search, Clock } from "lucide-react";
import { PageId, PAGE_TITLES } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
}

export function TopNav({
  activePage,
  onOpenPalette,
  onNavigate,
}: {
  activePage: PageId;
  onOpenPalette: () => void;
  onNavigate: (id: PageId) => void;
}) {
  const clock = useLiveClock();
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 glass-header-master">
      <div className="h-14 flex items-center gap-4 pl-4 pr-4 md:pl-6">
        {/* Brand */}
        <button
          onClick={() => onNavigate("overview")}
          className="flex items-center gap-2 shrink-0"
          aria-label="Go to Overview"
        >
          <span className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
            EDF Sugarcane
          </span>
        </button>

        <div className="hidden md:block w-px h-5" style={{ background: "var(--hairline)" }} />

        {/* Current page title */}
        <span className="hidden md:inline text-[13px] font-medium" style={{ color: "var(--ink)", opacity: 0.75 }}>
          {PAGE_TITLES[activePage]}
        </span>

        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-[12px]"
            style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--ink)", opacity: 0.7, minWidth: 220 }}
            aria-label="Search pages and farmers"
          >
            <Search size={13} />
            <span className="flex-1 text-left">Search pages &amp; farmers...</span>
            <kbd
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--hairline)", color: "var(--ink)" }}
            >
              {isMac ? "⌘ K" : "Ctrl K"}
            </kbd>
          </button>

          <button
            onClick={onOpenPalette}
            className="sm:hidden p-2 rounded-full"
            style={{ color: "var(--ink)" }}
            aria-label="Search"
          >
            <Search size={16} />
          </button>

          <span
            className="hidden md:flex items-center gap-1.5 text-[12px] font-medium tabular-nums"
            style={{ color: "var(--ink)", opacity: 0.65 }}
          >
            <Clock size={13} />
            {clock}
          </span>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
