import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, House, Moon, Plus, Search, Sun } from "lucide-react";
import type { Category, ThemeMode } from "@/types";
import { cn } from "@/utils/cn";
import { SyncStatusButton } from "@/components/GitHubPanel";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_4px_14px_-6px_var(--accent)]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M19.5 4.5c0 8.2-5.1 13-11.3 13-1.6 0-2.7-.9-2.7-2.4C5.5 8.9 10.6 4.5 19.5 4.5Z"
            fill="currentColor"
          />
          <path
            d="M5.5 20.5c1.6-5 4.9-8.8 9.4-11.3"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-[-0.025em] text-[var(--text)]">
            PersonalB
          </span>
          <span className="mt-[3px] text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--faint)]">
            new tab
          </span>
        </span>
      ) : null}
    </span>
  );
}

type HeaderProps = {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  onAddCategory: () => void;
  onSearch: () => void;
  onAddBookmark: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  syncStatus?: "off" | "connecting" | "syncing" | "synced" | "error" | "conflict";
  onOpenCloud?: () => void;
};

export function Header({
  categories,
  activeCategory,
  onSelectCategory,
  onAddCategory,
  onSearch,
  onAddBookmark,
  theme,
  onToggleTheme,
  syncStatus,
  onOpenCloud,
}: HeaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const el = activeRef.current;
    if (!container || !el) return;
    const target = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeCategory]);

  const scrollTabs = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  const tabs = (
    <div
      ref={scrollRef}
      className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth px-0.5"
    >
      <button
        ref={activeCategory === "home" ? activeRef : null}
        onClick={() => onSelectCategory("home")}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-all duration-200",
          activeCategory === "home"
            ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_5px_18px_-8px_var(--accent)]"
            : "text-[var(--text-soft)] hover:bg-[var(--field)] hover:text-[var(--text)]",
        )}
        aria-current={activeCategory === "home"}
      >
        <House size={13} strokeWidth={2.2} />
        Home
      </button>

      <span className="mx-1 h-4 w-px shrink-0 bg-[var(--border)]" aria-hidden />

      {categories.map((category) => {
        const active = activeCategory === category.id;
        return (
          <button
            key={category.id}
            ref={active ? activeRef : null}
            onClick={() => onSelectCategory(category.id)}
            title={`${category.name} · ${category.bookmarks.length} bookmarks`}
            className={cn(
              "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-all duration-200",
              active
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_5px_18px_-8px_var(--accent)]"
                : "text-[var(--text-soft)] hover:bg-[var(--field)] hover:text-[var(--text)]",
            )}
            aria-current={active}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: active ? "var(--accent-ink)" : category.accent,
                opacity: active ? 0.75 : 0.95,
              }}
              aria-hidden
            />
            {category.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-40">
      <div
        className="pointer-events-none absolute inset-0 backdrop-blur-[10px]"
        style={{
          backgroundImage:
            theme === "dark"
              ? "linear-gradient(to bottom, rgba(6,13,10,.86) 0%, rgba(6,13,10,.55) 62%, rgba(6,13,10,0) 100%)"
              : "linear-gradient(to bottom, rgba(240,245,237,.9) 0%, rgba(240,245,237,.62) 62%, rgba(240,245,237,0) 100%)",
          maskImage: "linear-gradient(to bottom, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-[1560px] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-3 pb-3 pt-3 sm:px-5 sm:pb-3.5">
        <button
          onClick={() => onSelectCategory("home")}
          className="col-start-1 row-start-1 flex shrink-0 items-center rounded-xl pr-1 transition-opacity hover:opacity-85"
          aria-label="PersonalB home"
        >
          <Wordmark />
        </button>

        <div className="col-span-3 col-start-1 row-start-2 flex w-full min-w-0 items-center justify-center gap-1 md:col-span-1 md:col-start-2 md:row-start-1">
          <button
            onClick={() => scrollTabs(-1)}
            className="icon-btn hidden h-7 w-7 shrink-0 rounded-full border border-[var(--border)] lg:inline-flex"
            aria-label="Scroll tabs left"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="max-w-[740px] min-w-0 flex-1">{tabs}</div>
          <button
            onClick={() => scrollTabs(1)}
            className="icon-btn hidden h-7 w-7 shrink-0 rounded-full border border-[var(--border)] lg:inline-flex"
            aria-label="Scroll tabs right"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={onAddCategory}
            className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-[var(--border-strong)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
            aria-label="Add category"
            title="Add a new category"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="col-start-3 row-start-1 flex shrink-0 items-center gap-1.5 justify-self-end sm:gap-2">
          <button
            onClick={onSearch}
            className="flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--field)] px-2.5 text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)] sm:px-3"
            aria-label="Search bookmarks"
          >
            <Search size={15} />
            <span className="hidden text-[12px] sm:inline">Search</span>
            <kbd className="ml-1 hidden rounded border border-[var(--border)] bg-[var(--field)] px-1 font-sans text-[10px] text-[var(--faint)] lg:inline">
              ⌘K
            </kbd>
          </button>

          <button onClick={onAddBookmark} className="btn-primary h-9 px-3 sm:px-4">
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Bookmark</span>
          </button>

          {onOpenCloud ? (
            <SyncStatusButton status={syncStatus ?? "off"} onClick={onOpenCloud} />
          ) : null}

          <button
            onClick={onToggleTheme}
            className="icon-btn h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--field)]"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

      </div>
    </header>
  );
}
