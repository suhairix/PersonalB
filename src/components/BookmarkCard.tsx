import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Bookmark, Category } from "@/types";
import { cn } from "@/utils/cn";
import { hostnameOf } from "@/lib/storage";
import { CategoryGlyph, FaviconTile } from "@/components/ui";

type RowHandlers = {
  onOpenBookmark: (bookmark: Bookmark) => void;
  onEditBookmark: (categoryId: string, bookmark: Bookmark) => void;
  onDeleteBookmark: (categoryId: string, bookmark: Bookmark) => void;
};

function BookmarkRow({
  bookmark,
  categoryId,
  large = false,
  ...handlers
}: RowHandlers & { bookmark: Bookmark; categoryId: string; large?: boolean }) {
  const host = hostnameOf(bookmark.url);
  return (
    <div
      className={cn("bookmark-row group/row", large ? "px-2.5 py-2" : "py-1.5")}
      role="link"
      tabIndex={0}
      title={bookmark.url}
      onClick={() => handlers.onOpenBookmark(bookmark)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handlers.onOpenBookmark(bookmark);
        }
      }}
    >
      <FaviconTile
        url={bookmark.url}
        title={bookmark.title}
        color={bookmark.color}
        size={large ? 32 : 27}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium text-[var(--text-soft)] transition-colors group-hover/row:text-[var(--text)]",
            large ? "text-[13.5px]" : "text-[12.5px]",
          )}
        >
          {bookmark.title}
        </p>
        {large ? (
          <p className="mt-0.5 truncate text-[11px] text-[var(--faint)]">
            {bookmark.note || host}
          </p>
        ) : null}
      </div>
      <div className="row-actions flex items-center gap-0.5">
        <button
          onClick={(event) => {
            event.stopPropagation();
            handlers.onEditBookmark(categoryId, bookmark);
          }}
          className="icon-btn h-6 w-6 rounded-md"
          title="Edit bookmark"
          aria-label={`Edit ${bookmark.title}`}
        >
          <Pencil size={11.5} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            handlers.onDeleteBookmark(categoryId, bookmark);
          }}
          className="icon-btn h-6 w-6 rounded-md hover:!text-[#e88b8b]"
          title="Remove bookmark"
          aria-label={`Remove ${bookmark.title}`}
        >
          <Trash2 size={11.5} />
        </button>
      </div>
      <ArrowUpRight
        size={12.5}
        className="shrink-0 text-[var(--faint)] transition-colors group-hover/row:text-[var(--accent)]"
        aria-hidden
      />
    </div>
  );
}

export type CardHandlers = RowHandlers & {
  onAddBookmark: (categoryId: string) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onSortCategory: (categoryId: string) => void;
  onMoveCategory: (categoryId: string, direction: -1 | 1) => void;
};

