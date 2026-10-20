import type { AppData, Bookmark, Category, Settings } from "@/types";
import { normalizeData, normalizeUrl } from "@/lib/storage";

const API = "https://api.github.com";
const LEGACY_SYNC_FILE = "lumilist-bookmarks.json";
const LEGACY_SYNC_CONFIG_KEY = "lumilist.github.v1";
const LEGACY_DEFAULT_SYNC_PATH = "lumilist/bookmarks.json";
export const SYNC_FILE = "PersonalB-bookmarks.json";
export const SYNC_DESCRIPTION = "PersonalB bookmarks — private cloud backup";
export const SYNC_CONFIG_KEY = "PersonalB.github.v1";
export const DEFAULT_SYNC_PATH = "PersonalB/bookmarks.json";

export type GitHubMode = "gist" | "repo";

export type GitHubViewer = {
  login: string;
  name?: string;
  avatarUrl?: string;
};

export type GitHubConfig = {
  mode: GitHubMode;
  token: string;
  autoSync: boolean;
  viewer: GitHubViewer;
  gistId?: string;
  gistUrl?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  path?: string;
  repoUrl?: string;
  /** `updatedAt` of the last cloud copy this device has seen. */
  lastRemoteUpdatedAt: number;
  lastSyncedAt: number | null;
  /** Local `updatedAt` at the moment of the last successful sync. */
  lastSyncedLocalUpdatedAt?: number;
  connectedAt: number;
};

export type CloudSettings = Omit<Settings, "customWallpaper">;

export type CloudPayload = {
  app: "PersonalB";
  version: 1;
  updatedAt: number;
  categories: Category[];
  settings: CloudSettings;
};

export type RemoteSnapshot = {
  payload: CloudPayload;
  sha?: string;
  htmlUrl?: string;
};

export type ConnectInput = {
  mode: GitHubMode;
  token: string;
  autoSync?: boolean;
  gistId?: string;
  repo?: string;
  branch?: string;
  path?: string;
};

export class GitHubError extends Error {
  status: number;
  hint?: string;

  constructor(message: string, status = 0, hint?: string) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.hint = hint;
  }
}

/* ------------------------------------------------------------------ */
/* Config persistence (the token never leaves this browser, and      */
/* is never included in JSON exports of the library)                  */
/* ------------------------------------------------------------------ */

export function loadSyncConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY) ?? localStorage.getItem(LEGACY_SYNC_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GitHubConfig>;
    if (!parsed || typeof parsed.token !== "string" || !parsed.token) return null;
    if (parsed.mode !== "gist" && parsed.mode !== "repo") return null;
    return {
      mode: parsed.mode,
      token: parsed.token,
      autoSync: Boolean(parsed.autoSync),
      viewer: {
        login: parsed.viewer?.login || "github",
        name: parsed.viewer?.name,
        avatarUrl: parsed.viewer?.avatarUrl,
      },
      gistId: parsed.gistId,
      gistUrl: parsed.gistUrl,
      owner: parsed.owner,
      repo: parsed.repo,
      branch: parsed.branch,
      path: parsed.path,
      repoUrl: parsed.repoUrl,
      lastRemoteUpdatedAt:
        typeof parsed.lastRemoteUpdatedAt === "number" ? parsed.lastRemoteUpdatedAt : 0,
      lastSyncedAt: typeof parsed.lastSyncedAt === "number" ? parsed.lastSyncedAt : null,
      lastSyncedLocalUpdatedAt:
        typeof parsed.lastSyncedLocalUpdatedAt === "number"
          ? parsed.lastSyncedLocalUpdatedAt
          : undefined,
      connectedAt: typeof parsed.connectedAt === "number" ? parsed.connectedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: GitHubConfig | null): void {
  try {
    if (!config) {
      localStorage.removeItem(SYNC_CONFIG_KEY);
      localStorage.removeItem(LEGACY_SYNC_CONFIG_KEY);
      return;
    }
    const payload = JSON.stringify(config);
    localStorage.setItem(SYNC_CONFIG_KEY, payload);
    localStorage.setItem(LEGACY_SYNC_CONFIG_KEY, payload);
  } catch {
    /* storage full — the connection stays valid for this session */
  }
}

/* ------------------------------------------------------------------ */
/* Payload helpers                                                    */
/* ------------------------------------------------------------------ */

export function toPayload(data: AppData): CloudPayload {
  return {
    app: "PersonalB",
    version: 1,
    updatedAt: Date.now(),
    categories: data.categories,
    settings: {
      theme: data.settings.theme,
      wallpaperId: data.settings.wallpaperId === "custom" ? "emerald" : data.settings.wallpaperId,
      dim: data.settings.dim,
      blur: data.settings.blur,
      cardOpacity: data.settings.cardOpacity,
    },
  };
}

export function parsePayload(raw: string): CloudPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const normalized = normalizeData(parsed);
    if (!normalized) return null;
    const record = parsed as { updatedAt?: unknown };
    return {
      app: "PersonalB",
      version: 1,
      updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
      categories: normalized.categories,
      settings: {
        theme: normalized.settings.theme,
        wallpaperId:
          normalized.settings.wallpaperId === "custom"
            ? "emerald"
            : normalized.settings.wallpaperId,
        dim: normalized.settings.dim,
        blur: normalized.settings.blur,
        cardOpacity: normalized.settings.cardOpacity,
      },
    };
  } catch {
    return null;
  }
}

