import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CircleHelp,
  Database,
  FolderPlus,
  Image as ImageIcon,
  Palette,
  Plus,
  Search,
  Sun,
  Moon,
  X,
} from "lucide-react";
import type { Bookmark, Category, WallpaperPreset } from "@/types";
import { WALLPAPERS } from "@/data/defaults";
import {
  compressWallpaper,
  formatClock,
  formatDate,
  greetingFor,
  normalizeData,
} from "@/lib/storage";
import { useBookmarks, type BookmarkDraft, type CategoryDraft } from "@/hooks/useBookmarks";
import { useGitHubSync } from "@/hooks/useGitHubSync";
import { GitHubPanel, SyncStatusButton } from "@/components/GitHubPanel";
import type { SettingsTab } from "@/components/Overlays";
import { Header } from "@/components/Header";
import { BookmarkCard, CategoryView, type CardHandlers } from "@/components/BookmarkCard";
import { BookmarkModal, CategoryModal } from "@/components/BookmarkModals";
import { EmptyState, HelpModal, SearchPalette, SettingsSheet } from "@/components/Overlays";
import { ConfirmDialog, Tooltip } from "@/components/ui";

type Toast = {
  id: number;
  message: string;
  tone: "success" | "info" | "error";
  action?: { label: string; onClick: () => void };
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

type BookmarkModalState = {
  open: boolean;
  initial: Bookmark | null;
  categoryId?: string;
  prefillUrl?: string;
};

type CategoryModalState = { open: boolean; initial: Category | null };

const initialBookmarkModal: BookmarkModalState = { open: false, initial: null };
const initialCategoryModal: CategoryModalState = { open: false, initial: null };

export default function App() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const notify = useCallback(
    (message: string, options?: { tone?: Toast["tone"]; action?: Toast["action"] }) => {
      const id = ++toastId.current;
      setToasts((current) => [
        ...current.slice(-2),
        { id, message, tone: options?.tone ?? "success", action: options?.action },
      ]);
      window.setTimeout(
        () => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        },
        options?.action ? 6500 : 3600,
      );
    },
    [],
  );

  const store = useBookmarks({ onError: (message) => notify(message, { tone: "error" }) });
  const { categories, settings } = store;

  const syncNotify = useCallback(
    (message: string, tone?: "success" | "info" | "error") => notify(message, { tone }),
    [notify],
  );

  const sync = useGitHubSync({
    data: store.data,
    onApplyRemote: store.applyRemote,
    onNotify: syncNotify,
  });

  const [activeCategory, setActiveCategory] = useState("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("wallpaper");
  const [helpOpen, setHelpOpen] = useState(false);
  const [bookmarkModal, setBookmarkModal] = useState<BookmarkModalState>(initialBookmarkModal);
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(initialCategoryModal);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty("--card-alpha", settings.cardOpacity.toFixed(2));
    root.style.setProperty("--dim", settings.dim.toFixed(2));
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", settings.theme === "dark" ? "#0a100d" : "#e9efe5");
  }, [settings.theme, settings.cardOpacity, settings.dim]);

  useEffect(() => {
    if (activeCategory !== "home" && !categories.some((category) => category.id === activeCategory)) {
      setActiveCategory("home");
    }
  }, [activeCategory, categories]);

  const activeCategoryData = categories.find((category) => category.id === activeCategory) ?? null;
  const totalBookmarks = useMemo(
    () => categories.reduce((sum, category) => sum + category.bookmarks.length, 0),
    [categories],
  );

  const openSettings = useCallback((tab: SettingsTab = "wallpaper") => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  }, []);

  const openCloudSettings = useCallback(() => openSettings("github"), [openSettings]);

  const selectCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openBookmark = useCallback(
    (bookmark: Bookmark) => {
      try {
        window.open(bookmark.url, "_blank", "noopener,noreferrer");
      } catch {
        notify("That link couldn't be opened. Check the URL.", { tone: "error" });
      }
    },
    [notify],
  );

  const openAddBookmark = useCallback(
    (categoryId?: string, prefillUrl?: string) => {
      if (!categories.length) {
        setCategoryModal({ open: true, initial: null });
        notify("Create a category first — bookmarks live inside spaces.", { tone: "info" });
        return;
      }
      const suggested =
        categoryId ?? (activeCategory !== "home" ? activeCategory : categories[0]?.id);
      setSearchOpen(false);
      setBookmarkModal({ open: true, initial: null, categoryId: suggested, prefillUrl });
    },
    [activeCategory, categories, notify],
  );

  const openEditBookmark = useCallback((categoryId: string, bookmark: Bookmark) => {
    setSearchOpen(false);
    setBookmarkModal({ open: true, initial: bookmark, categoryId });
  }, []);

  const handleSaveBookmark = useCallback(
    (draft: BookmarkDraft, existingId?: string) => {
      store.upsertBookmark(draft, existingId);
      const destination = categories.find((category) => category.id === draft.categoryId);
      notify(
        existingId
          ? `Updated “${draft.title}”.`
          : `Saved “${draft.title}” to ${destination?.name ?? "your library"}.`,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, notify, store.upsertBookmark],
  );

  const handleDeleteBookmark = useCallback(
    (categoryId: string, bookmark: Bookmark) => {
      const category = categories.find((item) => item.id === categoryId);
      const index = category?.bookmarks.findIndex((item) => item.id === bookmark.id) ?? 0;
      store.deleteBookmark(categoryId, bookmark.id);
      notify(`Removed “${bookmark.title}”.`, {
        tone: "info",
        action: {
          label: "Undo",
          onClick: () => {
            store.restoreBookmark(categoryId, bookmark, index);
            notify(`Restored “${bookmark.title}”.`);
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, notify, store.deleteBookmark, store.restoreBookmark],
  );

  const requestDeleteCategory = useCallback(
    (category: Category) => {
      setConfirmState({
        title: `Delete “${category.name}”?`,
        message: `${category.bookmarks.length} ${
          category.bookmarks.length === 1 ? "bookmark" : "bookmarks"
        } inside this space will be removed from this browser. This can't be undone.`,
        confirmLabel: "Delete space",
        onConfirm: () => {
          store.deleteCategory(category.id);
          if (activeCategory === category.id) setActiveCategory("home");
          notify(`“${category.name}” deleted.`, { tone: "info" });
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCategory, notify, store.deleteCategory],
  );

  const requestClearAll = useCallback(() => {
    setConfirmState({
      title: "Delete your whole library?",
      message: `${totalBookmarks} bookmarks across ${categories.length} spaces will be removed. ${
        sync.connected
          ? "GitHub sync will update your cloud copy to match, so this deletes the backup too. "
          : ""
      }Your wallpaper and theme stay, but the links can't be recovered.`,
      confirmLabel: "Delete library",
      onConfirm: () => {
        store.clearAll();
        setActiveCategory("home");
        notify("Library cleared. A fresh page awaits.", { tone: "info" });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, totalBookmarks, notify, store.clearAll]);

  const handleSaveCategory = useCallback(
    (draft: CategoryDraft) => {
      if (categoryModal.initial) {
        store.updateCategory(categoryModal.initial.id, draft);
        notify(`“${draft.name}” updated.`);
      } else {
        const id = store.addCategory(draft);
        setActiveCategory(id);
        notify(`Created “${draft.name}”. Add your first bookmark.`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryModal.initial, notify, store.addCategory, store.updateCategory],
  );

  const handleExport = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `PersonalB-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Backup exported. Keep it somewhere safe.");
    } catch {
      notify("Couldn't create the backup file.", { tone: "error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify, store.data]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const normalized = normalizeData(parsed);
        if (!normalized) {
          notify("That file doesn't look like a PersonalB backup.", { tone: "error" });
          return;
        }
        const bookmarkTotal = normalized.categories.reduce(
          (sum, category) => sum + category.bookmarks.length,
          0,
        );
        setConfirmState({
          title: "Replace your library?",
          message: `This backup has ${bookmarkTotal} bookmarks in ${normalized.categories.length} spaces. Importing will replace everything currently saved in this browser.`,
          confirmLabel: "Import backup",
          onConfirm: () => {
            store.importData(normalized);
            setActiveCategory("home");
            notify(`Imported ${bookmarkTotal} bookmarks.`);
          },
        });
      } catch {
        notify("Couldn't read that file. Choose a JSON export from PersonalB.", { tone: "error" });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, store.importData],
  );

  const handleUploadWallpaper = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await compressWallpaper(file);
        store.updateSettings({ customWallpaper: dataUrl, wallpaperId: "custom" });
        notify("Your own wallpaper is in place.");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Couldn't use that image.", {
          tone: "error",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, store.updateSettings],
  );

  const handleApplyWallpaperUrl = useCallback(
    (url: string) => {
      if (!/^(https?:\/\/|data:image\/)/i.test(url)) {
        notify("Use a full image URL starting with https://", { tone: "error" });
        return;
      }
      store.updateSettings({ customWallpaper: url, wallpaperId: "custom" });
      notify("Wallpaper updated from URL.");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, store.updateSettings],
  );

  const handleSelectPreset = useCallback(
    (preset: WallpaperPreset) => {
      const light = preset.id === "sage" || preset.id === "dawn";
      store.updateSettings({
        wallpaperId: preset.id,
        ...(light ? { theme: "light" as const } : {}),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.updateSettings],
  );

  const copyHomepageUrl = useCallback(() => {
    if (!navigator.clipboard) {
      notify("Copy the URL from your address bar instead.", { tone: "info" });
      return;
    }
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => notify("Page URL copied — paste it into Chrome's startup settings."))
      .catch(() => notify("Couldn't copy. Copy the URL from the address bar.", { tone: "error" }));
  }, [notify]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
        return;
      }
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
      if (typing) return;
      const anyOpen =
        searchOpen ||
        settingsOpen ||
        helpOpen ||
        bookmarkModal.open ||
        categoryModal.open ||
        Boolean(confirmState);
      if (event.key === "/" && !anyOpen) {
        event.preventDefault();
        setSearchOpen(true);
      } else if ((event.key === "n" || event.key === "N") && !anyOpen) {
        event.preventDefault();
        openAddBookmark();
      } else if ((event.key === "c" || event.key === "C") && !anyOpen) {
        event.preventDefault();
        setCategoryModal({ open: true, initial: null });
      } else if (event.key === "?" && !anyOpen) {
        event.preventDefault();
        setHelpOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    searchOpen,
    settingsOpen,
    helpOpen,
    bookmarkModal.open,
    categoryModal.open,
    confirmState,
    openAddBookmark,
  ]);

  const preset = WALLPAPERS.find((item) => item.id === settings.wallpaperId) ?? WALLPAPERS[0];
  const customWallpaper =
    settings.wallpaperId === "custom" && settings.customWallpaper ? settings.customWallpaper : null;
  const wallpaperImage = customWallpaper
    ? `url("${customWallpaper.replace(/"/g, "%22")}")`
    : preset.background;

  const cardHandlers: CardHandlers = {
    onOpenBookmark: openBookmark,
    onAddBookmark: (categoryId) => openAddBookmark(categoryId),
    onEditBookmark: openEditBookmark,
    onDeleteBookmark: handleDeleteBookmark,
    onEditCategory: (category) => setCategoryModal({ open: true, initial: category }),
    onDeleteCategory: requestDeleteCategory,
    onSortCategory: (categoryId) => {
      store.sortCategory(categoryId);
      const category = categories.find((item) => item.id === categoryId);
      notify(`“${category?.name ?? "Category"}” sorted A–Z.`);
    },
    onMoveCategory: (categoryId, direction) => store.moveCategory(categoryId, direction),
  };

  return (
    <div className="grain relative min-h-screen text-[var(--text)]">
      <div
        className="wallpaper-layer"
        style={{
          backgroundImage: wallpaperImage,
          backgroundColor: preset.base,
          filter: settings.blur ? `blur(${settings.blur}px)` : undefined,
          transform: settings.blur ? "scale(1.05)" : undefined,
        }}
        aria-hidden
      />
      <div className="wallpaper-dim" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            settings.theme === "dark"
              ? "radial-gradient(120% 90% at 50% -10%, transparent 25%, rgba(3,8,5,.42) 100%)"
              : "radial-gradient(120% 90% at 50% -10%, transparent 25%, rgba(225,235,222,.5) 100%)",
        }}
        aria-hidden
      />

      <Header
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={selectCategory}
        onAddCategory={() => setCategoryModal({ open: true, initial: null })}
        onSearch={() => setSearchOpen(true)}
        onAddBookmark={() => openAddBookmark()}
        theme={settings.theme}
        onToggleTheme={() =>
          store.updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
        }
        syncStatus={sync.status}
        onOpenCloud={openCloudSettings}
      />

      <main className="relative z-10 mx-auto w-full max-w-[1560px] px-3 pb-28 pt-1 sm:px-5 lg:pr-[82px]">
        {activeCategory === "home" && categories.length ? (
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1 pt-3 sm:mb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--faint)]">
                <span>{formatDate(now)}</span>
                <span className="h-[3px] w-[3px] rounded-full bg-[var(--faint)]" />
                <span className="tabular-nums normal-case tracking-normal">{formatClock(now)}</span>
                <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--field)] px-2 py-0.5 normal-case tracking-normal text-[var(--muted)] sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  Saved on this device
                </span>
              </div>
              <h1 className="mt-2 font-serif text-[27px] italic leading-none tracking-[-0.01em] text-[var(--text)] sm:text-[32px]">
                {greetingFor(now)}.
              </h1>
              <p className="mt-1.5 text-[12px] text-[var(--muted)]">
                {totalBookmarks} bookmarks across {categories.length} spaces — exactly where you left
                them.
              </p>
            </div>
            <button
              onClick={() => openSettings("wallpaper")}
              className="btn-ghost h-9 !bg-transparent !px-3 backdrop-blur-md"
            >
              <Palette size={14} /> Customize
            </button>
          </div>
        ) : null}

        {!categories.length ? (
          <EmptyState
            onAddBookmark={() => openAddBookmark()}
            onAddCategory={() => setCategoryModal({ open: true, initial: null })}
            onRestore={() => {
              store.restoreSamples();
              notify("Sample library restored.");
            }}
          />
        ) : activeCategoryData ? (
          <CategoryView
            category={activeCategoryData}
            onBack={() => selectCategory("home")}
            {...cardHandlers}
          />
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {categories.map((category, index) => (
              <BookmarkCard
                key={category.id}
                category={category}
                index={index}
                total={categories.length}
                {...cardHandlers}
              />
            ))}
          </div>
        )}

        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-1 pt-4 text-[10.5px] text-[var(--faint)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            
          </span>
          <span className="hidden items-center gap-2 sm:inline-flex">
            <span>Press</span>
            <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-sans">⌘K</kbd>
            <span>to search everything</span>
          </span>
        </footer>
      </main>

      <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <div className="glass flex flex-col items-center gap-0.5 rounded-[16px] p-1.5">
          <Tooltip label="Search · ⌘K">
            <button onClick={() => setSearchOpen(true)} className="rail-btn" aria-label="Search">
              <Search size={16} />
            </button>
          </Tooltip>
          <Tooltip label="Add bookmark">
            <button onClick={() => openAddBookmark()} className="rail-btn" aria-label="Add bookmark">
              <Plus size={17} />
            </button>
          </Tooltip>
          <Tooltip label="Add category">
            <button
              onClick={() => setCategoryModal({ open: true, initial: null })}
              className="rail-btn"
              aria-label="Add category"
            >
              <FolderPlus size={16} />
            </button>
          </Tooltip>
          <span className="my-0.5 h-px w-5 bg-[var(--border)]" />
          <Tooltip label="Wallpaper & style">
            <button
              onClick={() => openSettings("wallpaper")}
              className="rail-btn"
              aria-label="Personalize"
            >
              <ImageIcon size={16} />
            </button>
          </Tooltip>
          <Tooltip label="Import & export">
            <button
              onClick={() => openSettings("data")}
              className="rail-btn"
              aria-label="Data and backups"
            >
              <Database size={16} />
            </button>
          </Tooltip>
          <Tooltip label="Help & shortcuts">
            <button onClick={() => setHelpOpen(true)} className="rail-btn" aria-label="Help">
              <CircleHelp size={16} />
            </button>
          </Tooltip>
          <span className="my-0.5 h-px w-5 bg-[var(--border)]" />
          <Tooltip label={settings.theme === "dark" ? "Daylight mode" : "Evening mode"}>
            <button
              onClick={() =>
                store.updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
              }
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_4px_14px_-6px_var(--accent)] transition hover:brightness-105"
              aria-label="Toggle theme"
            >
              {settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 lg:hidden">
        <SyncStatusButton status={sync.status} onClick={openCloudSettings} />
        <button
          onClick={() => setHelpOpen(true)}
          className="glass grid h-10 w-10 place-items-center rounded-full text-[var(--muted)]"
          aria-label="Help"
        >
          <CircleHelp size={17} />
        </button>
        <button
          onClick={() => openSettings("wallpaper")}
          className="glass grid h-10 w-10 place-items-center rounded-full text-[var(--muted)]"
          aria-label="Personalize"
        >
          <Palette size={17} />
        </button>
        <button
          onClick={() => openAddBookmark()}
          className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_30px_-10px_var(--accent)]"
          aria-label="Add bookmark"
        >
          <Plus size={19} strokeWidth={2.4} />
        </button>
      </div>

      <div className="fixed bottom-4 left-4 z-30 hidden items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--field)] px-3 py-1.5 text-[10.5px] text-[var(--muted)] backdrop-blur-md lg:flex">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-[var(--border)] px-1 font-sans text-[9.5px]">⌘K</kbd>
          search
        </span>
        <span className="h-3 w-px bg-[var(--border)]" />
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-[var(--border)] px-1 font-sans text-[9.5px]">N</kbd>
          new
        </span>
        <span className="h-3 w-px bg-[var(--border)]" />
        <button
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-1 transition hover:text-[var(--text)]"
        >
          <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-[var(--accent)] text-[var(--accent-ink)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M19.5 4.5c0 8.2-5.1 13-11.3 13-1.6 0-2.7-.9-2.7-2.4C5.5 8.9 10.6 4.5 19.5 4.5Z"
                fill="currentColor"
              />
              <path
                d="M5.5 20.5c1.6-5 4.9-8.8 9.4-11.3"
                stroke="var(--accent)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          PersonalB {new Date().getFullYear()}
        </button>
      </div>

      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        categories={categories}
        onOpenBookmark={openBookmark}
        onSelectCategory={(id) => {
          setActiveCategory(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onAddBookmark={(query) => openAddBookmark(undefined, query)}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        categories={categories}
        wallpapers={WALLPAPERS}
        onUpdateSettings={store.updateSettings}
        onSelectPreset={handleSelectPreset}
        onUploadWallpaper={handleUploadWallpaper}
        onRemoveCustomWallpaper={() => {
          store.updateSettings({ customWallpaper: null, wallpaperId: "emerald", theme: "dark" });
          notify("Back to Emerald silk.", { tone: "info" });
        }}
        onApplyWallpaperUrl={handleApplyWallpaperUrl}
        onExport={handleExport}
        onImport={handleImport}
        onRestoreSamples={store.restoreSamples}
        onClearAll={requestClearAll}
        onNotify={notify}
        defaultTab={settingsTab}
        onOpenCloud={openCloudSettings}
        githubPanel={<GitHubPanel sync={sync} bookmarkTotal={totalBookmarks} />}
      />

      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onAddBookmark={() => openAddBookmark()}
        onAddCategory={() => setCategoryModal({ open: true, initial: null })}
        onCopyHomepage={copyHomepageUrl}
      />

      <BookmarkModal
        key={`${bookmarkModal.initial?.id ?? "new"}-${bookmarkModal.categoryId ?? ""}-${bookmarkModal.prefillUrl ?? ""}`}
        open={bookmarkModal.open}
        onClose={() => setBookmarkModal(initialBookmarkModal)}
        onSave={handleSaveBookmark}
        categories={categories}
        initial={bookmarkModal.initial}
        defaultCategoryId={bookmarkModal.categoryId}
        initialUrl={bookmarkModal.prefillUrl}
      />

      <CategoryModal
        open={categoryModal.open}
        onClose={() => setCategoryModal(initialCategoryModal)}
        onSave={handleSaveCategory}
        initial={categoryModal.initial}
        onDelete={(category) => {
          setCategoryModal(initialCategoryModal);
          requestDeleteCategory(category);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
      />

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full animate-toast items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3.5 py-2.5 shadow-[0_16px_42px_-16px_rgba(0,0,0,.65)] backdrop-blur-xl"
          >
            <span
              className={
                toast.tone === "error"
                  ? "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e26a6a]/15 text-[#e88b8b]"
                  : toast.tone === "info"
                    ? "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--field)] text-[var(--muted)]"
                    : "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"
              }
            >
              {toast.tone === "error" ? (
                <AlertCircle size={12} />
              ) : (
                <Check size={12} strokeWidth={3} />
              )}
            </span>
            <p className="flex-1 text-[12px] font-medium leading-snug text-[var(--text-soft)]">
              {toast.message}
            </p>
            {toast.action ? (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  setToasts((current) => current.filter((item) => item.id !== toast.id));
                }}
                className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="icon-btn h-5 w-5 shrink-0 rounded-full"
              aria-label="Dismiss notification"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
