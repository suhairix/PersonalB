import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, Bookmark, Category, Settings } from "@/types";
import { createDefaultData, uid, ACCENTS } from "@/data/defaults";
import { loadData, normalizeData, saveData } from "@/lib/storage";

export type CategoryDraft = {
  name: string;
  emoji: string;
  accent: string;
  description?: string;
};

export type BookmarkDraft = {
  title: string;
  url: string;
  note?: string;
  color?: string;
  categoryId: string;
};

type Options = { onError?: (message: string) => void };

export function useBookmarks({ onError }: Options = {}) {
  const [data, setData] = useState<AppData>(() => loadData());
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const result = saveData(data);
    if (result.ok) {
      setLastSavedAt(Date.now());
    } else if (result.error) {
      onErrorRef.current?.(result.error);
    }
  }, [data]);

  const update = useCallback((updater: (current: AppData) => AppData) => {
    setData((current) => ({ ...updater(current), updatedAt: Date.now() }));
  }, []);

  /** Replace local data with a cloud copy without marking it as a new local edit. */
  const applyRemote = useCallback((next: AppData) => {
    setData(next);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      update((current) => ({
        ...current,
        settings: { ...current.settings, ...patch },
      }));
    },
    [update],
  );

  const addCategory = useCallback(
    (draft: CategoryDraft): string => {
      const id = uid("cat");
      const category: Category = {
        id,
        name: draft.name.trim().slice(0, 40) || "Untitled space",
        emoji: draft.emoji || "✧",
        accent: draft.accent || ACCENTS[0],
        description: draft.description?.trim().slice(0, 120) || undefined,
        bookmarks: [],
      };
      update((current) => ({ ...current, categories: [...current.categories, category] }));
      return id;
    },
    [update],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<CategoryDraft>) => {
      update((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === id
            ? {
                ...category,
                name: patch.name !== undefined ? patch.name.trim().slice(0, 40) || category.name : category.name,
                emoji: patch.emoji !== undefined ? patch.emoji || category.emoji : category.emoji,
                accent: patch.accent ?? category.accent,
                description:
                  patch.description !== undefined
                    ? patch.description.trim().slice(0, 120) || undefined
                    : category.description,
              }
            : category,
        ),
      }));
    },
    [update],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        categories: current.categories.filter((category) => category.id !== id),
      }));
    },
    [update],
  );

  const moveCategory = useCallback(
    (id: string, direction: -1 | 1) => {
      update((current) => {
        const index = current.categories.findIndex((category) => category.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.categories.length) return current;
        const categories = [...current.categories];
        const [moved] = categories.splice(index, 1);
        categories.splice(target, 0, moved);
        return { ...current, categories };
      });
    },
    [update],
  );

  const upsertBookmark = useCallback(
    (draft: BookmarkDraft, existingId?: string) => {
      update((current) => {
        const now = Date.now();
        const clean: Bookmark = {
          id: existingId ?? uid("bm"),
          title: draft.title.trim().slice(0, 120) || draft.url,
          url: draft.url,
          note: draft.note?.trim().slice(0, 240) || undefined,
          color: draft.color,
          createdAt: now,
        };

        let found = false;
        const stripped = current.categories.map((category) => {
          const match = category.bookmarks.find((b) => b.id === existingId);
          if (match) found = true;
          return {
            ...category,
            bookmarks: category.bookmarks.filter((b) => b.id !== existingId),
          };
        });

        if (!existingId || !found) {
          clean.createdAt = now;
        } else {
          for (const category of current.categories) {
            const match = category.bookmarks.find((b) => b.id === existingId);
            if (match) {
              clean.createdAt = match.createdAt ?? now;
              if (!draft.color) clean.color = match.color;
            }
          }
        }

        const destination = stripped.some((c) => c.id === draft.categoryId)
          ? draft.categoryId
          : stripped[0]?.id;
        if (!destination) return current;

        return {
          ...current,
          categories: stripped.map((category) =>
            category.id === destination
              ? { ...category, bookmarks: [...category.bookmarks, clean] }
              : category,
          ),
        };
      });
    },
    [update],
  );

  const deleteBookmark = useCallback(
    (categoryId: string, bookmarkId: string) => {
      update((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? { ...category, bookmarks: category.bookmarks.filter((b) => b.id !== bookmarkId) }
            : category,
        ),
      }));
    },
    [update],
  );

  const restoreBookmark = useCallback(
    (categoryId: string, bookmark: Bookmark, index: number) => {
      update((current) => ({
        ...current,
        categories: current.categories.map((category) => {
          if (category.id !== categoryId) return category;
          if (category.bookmarks.some((b) => b.id === bookmark.id)) return category;
          const bookmarks = [...category.bookmarks];
          bookmarks.splice(Math.max(0, Math.min(index, bookmarks.length)), 0, bookmark);
          return { ...category, bookmarks };
        }),
      }));
    },
    [update],
  );

  const sortCategory = useCallback(
    (categoryId: string) => {
      update((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                bookmarks: [...category.bookmarks].sort((a, b) =>
                  a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
                ),
              }
            : category,
        ),
      }));
    },
    [update],
  );

  const importData = useCallback(
    (incoming: unknown): boolean => {
      const normalized = normalizeData(incoming);
      if (!normalized) return false;
      setData({ ...normalized, updatedAt: Date.now() });
      return true;
    },
    [],
  );

  const restoreSamples = useCallback(() => {
    setData((current) => ({
      ...createDefaultData(),
      settings: current.settings,
      updatedAt: Date.now(),
    }));
  }, []);

  const clearAll = useCallback(() => {
    update((current) => ({ ...current, categories: [] }));
  }, [update]);

  return {
    data,
    categories: data.categories,
    settings: data.settings,
    lastSavedAt,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    upsertBookmark,
    deleteBookmark,
    restoreBookmark,
    sortCategory,
    updateSettings,
    importData,
    applyRemote,
    restoreSamples,
    clearAll,
  };
}
