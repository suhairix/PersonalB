import type { AppData, Bookmark, Category, WallpaperPreset } from "@/types";

export const ACCENTS = [
  "#cdf27a",
  "#9fe8d0",
  "#9fd8f5",
  "#c3b6ff",
  "#f4a8c8",
  "#f7c48b",
  "#e6e08f",
  "#a8f0b4",
  "#f2a69a",
  "#b9c7f5",
];

export const BOOKMARK_COLORS = [
  "#e8798a",
  "#f0a35e",
  "#e9d26b",
  "#95cf7c",
  "#6fd3be",
  "#74b9e8",
  "#9c9cf0",
  "#d59def",
  "#a3a9b8",
  "#ece8dd",
];

export const WALLPAPERS: WallpaperPreset[] = [
  {
    id: "emerald",
    name: "Emerald silk",
    kind: "image",
    base: "#0a1410",
    // Relative on purpose: works at a domain root, a sub-path (GitHub Pages) and Vercel.
    background: "url('wallpapers/emerald.jpg')",
  },
  {
    id: "sage",
    name: "Sage linen",
    kind: "image",
    base: "#dfe7d7",
    background: "url('wallpapers/sage.jpg')",
  },
  {
    id: "midnight",
    name: "Midnight pine",
    kind: "gradient",
    base: "#081210",
    background:
      "radial-gradient(120% 90% at 12% 8%, rgba(64,116,94,.55), transparent 58%), radial-gradient(90% 70% at 88% 16%, rgba(29,82,96,.5), transparent 62%), radial-gradient(110% 90% at 50% 110%, rgba(96,130,66,.32), transparent 60%), linear-gradient(165deg, #07100d 10%, #0a1512 45%, #060c0a 100%)",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    kind: "gradient",
    base: "#090b0a",
    background:
      "radial-gradient(100% 80% at 78% 4%, rgba(74,92,78,.4), transparent 55%), radial-gradient(80% 70% at 8% 82%, rgba(50,66,59,.45), transparent 60%), linear-gradient(160deg, #0b0f0d, #080a09 60%, #0a0e0c)",
  },
  {
    id: "dawn",
    name: "Forest dawn",
    kind: "gradient",
    base: "#e8e6d8",
    background:
      "radial-gradient(100% 80% at 18% 0%, rgba(206,224,188,.95), transparent 60%), radial-gradient(90% 80% at 92% 22%, rgba(240,220,188,.9), transparent 62%), radial-gradient(120% 100% at 50% 110%, rgba(150,184,148,.8), transparent 65%), linear-gradient(150deg, #eef0e1, #dfe7d3 55%, #cfdcc8)",
  },
  {
    id: "coast",
    name: "Cool coast",
    kind: "gradient",
    base: "#0c1518",
    background:
      "radial-gradient(110% 90% at 85% 8%, rgba(86,132,143,.55), transparent 60%), radial-gradient(90% 70% at 12% 30%, rgba(38,78,80,.55), transparent 64%), radial-gradient(120% 100% at 50% 108%, rgba(145,142,108,.28), transparent 62%), linear-gradient(170deg, #0a1315, #0b1416 50%, #070e10)",
  },
];

export const DEFAULT_SETTINGS = {
  theme: "dark" as const,
  wallpaperId: "emerald",
  customWallpaper: null,
  dim: 0.4,
  blur: 0,
  cardOpacity: 0.56,
};

export const uid = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

const bm = (title: string, url: string, note?: string): Bookmark => ({
  id: uid("bm"),
  title,
  url,
  note,
  createdAt: Date.now(),
});

const cat = (
  name: string,
  emoji: string,
  accent: string,
  description: string,
  bookmarks: [string, string][],
): Category => ({
  id: uid("cat"),
  name,
  emoji,
  accent,
  description,
  bookmarks: bookmarks.map(([title, url]) => bm(title, url)),
});