/** Stable fingerprint of everything that is synced (ignores timestamps). */
export function contentKey(payload: CloudPayload): string {
  return JSON.stringify({ categories: payload.categories, settings: payload.settings });
}

export function bookmarkCount(payload: CloudPayload): number {
  return payload.categories.reduce((sum, category) => sum + category.bookmarks.length, 0);
}

/** Apply a cloud copy, keeping this device's custom wallpaper image. */
export function applyRemotePayload(local: AppData, remote: CloudPayload): AppData {
  const settings: Settings = {
    ...remote.settings,
    customWallpaper: local.settings.customWallpaper,
  };
  if (settings.wallpaperId === "custom" && !settings.customWallpaper) {
    settings.wallpaperId = "emerald";
  }
  return {
    version: 1,
    categories: remote.categories,
    settings,
    updatedAt: remote.updatedAt,
  };
}

function bookmarkKey(bookmark: Bookmark): string {
  const url = normalizeUrl(bookmark.url)
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/+$/, "");
  return `${url}|${bookmark.title.trim().toLowerCase()}`;
}

/** Union of both libraries, keeping local styling and category metadata. */
export function mergeLibraries(local: AppData, remote: CloudPayload): AppData {
  const categories: Category[] = [];
  const byName = new Map<string, Category>();
  const byId = new Map<string, Category>();

  for (const source of [...local.categories, ...remote.categories]) {
    const nameKey = source.name.trim().toLowerCase();
    const existing = byName.get(nameKey) ?? byId.get(source.id);
    if (!existing) {
      const copy: Category = { ...source, bookmarks: [...source.bookmarks] };
      categories.push(copy);
      byName.set(nameKey, copy);
      byId.set(source.id, copy);
      continue;
    }
    byName.set(nameKey, existing);
    byId.set(source.id, existing);
    const seen = new Set(existing.bookmarks.map(bookmarkKey));
    for (const bookmark of source.bookmarks) {
      const key = bookmarkKey(bookmark);
      if (seen.has(key)) continue;
      seen.add(key);
      existing.bookmarks.push(bookmark);
    }
  }

  return {
    version: 1,
    categories,
    settings: { ...local.settings },
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* GitHub REST helpers                                                */
/* ------------------------------------------------------------------ */

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
};

async function request<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new GitHubError(
      "Couldn't reach GitHub. Check your connection and try again.",
      0,
      "offline",
    );
  }

  if (!response.ok) {
    let message = "";
    try {
      const data = (await response.json()) as { message?: string };
      message = typeof data.message === "string" ? data.message : "";
    } catch {
      message = "";
    }
    if (response.status === 401) {
      throw new GitHubError(
        "GitHub rejected this token. It may be expired or revoked.",
        401,
        "token",
      );
    }
    if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
      throw new GitHubError(
        "GitHub's API rate limit was hit. Wait a few minutes and try again.",
        403,
        "rate-limit",
      );
    }
    if (response.status === 404) {
      throw new GitHubError(
        "GitHub couldn't find that, or this token doesn't have access to it.",
        404,
        "scope",
      );
    }
    if (response.status === 422) {
      throw new GitHubError(
        "GitHub blocked the update. The file may have changed — pull the cloud copy and retry.",
        422,
        "conflict",
      );
    }
    throw new GitHubError(message || `GitHub request failed (${response.status}).`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

type GistFile = {
  filename?: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
};

type GistResponse = {
  id: string;
  html_url: string;
  description: string | null;
  files: Record<string, GistFile>;
  updated_at: string;
};

type RepoResponse = {
  default_branch: string;
  html_url: string;
  full_name: string;
  private: boolean;
};

type ContentResponse = {
  sha: string;
  content?: string;
  encoding?: string;
  size: number;
  html_url?: string;
  type?: string;
};

async function getViewer(token: string): Promise<GitHubViewer> {
  const user = await request<{ login: string; name?: string; avatar_url?: string }>("/user", token);
  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
  };
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function normalizePath(input: string | undefined): string {
  const cleaned = (input ?? "").trim().replace(/^\/+/, "");
  if (!cleaned) return DEFAULT_SYNC_PATH;
  if (cleaned.endsWith("/")) return `${cleaned}${SYNC_FILE}`;
  if (!/\.json$/i.test(cleaned)) return `${cleaned}/${SYNC_FILE}`;
  return cleaned;
}

async function readGistFile(
  token: string,
  gistId: string,
): Promise<{ snapshot: RemoteSnapshot | null; gist: GistResponse }> {
  const gist = await request<GistResponse>(`/gists/${gistId}`, token);
  const file = gist.files?.[SYNC_FILE];
  let raw = file?.content;
  if (file && (file.truncated || !raw) && file.raw_url) {
    const response = await fetch(file.raw_url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw" },
    });
    if (response.ok) raw = await response.text();
  }
  if (!raw) return { snapshot: null, gist };
  const payload = parsePayload(raw);
  if (!payload) {
    throw new GitHubError(
      `The “${SYNC_FILE}” file in that gist isn't a valid PersonalB library.`,
      0,
      "parse",
    );
  }
  return { snapshot: { payload, htmlUrl: gist.html_url }, gist };
}

