import { useEffect, useState } from "react";
import { Check, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import type { Bookmark, Category } from "@/types";
import { ACCENTS, BOOKMARK_COLORS } from "@/data/defaults";
import { hostnameOf, isValidUrl, normalizeUrl } from "@/lib/storage";
import type { BookmarkDraft, CategoryDraft } from "@/hooks/useBookmarks";
import { CategoryGlyph, FaviconTile, Modal } from "@/components/ui";
import { cn } from "@/utils/cn";

const EMOJI_CHOICES = ["✧", "💼", "📝", "💬", "🎨", "⌥", "✦", "📚", "◈", "🎬", "🛍", "🌿", "🏡", "🔗", "🎧", "🌙", "🧪", "📌"];

function prettifyHost(raw: string) {
  try {
    const host = new URL(normalizeUrl(raw)).hostname.replace(/^www\./, "");
    const name = host.split(".")[0].replace(/[-_]/g, " ");
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "New bookmark";
  }
}

export function BookmarkModal({
  open,
  onClose,
  onSave,
  categories,
  initial,
  defaultCategoryId,
  initialUrl,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: BookmarkDraft, existingId?: string) => void;
  categories: Category[];
  initial: Bookmark | null;
  defaultCategoryId?: string;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    const seedUrl = initial?.url ?? initialUrl ?? "";
    setTitleTouched(Boolean(initial?.title));
    setUrl(seedUrl);
    setTitle(initial?.title ?? (initialUrl ? prettifyHost(initialUrl) : ""));
    setNote(initial?.note ?? "");
    setColor(initial?.color);
    setCategoryId(defaultCategoryId ?? categories[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultCategoryId, initialUrl]);

  const submit = () => {
    if (!isValidUrl(url)) {
      setError("That doesn't look like a website. Try something like notion.so");
      return;
    }
    const normalized = normalizeUrl(url);
    if (!categoryId) {
      setError("Add a category first, then save your bookmark.");
      return;
    }
    onSave(
      {
        url: normalized,
        title: title.trim() || prettifyHost(normalized),
        note: note.trim() || undefined,
        color,
        categoryId,
      },
      initial?.id,
    );
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="bookmark-modal-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="bookmark-modal-title" className="text-[17px] font-semibold tracking-[-0.01em]">
              {initial ? "Edit bookmark" : "Add a bookmark"}
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {initial ? "Update the details of this link." : "Save something worth coming back to."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--field)] px-2.5 py-1.5">
            <FaviconTile
              url={isValidUrl(url) ? url : ""}
              title={title || "new"}
              color={color}
              size={26}
            />
            <div className="max-w-[130px]">
              <p className="truncate text-[11.5px] font-medium">{title || "Preview"}</p>
              <p className="truncate text-[10px] text-[var(--faint)]">
                {isValidUrl(url) ? hostnameOf(normalizeUrl(url)) : "your new link"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="bm-url">
              Website address
            </label>
            <div className="relative">
              <Link2
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"
              />
              <input
                id="bm-url"
                autoFocus
                className="field pl-8"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setError("");
                  if (!titleTouched) setTitle(prettifyHost(event.target.value));
                }}
                placeholder="notion.so"
                spellCheck={false}
                inputMode="url"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bm-title">
              Name
            </label>
            <input
              id="bm-title"
              className="field"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleTouched(true);
              }}
              placeholder="Give it a short, friendly name"
              maxLength={120}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="bm-category">
                Category
              </label>
              <select
                id="bm-category"
                className="field"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Icon tint</span>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {BOOKMARK_COLORS.slice(0, 8).map((tint) => (
                  <button
                    key={tint}
                    type="button"
                    onClick={() => setColor(tint === color ? undefined : tint)}
                    className={cn(
                      "grid h-[21px] w-[21px] place-items-center rounded-full border transition-transform hover:scale-110",
                      color === tint ? "border-white/70" : "border-transparent",
                    )}
                    style={{ backgroundColor: tint }}
                    aria-label={`Use ${tint} tint`}
                    aria-pressed={color === tint}
                  >
                    {color === tint ? <Check size={11} className="text-[#101a12]" strokeWidth={3} /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bm-note">
              Note <span className="font-normal normal-case tracking-normal text-[var(--faint)]">optional</span>
            </label>
            <input
              id="bm-note"
              className="field"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why did you save this?"
              maxLength={240}
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg bg-[#e26a6a]/10 px-3 py-2 text-[12px] text-[#f0a0a0]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-2">
          {initial ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[12px] font-medium text-[var(--faint)] transition hover:text-[#e88b8b]"
              onClick={() => window.open(initial.url, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink size={13} /> Open link
            </button>
          ) : (
            <span className="text-[11px] text-[var(--faint)]">Saved on this device only</span>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {initial ? "Save changes" : "Add bookmark"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function CategoryModal({
  open,
  onClose,
  onSave,
  initial,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: CategoryDraft) => void;
  initial: Category | null;
  onDelete?: (category: Category) => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✧");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmoji(initial?.emoji ?? "✧");
    setAccent(initial?.accent ?? ACCENTS[0]);
    setDescription(initial?.description ?? "");
    setError("");
  }, [open, initial]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="category-modal-title" className="max-w-[460px]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) {
            setError("Give this category a name first.");
            return;
          }
          onSave({ name: name.trim(), emoji, accent, description });
          onClose();
        }}
      >
        <div className="flex items-center gap-3">
          <CategoryGlyph emoji={emoji} accent={accent} size={42} className="rounded-xl" />
          <div>
            <h2 id="category-modal-title" className="text-[17px] font-semibold tracking-[-0.01em]">
              {initial ? "Edit category" : "New category"}
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {initial ? "Rename or restyle this space." : "A new space for a part of your life."}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="cat-name">
              Name
            </label>
            <input
              id="cat-name"
              autoFocus
              className="field"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="e.g. Weekend projects"
              maxLength={40}
            />
          </div>

          <div>
            <label className="label" htmlFor="cat-desc">
              Short description <span className="font-normal normal-case tracking-normal text-[var(--faint)]">optional</span>
            </label>
            <input
              id="cat-desc"
              className="field"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What belongs in here?"
              maxLength={120}
            />
          </div>

          <div>
            <span className="label">Icon</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                className="field w-[46px] px-0 text-center text-[16px]"
                value={emoji}
                onChange={(event) => setEmoji(event.target.value.slice(0, 4))}
                aria-label="Category emoji"
                maxLength={4}
              />
              <div className="flex flex-1 flex-wrap gap-1">
                {EMOJI_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setEmoji(choice)}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg border text-[13px] transition hover:bg-[var(--field)]",
                      emoji === choice
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-transparent",
                    )}
                    aria-label={`Icon ${choice}`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="label">Accent</span>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map((tint) => (
                <button
                  key={tint}
                  type="button"
                  onClick={() => setAccent(tint)}
                  className={cn(
                    "grid h-[24px] w-[24px] place-items-center rounded-full border transition-transform hover:scale-110",
                    accent === tint ? "border-white/80" : "border-transparent",
                  )}
                  style={{ backgroundColor: tint }}
                  aria-label={`Use accent ${tint}`}
                  aria-pressed={accent === tint}
                >
                  {accent === tint ? <Check size={12} className="text-[#101a12]" strokeWidth={3} /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg bg-[#e26a6a]/10 px-3 py-2 text-[12px] text-[#f0a0a0]">{error}</p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-2">
          {initial && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(initial)}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[12px] font-medium text-[var(--faint)] transition hover:text-[#e88b8b]"
            >
              <Trash2 size={13} /> Delete
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--faint)]">
              <Plus size={12} /> You can add bookmarks after
            </span>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {initial ? "Save changes" : "Create category"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
