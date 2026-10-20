import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronRight,
  Cloud,
  CornerDownLeft,
  Database,
  ExternalLink,
  FolderPlus,
  Globe,
  Image as ImageIcon,
  Keyboard,
  LayoutGrid,
  Link2,
  Monitor,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Bookmark, Category, Settings, ThemeMode, WallpaperPreset } from "@/types";
import { hostnameOf } from "@/lib/storage";
import { cn } from "@/utils/cn";
import { CategoryGlyph, FaviconTile, Modal, Sheet, Slider } from "@/components/ui";

type SearchResult = { bookmark: Bookmark; category: Category };

export function SearchPalette({
  open,
  onClose,
  categories,
  onOpenBookmark,
  onSelectCategory,
  onAddBookmark,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onOpenBookmark: (bookmark: Bookmark) => void;
  onSelectCategory: (categoryId: string) => void;
  onAddBookmark: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo<SearchResult[]>(
    () =>
      categories.flatMap((category) =>
        category.bookmarks.map((bookmark) => ({ bookmark, category })),
      ),
    [categories],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? all.filter(
          ({ bookmark, category }) =>
            bookmark.title.toLowerCase().includes(q) ||
            bookmark.url.toLowerCase().includes(q) ||
            category.name.toLowerCase().includes(q),
        )
      : all.slice(0, 8);
    return list
      .sort((a, b) => {
        const aStarts = a.bookmark.title.toLowerCase().startsWith(q) ? -1 : 0;
        const bStarts = b.bookmark.title.toLowerCase().startsWith(q) ? -1 : 0;
        return aStarts - bStarts;
      })
      .slice(0, 40);
  }, [all, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`search-result-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const launch = (result?: SearchResult) => {
    if (!result) return;
    onOpenBookmark(result.bookmark);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] overflow-y-auto">
      <div className="fixed inset-0 animate-fade-in bg-[var(--scrim)] backdrop-blur-lg" onClick={onClose} />
      <div className="relative mx-auto mt-[9vh] w-[calc(100%-2rem)] max-w-[620px] animate-pop-in px-0 pb-10">
        <div className="glass-solid overflow-hidden rounded-[20px]">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
            <Search size={17} className="shrink-0 text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((i) => Math.min(i + 1, results.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  if (query.trim() && results.length === 0) {
                    onAddBookmark(query.trim());
                    onClose();
                  } else {
                    launch(results[active]);
                  }
                }
              }}
              placeholder="Search bookmarks, links, spaces…"
              className="w-full flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
              aria-label="Search bookmarks"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="icon-btn h-6 w-6 rounded-md"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : null}
            <kbd className="rounded-md border border-[var(--border)] bg-[var(--field)] px-1.5 py-0.5 font-sans text-[10px] text-[var(--faint)]">
              esc
            </kbd>
          </div>

          {!query.trim() ? (
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] px-3 py-2.5 no-scrollbar">
              <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                Spaces
              </span>
              {categories.slice(0, 8).map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onSelectCategory(category.id);
                    onClose();
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-soft)] transition hover:border-[var(--border-strong)] hover:bg-[var(--field)]"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: category.accent }}
                  />
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="max-h-[46vh] overflow-y-auto overscroll-contain p-2">
            <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
                {query.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Recently saved"}
              </p>
              <span className="text-[10px] text-[var(--faint)]">{all.length} links total</span>
            </div>

            {results.length ? (
              results.map((result, index) => (
                <button
                  key={`${result.category.id}-${result.bookmark.id}`}
                  id={`search-result-${index}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => launch(result)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                    index === active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--field)]",
                  )}
                >
                  <FaviconTile
                    url={result.bookmark.url}
                    title={result.bookmark.title}
                    color={result.bookmark.color}
                    size={30}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--text)]">
                      {result.bookmark.title}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--faint)]">
                      {hostnameOf(result.bookmark.url)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)] sm:inline-flex">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: result.category.accent }}
                    />
                    {result.category.name}
                  </span>
                  <CornerDownLeft
                    size={13}
                    className={cn(
                      "shrink-0 text-[var(--faint)]",
                      index === active ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[var(--field)] text-[var(--faint)]">
                  <Search size={18} />
                </div>
                <p className="text-[13.5px] font-medium">No bookmarks match “{query}”</p>
                <p className="mt-1 text-[11.5px] text-[var(--muted)]">
                  Save it now and it'll appear here forever.
                </p>
                <button
                  onClick={() => {
                    onAddBookmark(query.trim());
                    onClose();
                  }}
                  className="btn-primary mt-4"
                >
                  <Plus size={14} /> Add “{query.trim().slice(0, 24)}”
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-3.5 py-2.5 text-[10.5px] text-[var(--faint)]">
            <span className="hidden items-center gap-2 sm:flex">
              <kbd className="rounded border border-[var(--border)] px-1 py-0.5">↑</kbd>
              <kbd className="rounded border border-[var(--border)] px-1 py-0.5">↓</kbd>
              to move
              <kbd className="ml-1 rounded border border-[var(--border)] px-1 py-0.5">↵</kbd>
              to open
            </span>
            <button
              onClick={() => {
                onAddBookmark(query.trim());
                onClose();
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-[var(--muted)] transition hover:bg-[var(--field)] hover:text-[var(--text)]"
            >
              <Plus size={12} /> New bookmark
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  categories: Category[];
  wallpapers: WallpaperPreset[];
  onUpdateSettings: (patch: Partial<Settings>) => void;
  onSelectPreset: (preset: WallpaperPreset) => void;
  onUploadWallpaper: (file: File) => void;
  onRemoveCustomWallpaper: () => void;
  onApplyWallpaperUrl: (url: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onRestoreSamples: () => void;
  onClearAll: () => void;
  onNotify: (message: string) => void;
  githubPanel?: ReactNode;
  onOpenCloud?: () => void;
};

export type SettingsTab = "wallpaper" | "layout" | "data" | "github";

export function SettingsSheet({
  open,
  onClose,
  settings,
  categories,
  wallpapers,
  onUpdateSettings,
  onSelectPreset,
  onUploadWallpaper,
  onRemoveCustomWallpaper,
  onApplyWallpaperUrl,
  onExport,
  onImport,
  onRestoreSamples,
  onClearAll,
  onNotify,
  githubPanel,
  onOpenCloud,
  defaultTab = "wallpaper",
}: SettingsSheetProps & { defaultTab?: SettingsTab }) {
  const [tab, setTab] = useState<SettingsTab>(defaultTab);
  const [urlDraft, setUrlDraft] = useState("");

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const bookmarkCount = categories.reduce((sum, category) => sum + category.bookmarks.length, 0);
  const currentWallpaper =
    settings.wallpaperId === "custom"
      ? settings.customWallpaper
      : wallpapers.find((w) => w.id === settings.wallpaperId)?.background;

  const tabs = [
    { id: "wallpaper" as const, label: "Wallpaper", icon: <ImageIcon size={13} /> },
    { id: "layout" as const, label: "Layout", icon: <LayoutGrid size={13} /> },
    { id: "data" as const, label: "Data", icon: <Database size={13} /> },
    { id: "github" as const, label: "GitHub", icon: <Cloud size={13} /> },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Make it yours"
      subtitle="Saved in this browser — or in your own GitHub."
      icon={<Palette size={18} />}
    >
      <div className="mb-5 flex rounded-xl border border-[var(--border)] bg-[var(--field)] p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10.5px] font-medium transition sm:gap-1.5 sm:px-2 sm:text-[11.5px]",
              tab === item.id
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {tab === "wallpaper" ? (
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label !mb-0">Wallpapers</span>
              <span className="text-[10.5px] text-[var(--faint)]">Tap to apply</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {wallpapers.map((preset) => {
                const selected = settings.wallpaperId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset(preset)}
                    className={cn(
                      "group relative aspect-[4/3] overflow-hidden rounded-xl border text-left transition-all",
                      selected
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]",
                    )}
                    title={preset.name}
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        backgroundColor: preset.base,
                        backgroundImage: preset.background,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[9.5px] font-medium text-white/90">
                      {preset.name}
                    </span>
                    {selected ? (
                      <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="label">Your own wallpaper</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadWallpaper(file);
                event.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileRef.current?.click();
                }
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-left transition",
                settings.wallpaperId === "custom"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--field)]",
              )}
            >
              {settings.customWallpaper ? (
                <span
                  className="h-10 w-14 shrink-0 rounded-lg border border-[var(--border)] bg-cover bg-center"
                  style={{ backgroundImage: `url('${settings.customWallpaper}')` }}
                />
              ) : (
                <span className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-[var(--field)] text-[var(--muted)]">
                  <Upload size={15} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium">
                  {settings.customWallpaper ? "Custom wallpaper applied" : "Upload an image"}
                </span>
                <span className="block text-[10.5px] text-[var(--faint)]">
                  JPG or PNG · resized and kept locally
                </span>
              </span>
              {settings.customWallpaper ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveCustomWallpaper();
                  }}
                  className="icon-btn h-7 w-7 shrink-0"
                  aria-label="Remove custom wallpaper"
                >
                  <X size={13} />
                </button>
              ) : (
                <ChevronRight size={15} className="text-[var(--faint)]" />
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Link2
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--faint)]"
                />
                <input
                  value={urlDraft}
                  onChange={(event) => setUrlDraft(event.target.value)}
                  placeholder="or paste an image URL"
                  className="field !py-2 pl-8 text-[12px]"
                />
              </div>
              <button
                onClick={() => {
                  if (!urlDraft.trim()) {
                    onNotify("Paste an image URL first.");
                    return;
                  }
                  onApplyWallpaperUrl(urlDraft.trim());
                  setUrlDraft("");
                }}
                className="btn-ghost !px-3 !py-2 text-[12px]"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--field)] p-3.5">
            <Slider
              label="Wallpaper dim"
              value={settings.dim}
              min={0}
              max={0.85}
              step={0.01}
              onChange={(value) => onUpdateSettings({ dim: value })}
              display={`${Math.round(settings.dim * 100)}%`}
            />
            <Slider
              label="Wallpaper softness"
              value={settings.blur}
              min={0}
              max={18}
              step={1}
              onChange={(value) => onUpdateSettings({ blur: value })}
              display={`${settings.blur}px`}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[var(--field)] p-3">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Wallpapers stay in this browser. Nothing is uploaded to a server.
            </p>
          </div>
        </div>
      ) : null}

      {tab === "layout" ? (
        <div className="space-y-6">
          <div>
            <span className="label">Appearance</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "dark", label: "Evening", icon: <Moon size={14} /> },
                  { id: "light", label: "Daylight", icon: <Sun size={14} /> },
                ] as { id: ThemeMode; label: string; icon: React.ReactNode }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onUpdateSettings({ theme: mode.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition",
                    settings.theme === mode.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--field)]",
                  )}
                >
                  {mode.icon}
                  {mode.label}
                  {settings.theme === mode.id ? (
                    <Check size={13} className="ml-auto text-[var(--accent)]" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--field)] p-3.5">
            <Slider
              label="Card opacity"
              value={settings.cardOpacity}
              min={0.18}
              max={0.92}
              step={0.02}
              onChange={(value) => onUpdateSettings({ cardOpacity: value })}
              display={`${Math.round(settings.cardOpacity * 100)}%`}
            />
            <p className="text-[11px] leading-relaxed text-[var(--faint)]">
              Lower opacity lets more of your wallpaper through the cards.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] p-3.5">
            <div className="flex items-center gap-2 text-[12.5px] font-medium">
              <Monitor size={14} className="text-[var(--muted)]" /> Chrome homepage
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
              In Chrome, open Settings → On startup → Open a specific page, then paste this page's URL.
              Your layout will be waiting every time you open a tab.
            </p>
            <button
              onClick={() => {
                navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => onNotify("Page URL copied — paste it into Chrome startup settings."))
                  .catch(() => onNotify("Couldn't copy. Copy the URL from the address bar."));
              }}
              className="btn-ghost mt-2.5 h-8 !text-[11.5px]"
            >
              <Globe size={12.5} /> Copy page URL
            </button>
          </div>

          <button
            onClick={() =>
              onUpdateSettings({
                theme: "dark",
                dim: 0.4,
                blur: 0,
                cardOpacity: 0.56,
                wallpaperId: "emerald",
                customWallpaper: settings.customWallpaper,
              })
            }
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--faint)] transition hover:text-[var(--text)]"
          >
            <RotateCcw size={12} /> Reset appearance
          </button>
        </div>
      ) : null}

      {tab === "github" ? githubPanel : null}

      {tab === "data" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--field)] p-3">
              <p className="text-[20px] font-semibold tabular-nums">{bookmarkCount}</p>
              <p className="text-[10.5px] text-[var(--muted)]">bookmarks saved</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--field)] p-3">
              <p className="text-[20px] font-semibold tabular-nums">{categories.length}</p>
              <p className="text-[10.5px] text-[var(--muted)]">categories</p>
            </div>
          </div>

          <div>
            <span className="label">Backup & restore</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onExport} className="btn-ghost h-9">
                <ArrowDownToLine size={13.5} /> Export
              </button>
              <button onClick={() => importRef.current?.click()} className="btn-ghost h-9">
                <ArrowUpFromLine size={13.5} /> Import
              </button>
            </div>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImport(file);
                event.target.value = "";
              }}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--faint)]">
              Export a JSON file with your spaces, bookmarks, and preferences. Import it on any device.
              Your GitHub token is never included.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--field)] px-3 py-2.5">
              <Cloud size={14} className="shrink-0 text-[var(--accent)]" />
              <p className="flex-1 text-[11px] leading-snug text-[var(--muted)]">
                Keep devices in sync through your own GitHub account.
              </p>
              <button
                onClick={() => onOpenCloud?.()}
                className="shrink-0 rounded-full px-2 py-1 text-[10.5px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
              >
                Set up
              </button>
            </div>
          </div>

          <div className="h-px bg-[var(--border)]" />

          <div className="space-y-2">
            <span className="label">Library</span>
            <button
              onClick={() => {
                onRestoreSamples();
                onNotify("Sample library restored.");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2.5 text-left text-[12.5px] transition hover:bg-[var(--field)]"
            >
              <Sparkles size={14} className="text-[var(--accent)]" />
              <span className="flex-1">Restore sample bookmarks</span>
              <ChevronRight size={14} className="text-[var(--faint)]" />
            </button>
            <button
              onClick={onClearAll}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[#e26a6a]/25 px-3 py-2.5 text-left text-[12.5px] text-[#e88b8b] transition hover:bg-[#e26a6a]/10"
            >
              <Trash2 size={14} className="shrink-0" />
              <span className="flex-1">Delete all bookmarks & categories</span>
            </button>
            <p className="px-1 text-[11px] leading-relaxed text-[var(--faint)]">
              This only clears PersonalB data in this browser. Your wallpaper and theme stay.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--field)] p-3">
            <Database size={14} className="mt-0.5 shrink-0 text-[var(--muted)]" />
            <div>
              <p className="text-[11.5px] font-medium">Stored locally in this browser</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">
                {currentWallpaper ? "Your wallpaper is saved as a local image. " : ""}
                Clearing site data will remove your library, so keep an export if it matters.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 pb-2 text-[10.5px] text-[var(--faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {bookmarkCount} bookmarks across {categories.length} spaces · saved automatically
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

export function HelpModal({
  open,
  onClose,
  onAddBookmark,
  onAddCategory,
  onCopyHomepage,
}: {
  open: boolean;
  onClose: () => void;
  onAddBookmark: () => void;
  onAddCategory: () => void;
  onCopyHomepage: () => void;
}) {
  const shortcuts = [
    { keys: ["⌘", "K"], label: "Search everything" },
    { keys: ["N"], label: "New bookmark" },
    { keys: ["C"], label: "New category" },
    { keys: ["Esc"], label: "Close a dialog" },
  ];

  return (
    <Modal open={open} onClose={onClose} className="max-w-[520px]" labelledBy="help-title">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Sparkles size={18} />
        </div>
        <div>
          <h2 id="help-title" className="text-[17px] font-semibold tracking-[-0.01em]">
            Welcome to PersonalB
          </h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">
            A calm, local-first home for the links you actually use.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {[
          {
            icon: <FolderPlus size={14} />,
            title: "Collect into categories",
            text: "Make spaces for work, reading, or anything else. Add, edit and reorder them any time.",
          },
          {
            icon: <ImageIcon size={14} />,
            title: "Make it feel like yours",
            text: "Choose a wallpaper or upload your own, tune the glass, and pick a mood.",
          },
          {
            icon: <ShieldCheck size={14} />,
            title: "Private by default",
            text: "Everything is saved in this browser with localStorage. No account, no server.",
          },
          {
            icon: <Cloud size={14} />,
            title: "Optional GitHub backup",
            text: "Open the cloud button in the header to keep a private copy in your own gist or repo.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--field)] p-3"
          >
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
              {item.icon}
            </span>
            <div>
              <p className="text-[12px] font-medium">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
          <Keyboard size={12} /> Keyboard shortcuts
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-[var(--muted)]">{shortcut.label}</span>
              <span className="flex items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-[19px] rounded border border-[var(--border)] bg-[var(--field)] px-1 py-0.5 text-center font-sans text-[10px] text-[var(--text-soft)]"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <Globe size={13.5} className="text-[var(--muted)]" />
          <p className="text-[12px] font-medium">Use it as your Chrome homepage</p>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
          Copy this page's URL, then in Chrome go to Settings → On startup → Open a specific page and paste it in.
        </p>
        <button onClick={onCopyHomepage} className="btn-ghost mt-2.5 h-8 !text-[11.5px]">
          <ExternalLink size={12} /> Copy page URL
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <button onClick={onClose} className="btn-ghost">
          Maybe later
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onAddCategory} className="btn-ghost">
            <FolderPlus size={13.5} /> New category
          </button>
          <button
            onClick={() => {
              onAddBookmark();
              onClose();
            }}
            className="btn-primary"
          >
            <Plus size={14} /> Add bookmark
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function EmptyState({
  onAddBookmark,
  onAddCategory,
  onRestore,
}: {
  onAddBookmark: () => void;
  onAddCategory: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="mx-auto mt-6 max-w-xl animate-rise">
      <div className="glass rounded-[24px] px-6 py-12 text-center sm:px-10">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Sparkles size={24} />
        </div>
        <h2 className="font-serif text-[28px] italic leading-tight">A blank, quiet page.</h2>
        <p className="mx-auto mt-2 max-w-[340px] text-[12.5px] leading-relaxed text-[var(--muted)]">
          Create a category for a part of your life, then fill it with the links you keep coming back to.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button onClick={onAddCategory} className="btn-primary">
            <FolderPlus size={14} /> Create a category
          </button>
          <button onClick={onAddBookmark} className="btn-ghost">
            <Plus size={14} /> Add bookmark
          </button>
        </div>
        <button
          onClick={onRestore}
          className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--faint)] transition hover:text-[var(--text)]"
        >
          <RotateCcw size={11} /> or restore the sample library
        </button>
      </div>
    </div>
  );
}

export function FilteredEmpty({ name, onClear }: { name: string; onClear: () => void }) {
  return (
    <div className="mx-auto max-w-3xl animate-rise py-4">
      <div className="glass rounded-[22px] px-6 py-14 text-center">
        <Search size={20} className="mx-auto mb-3 text-[var(--faint)]" />
        <p className="text-[14px] font-medium">No bookmarks in “{name}”</p>
        <p className="mt-1 text-[12px] text-[var(--muted)]">This space is waiting to be filled.</p>
        <button onClick={onClear} className="btn-ghost mt-4 h-9">
          Back to all spaces
        </button>
      </div>
    </div>
  );
}

export function CategoryChips({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--field)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-soft)] transition hover:border-[var(--border-strong)]"
        >
          <CategoryGlyph emoji={category.emoji} accent={category.accent} size={16} />
          {category.name}
        </button>
      ))}
    </div>
  );
}

export function WallpaperStylePreview({ preset }: { preset: WallpaperPreset }) {
  return (
    <span
      className="block h-full w-full"
      style={
        {
          backgroundImage: preset.background,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } as CSSProperties
      }
    />
  );
}