export function createDefaultData(): AppData {
  return {
    version: 1,
    updatedAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS },
    categories: [
      cat("Work", "💼", "#cdf27a", "The places I get things done", [
        ["Slack", "https://slack.com"],
        ["Notion", "https://notion.so"],
        ["Linear", "https://linear.app"],
        ["Google Calendar", "https://calendar.google.com"],
        ["Figma", "https://figma.com"],
        ["Gmail", "https://mail.google.com"],
      ]),
      cat("Notes & Docs", "📝", "#a8f0b4", "Writing, thinking, and reading", [
        ["Obsidian", "https://obsidian.md"],
        ["Google Docs", "https://docs.google.com"],
        ["Readwise Reader", "https://readwise.io/read"],
        ["Craft", "https://craft.do"],
        ["Are.na", "https://are.na"],
      ]),
      cat("Communication", "💬", "#9fe8d0", "Where the conversations live", [
        ["Discord", "https://discord.com/app"],
        ["Telegram Web", "https://web.telegram.org"],
        ["WhatsApp Web", "https://web.whatsapp.com"],
        ["X / Twitter", "https://x.com"],
        ["LinkedIn", "https://linkedin.com"],
        ["Reddit", "https://reddit.com"],
      ]),
      cat("Design", "🎨", "#f4a8c8", "Inspiration and visual references", [
        ["Dribbble", "https://dribbble.com"],
        ["Behance", "https://behance.net"],
        ["Mobbin", "https://mobbin.com"],
        ["Pinterest", "https://pinterest.com"],
        ["Fontshare", "https://fontshare.com"],
      ]),
      cat("Dev & Code", "⌥", "#9fd8f5", "Tools for building things", [
        ["GitHub", "https://github.com"],
        ["Vercel", "https://vercel.com/dashboard"],
        ["Stack Overflow", "https://stackoverflow.com"],
        ["MDN Web Docs", "https://developer.mozilla.org"],
        ["npm", "https://npmjs.com"],
        ["CodeSandbox", "https://codesandbox.io"],
      ]),
      cat("AI Tools", "✦", "#c3b6ff", "My everyday thinking partners", [
        ["ChatGPT", "https://chatgpt.com"],
        ["Claude", "https://claude.ai"],
        ["Perplexity", "https://perplexity.ai"],
        ["Midjourney", "https://midjourney.com"],
        ["v0 by Vercel", "https://v0.dev"],
        ["Suno", "https://suno.com"],
      ]),
      cat("Reading", "📚", "#f7c48b", "Long reads and good writing", [
        ["Hacker News", "https://news.ycombinator.com"],
        ["Substack", "https://substack.com"],
        ["Aeon", "https://aeon.co"],
        ["Longreads", "https://longreads.com"],
        ["Nautilus", "https://nautil.us"],
      ]),
      cat("Finance", "◈", "#e6e08f", "Money, calmly handled", [
        ["Wise", "https://wise.com"],
        ["PayPal", "https://paypal.com"],
        ["Coinbase", "https://coinbase.com"],
        ["TradingView", "https://tradingview.com"],
        ["Stripe", "https://dashboard.stripe.com"],
      ]),
      cat("Entertainment", "🎬", "#f2a69a", "Something for the evening", [
        ["YouTube", "https://youtube.com"],
        ["Netflix", "https://netflix.com"],
        ["Spotify", "https://open.spotify.com"],
        ["Twitch", "https://twitch.tv"],
        ["Letterboxd", "https://letterboxd.com"],
      ]),
      cat("Shopping", "🛍", "#b9c7f5", "Usefully saved for later", [
        ["Amazon", "https://amazon.com"],
        ["Etsy", "https://etsy.com"],
        ["Uniqlo", "https://uniqlo.com"],
        ["SSENSE", "https://ssense.com"],
        ["IKEA", "https://ikea.com"],
      ]),
    ],
  };
}

export const GREETINGS = [
  "your calm corner of the internet",
  "a quieter place for good links",
  "everything worth coming back to",
  "your bookmarks, beautifully kept",
];