export function BookmarkCard({
  category,
  index,
  total,
  onAddBookmark,
  onEditCategory,
  onDeleteCategory,
  onSortCategory,
  onMoveCategory,
  ...rowHandlers
}: CardHandlers & { category: Category; index: number; total: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <section
      className="glass card-glow group relative mb-4 break-inside-avoid rounded-[18px] p-2.5 animate-rise transition-[transform,border-color,background-color] hover:z-20"
      style={
        {
          "--cat-accent": category.accent,
          animationDelay: `${Math.min(index, 8) * 45}ms`,
        } as CSSProperties
      }
      aria-labelledby={`cat-${category.id}`}
    >
      <div className="flex items-center gap-2.5 px-1.5 pb-2.5 pt-1">
        <CategoryGlyph emoji={category.emoji} accent={category.accent} size={28} />
        <div className="min-w-0 flex-1">
          <h2
            id={`cat-${category.id}`}
            className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--text)]"
          >
            {category.name}
          </h2>
        </div>
        <span className="text-[10.5px] font-medium tabular-nums text-[var(--faint)]">
          {category.bookmarks.length}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onAddBookmark(category.id)}
            className="icon-btn h-6.5 w-6.5 rounded-md opacity-60 transition-opacity group-hover:opacity-100 max-md:opacity-100"
            title={`Add bookmark to ${category.name}`}
            aria-label={`Add bookmark to ${category.name}`}
          >
            <Plus size={13.5} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="icon-btn h-6.5 w-6.5 rounded-md opacity-0 group-hover:opacity-100 max-md:opacity-100"
              aria-label={`${category.name} options`}
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen ? (
              <div
                className="glass-solid absolute right-0 top-8 z-40 w-[210px] animate-pop-in rounded-xl p-1.5"
                role="menu"
              >
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    onAddBookmark(category.id);
                  }}
                  icon={<Plus size={13} />}
                >
                  Add bookmark
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    onEditCategory(category);
                  }}
                  icon={<Pencil size={13} />}
                >
                  Edit category
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    onSortCategory(category.id);
                  }}
                  icon={<ArrowUpDown size={13} />}
                >
                  Sort A–Z
                </MenuItem>
                <div className="my-1 h-px bg-[var(--border)]" />
                <MenuItem
                  disabled={index === 0}
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveCategory(category.id, -1);
                  }}
                  icon={<ChevronUp size={13} />}
                >
                  Move up
                </MenuItem>
                <MenuItem
                  disabled={index === total - 1}
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveCategory(category.id, 1);
                  }}
                  icon={<ChevronDown size={13} />}
                >
                  Move down
                </MenuItem>
                <div className="my-1 h-px bg-[var(--border)]" />
                <MenuItem
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteCategory(category);
                  }}
                  icon={<Trash2 size={13} />}
                >
                  Delete category
                </MenuItem>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-1.5 h-px w-full bg-[linear-gradient(to_right,color-mix(in_srgb,var(--cat-accent)_40%,transparent),var(--border)_55%,transparent)]" />

      <div className="flex flex-col gap-0.5">
        {category.bookmarks.map((bookmark) => (
          <BookmarkRow
            key={bookmark.id}
            bookmark={bookmark}
            categoryId={category.id}
            {...rowHandlers}
          />
        ))}
      </div>

      {category.bookmarks.length === 0 ? (
        <button
          onClick={() => onAddBookmark(category.id)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-[var(--border-strong)] px-3 py-3.5 text-[11.5px] font-medium text-[var(--faint)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
        >
          <Plus size={12.5} /> Add your first bookmark
        </button>
      ) : (
        <button
          onClick={() => onAddBookmark(category.id)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-transparent py-1.5 text-[11px] font-medium text-transparent transition hover:border-[var(--border-strong)] hover:text-[var(--muted)] group-hover:text-[var(--faint)]"
        >
          <Plus size={11.5} /> Add bookmark
        </button>
      )}
    </section>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition disabled:pointer-events-none disabled:opacity-35",
        danger
          ? "text-[#e88b8b] hover:bg-[#e88b8b]/10"
          : "text-[var(--text-soft)] hover:bg-[var(--field)] hover:text-[var(--text)]",
      )}
    >
      <span className="text-[var(--faint)]">{icon}</span>
      {children}
    </button>
  );
}

export function CategoryView({
  category,
  onBack,
  onAddBookmark,
  onEditCategory,
  onDeleteCategory,
  ...rowHandlers
}: CardHandlers & { category: Category; onBack: () => void }) {
  const hostCount = new Set(category.bookmarks.map((b) => hostnameOf(b.url))).size;

  return (
    <div className="mx-auto w-full max-w-4xl animate-rise">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
      >
        <ArrowLeft size={13.5} /> All spaces
      </button>

      <div
        className="glass card-glow overflow-hidden rounded-[22px] p-4 sm:p-6"
        style={{ "--cat-accent": category.accent } as CSSProperties}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <CategoryGlyph emoji={category.emoji} accent={category.accent} size={48} className="rounded-[14px]" />
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--faint)]">
                Collection
              </p>
              <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[28px]">
                {category.name}
              </h1>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-[var(--muted)]">
                {category.description || "A quiet space for the links you want close."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => onEditCategory(category)} className="btn-ghost h-9">
              <Pencil size={13.5} /> Edit
            </button>
            <button onClick={() => onAddBookmark(category.id)} className="btn-primary h-9">
              <Plus size={14} strokeWidth={2.5} /> Add bookmark
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--border)] bg-[var(--field)] px-2.5 py-1 text-[11px] text-[var(--text-soft)]">
            {category.bookmarks.length} {category.bookmarks.length === 1 ? "bookmark" : "bookmarks"}
          </span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--field)] px-2.5 py-1 text-[11px] text-[var(--text-soft)]">
            {hostCount} {hostCount === 1 ? "site" : "sites"}
          </span>
          <button
            onClick={() => onDeleteCategory(category)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium text-[var(--faint)] transition hover:bg-[#e88b8b]/10 hover:text-[#e88b8b]"
          >
            <Trash2 size={12} /> Delete space
          </button>
        </div>

        <div className="my-4 h-px w-full bg-[var(--border)]" />

        {category.bookmarks.length ? (
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {category.bookmarks.map((bookmark) => (
              <BookmarkRow
                key={bookmark.id}
                bookmark={bookmark}
                categoryId={category.id}
                large
                {...rowHandlers}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] px-6 py-14 text-center">
            <Sparkles size={20} className="mb-3 text-[var(--faint)]" />
            <p className="text-[13.5px] font-medium text-[var(--text-soft)]">This space is empty</p>
            <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-[var(--muted)]">
              Start with the site you open every morning.
            </p>
            <button onClick={() => onAddBookmark(category.id)} className="btn-primary mt-4 h-9">
              <Plus size={14} /> Add bookmark
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
