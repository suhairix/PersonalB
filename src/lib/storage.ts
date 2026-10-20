import type { AppData, Bookmark, Category, Settings } from "@/types";
import { BOOKMARK_COLORS, DEFAULT_SETTINGS, WALLPAPERS, createDefaultData } from "@/data/defaults";

const LEGACY_STORAGE_KEY = "lumilist.data.v1";
export const STORAGE_KEY = "PersonalB.data.v1";

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw);
    return normalizeData(parsed) ?? createDefaultData();
  } catch {
    return createDefaultData();
  }
}

export function saveData(data: AppData): { ok: boolean; error?: string } {
  try {
    const payload = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, payload);
    localStorage.setItem(LEGACY_STORAGE_KEY, payload);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Couldn't save locally — storage is full. Try a smaller wallpaper.",
    };
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function normalizeData(input: unknown): AppData | null {
  if (!isObj(input) || !Array.isArray(input.categories)) return null;

  const seen = new Set<string>();
  const categories: Category[] = [];

  for (const rawCat of input.categories) {
    if (!isObj(rawCat) || typeof rawCat.name !== "string") continue;
    const cid =
      typeof rawCat.id === "string" && rawCat.id && !seen.has(rawCat.id)
        ? rawCat.id
        : `cat_${Math.random().toString(36).slice(2, 9)}`;
    seen.add(cid);

    const bookmarks: Bookmark[] = [];
    const rawBookmarks = Array.isArray(rawCat.bookmarks) ? rawCat.bookmarks : [];
    for (const rawBm of rawBookmarks) {
      if (!isObj(rawBm)) continue;
      const url = typeof rawBm.url === "string" ? rawBm.url : "";
      if (!url) continue;
      bookmarks.push({
        id:
          typeof rawBm.id === "string" && rawBm.id
            ? rawBm.id
            : `bm_${Math.random().toString(36).slice(2, 9)}`,
        title:
          typeof rawBm.title === "string" && rawBm.title.trim()
            ? rawBm.title.trim().slice(0, 120)
            : hostnameOf(url),
        url,
        note: typeof rawBm.note === "string" ? rawBm.note.slice(0, 240) : undefined,
        color: typeof rawBm.color === "string" ? rawBm.color : undefined,
        createdAt: typeof rawBm.createdAt === "number" ? rawBm.createdAt : Date.now(),
      });
    }

    categories.push({
      id: cid,
      name: rawCat.name.trim().slice(0, 40) || "Untitled",
      emoji: typeof rawCat.emoji === "string" && rawCat.emoji ? rawCat.emoji.slice(0, 4) : "✧",
      accent:
        typeof rawCat.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(rawCat.accent)
          ? rawCat.accent
          : "#cdf27a",
      description:
        typeof rawCat.description === "string" ? rawCat.description.slice(0, 120) : undefined,
      bookmarks,
    });
  }

  if (!categories.length && !Array.isArray(input.categories)) return null;

  const rawSettings = isObj(input.settings) ? input.settings : {};
  const settings: Settings = {
    theme: rawSettings.theme === "light" ? "light" : "dark",
    wallpaperId:
      typeof rawSettings.wallpaperId === "string"
        ? rawSettings.wallpaperId
        : DEFAULT_SETTINGS.wallpaperId,
    customWallpaper:
      typeof rawSettings.customWallpaper === "string" ? rawSettings.customWallpaper : null,
    dim: clampNumber(rawSettings.dim, 0, 0.85, DEFAULT_SETTINGS.dim),
    blur: clampNumber(rawSettings.blur, 0, 18, DEFAULT_SETTINGS.blur),
    cardOpacity: clampNumber(rawSettings.cardOpacity, 0.18, 0.92, DEFAULT_SETTINGS.cardOpacity),
  };

  if (!WALLPAPERS.some((w) => w.id === settings.wallpaperId) && settings.wallpaperId !== "custom") {
    settings.wallpaperId = DEFAULT_SETTINGS.wallpaperId;
  }

  return {
    version: 1,
    categories,
    settings,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : Date.now(),
  };
}

function clampNumber(v: unknown, min: number, max: number, fallback: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || url;
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidUrl(input: string): boolean {
  try {
    const u = new URL(normalizeUrl(input));
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname.includes(".");
  } catch {
    return false;
  }
}

export function faviconFor(url: string, size = 64): string {
  const host = hostnameOf(url);
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${encodeURIComponent(host)}`;
}

export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return BOOKMARK_COLORS[hash % BOOKMARK_COLORS.length];
}

export function initialsOf(title: string): string {
  return (
    title
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "•"
  );
}

export async function compressWallpaper(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 25 * 1024 * 1024) throw new Error("That image is too large. Choose one under 25 MB.");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't open that image."));
    image.src = dataUrl;
  });

  const maxW = 1920;
  const maxH = 1280;
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/jpeg", 0.78);
  if (compressed.length > 2_600_000) {
    throw new Error("That wallpaper is still too large. Try a smaller image.");
  }
  return compressed;
}

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
