export type Bookmark = {
  id: string;
  title: string;
  url: string;
  color?: string;
  note?: string;
  createdAt?: number;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  description?: string;
  bookmarks: Bookmark[];
};

export type ThemeMode = "dark" | "light";

export type Settings = {
  theme: ThemeMode;
  wallpaperId: string;
  customWallpaper: string | null;
  dim: number;
  blur: number;
  cardOpacity: number;
};

export type AppData = {
  version: 1;
  categories: Category[];
  settings: Settings;
  /** Local modification time, used to detect newer cloud copies. */
  updatedAt?: number;
};

export type WallpaperPreset = {
  id: string;
  name: string;
  /** CSS background-image value */
  background: string;
  /** small preview color used while images load */
  base: string;
  kind: "image" | "gradient";
};

export type ItemRef = { categoryId: string; bookmark: Bookmark };