async function findGist(token: string, hint?: string): Promise<GistResponse | null> {
  if (hint) {
    try {
      return await request<GistResponse>(`/gists/${hint.trim()}`, token);
    } catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404) throw error;
    }
  }
  const gists = await request<GistResponse[]>("/gists?per_page=100&sort=updated", token);
  return gists.find((gist) => Boolean(gist.files?.[SYNC_FILE])) ?? null;
}

async function readRepoSnapshot(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<RemoteSnapshot | null> {
  try {
    const file = await request<ContentResponse>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
      token,
    );
    if (Array.isArray(file)) return null;
    if (!file.content || file.encoding !== "base64") {
      throw new GitHubError(
        `The file at “${path}” is too large or uses an unsupported encoding. Point sync at a new JSON path.`,
        0,
        "parse",
      );
    }
    const payload = parsePayload(decodeBase64(file.content));
    if (!payload) {
      throw new GitHubError(
        `The file at “${path}” isn't a valid PersonalB library. Choose another path or repo.`,
        0,
        "parse",
      );
    }
    return { payload, sha: file.sha, htmlUrl: file.html_url };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Public connect / read / write API                                  */
/* ------------------------------------------------------------------ */

export async function connectStorage(
  input: ConnectInput,
): Promise<{ config: GitHubConfig; snapshot: RemoteSnapshot | null }> {
  const token = input.token.trim();
  if (!token) throw new GitHubError("Paste a GitHub token to connect.", 0, "token");
  if (!/^(ghp_|github_pat_|gho_|ghu_|ghs_)/.test(token)) {
    throw new GitHubError(
      "That doesn't look like a GitHub token. It normally starts with ghp_ or github_pat_.",
      0,
      "token",
    );
  }

  const viewer = await getViewer(token);
  const base = {
    token,
    autoSync: input.autoSync ?? true,
    viewer,
    lastRemoteUpdatedAt: 0,
    lastSyncedAt: null,
    connectedAt: Date.now(),
  };

  if (input.mode === "gist") {
    let gist: GistResponse | null = null;
    let snapshot: RemoteSnapshot | null = null;
    try {
      gist = await findGist(token, input.gistId);
      if (gist) {
        const read = await readGistFile(token, gist.id);
        snapshot = read.snapshot;
        gist = read.gist;
      }
    } catch (error) {
      if (error instanceof GitHubError && error.status === 403) {
        throw new GitHubError(
          "This token can't list gists. Create a classic token with the “gist” scope, or switch to a repository.",
          403,
          "scope",
        );
      }
      throw error;
    }

    return {
      config: {
        ...base,
        mode: "gist",
        gistId: gist?.id,
        gistUrl: gist?.html_url,
        lastRemoteUpdatedAt: snapshot?.payload.updatedAt ?? 0,
      },
      snapshot,
    };
  }

  const parsed = parseRepoInput(input.repo ?? "");
  if (!parsed) {
    throw new GitHubError("Enter a repository as owner/repo, or paste its GitHub URL.", 0, "repo");
  }
  const repoInfo = await request<RepoResponse>(`/repos/${parsed.owner}/${parsed.repo}`, token);
  const branch = input.branch?.trim() || repoInfo.default_branch;
  const path = normalizePath(input.path);
  const snapshot = await readRepoSnapshot(token, parsed.owner, parsed.repo, path, branch);

  return {
    config: {
      ...base,
      mode: "repo",
      owner: parsed.owner,
      repo: parsed.repo,
      branch,
      path,
      repoUrl: repoInfo.html_url,
      lastRemoteUpdatedAt: snapshot?.payload.updatedAt ?? 0,
    },
    snapshot,
  };
}

export async function readSnapshot(config: GitHubConfig): Promise<RemoteSnapshot | null> {
  if (config.mode === "gist") {
    if (!config.gistId) return null;
    const { snapshot } = await readGistFile(config.token, config.gistId);
    return snapshot;
  }
  if (!config.owner || !config.repo || !config.branch) return null;
  return readRepoSnapshot(
    config.token,
    config.owner,
    config.repo,
    config.path ?? DEFAULT_SYNC_PATH,
    config.branch,
  );
}

export async function writeSnapshot(
  config: GitHubConfig,
  payload: CloudPayload,
): Promise<{ gistId?: string; gistUrl?: string; sha?: string; htmlUrl?: string }> {
  const content = JSON.stringify(payload, null, 2);

  if (config.mode === "gist") {
    if (!config.gistId) {
      const created = await request<GistResponse>("/gists", config.token, {
        method: "POST",
        body: {
          description: SYNC_DESCRIPTION,
          public: false,
          files: { [SYNC_FILE]: { content } },
        },
      });
      return { gistId: created.id, gistUrl: created.html_url, htmlUrl: created.html_url };
    }
    const updated = await request<GistResponse>(`/gists/${config.gistId}`, config.token, {
      method: "PATCH",
      body: {
        description: SYNC_DESCRIPTION,
        files: { [SYNC_FILE]: { content } },
      },
    });
    return { gistId: updated.id, gistUrl: updated.html_url, htmlUrl: updated.html_url };
  }

  if (!config.owner || !config.repo) {
    throw new GitHubError("This connection is missing a repository. Reconnect GitHub sync.", 0);
  }
  const path = config.path ?? DEFAULT_SYNC_PATH;
  const existing = await readRepoSnapshot(
    config.token,
    config.owner,
    config.repo,
    path,
    config.branch ?? "main",
  ).catch(() => null);
  const result = await request<{ content?: { sha?: string; html_url?: string } }>(
    `/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    config.token,
    {
      method: "PUT",
      body: {
        message: `PersonalB: sync ${bookmarkCount(payload)} bookmarks`,
        content: encodeBase64(content),
        branch: config.branch,
        ...(existing?.sha ? { sha: existing.sha } : {}),
      },
    },
  );
  return { sha: result.content?.sha, htmlUrl: result.content?.html_url };
}

/* ------------------------------------------------------------------ */
/* Small display helpers                                              */
/* ------------------------------------------------------------------ */

export function relativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "never";
  const diff = Date.now() - timestamp;
  if (diff < 45_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.round(diff / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function storageLabel(config: GitHubConfig | null): string {
  if (!config) return "Local only";
  if (config.mode === "gist") return "Private gist";
  return config.owner && config.repo ? `${config.owner}/${config.repo}` : "Repository";
}

export function storageUrl(config: GitHubConfig | null): string | undefined {
  if (!config) return undefined;
  if (config.mode === "gist") return config.gistUrl;
  return config.repoUrl;
}

export function tokenCreationUrl(mode: GitHubMode): string {
  if (mode === "gist") {
    return "https://github.com/settings/tokens/new?scopes=gist&description=PersonalB%20bookmarks";
  }
  return "https://github.com/settings/personal-access-tokens/new";
}

export function isPermissionError(error: unknown): boolean {
  return (
    error instanceof GitHubError &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  );
}
