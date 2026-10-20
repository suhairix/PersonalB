import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  CircleAlert,
  Cloud,
  CloudOff,
  ExternalLink,
  Eye,
  EyeOff,
  GitMerge,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  Server,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import type { GitHubSync } from "@/hooks/useGitHubSync";
import type { GitHubMode } from "@/lib/github";
import {
  bookmarkCount,
  relativeTime,
  storageLabel,
  storageUrl,
  tokenCreationUrl,
} from "@/lib/github";
import { cn } from "@/utils/cn";
import { Switch } from "@/components/ui";

function GithubMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.74-1.56-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

const STATUS_COPY: Record<GitHubSync["status"], { label: string; dot: string; text: string }> = {
  off: { label: "Local only", dot: "bg-[var(--faint)]", text: "text-[var(--muted)]" },
  connecting: { label: "Connecting…", dot: "bg-[#e6e08f]", text: "text-[#e6e08f]" },
  syncing: { label: "Syncing…", dot: "bg-[#e6e08f]", text: "text-[#e6e08f]" },
  synced: { label: "In sync", dot: "bg-[var(--accent)]", text: "text-[var(--accent)]" },
  error: { label: "Sync error", dot: "bg-[#e88b8b]", text: "text-[#e88b8b]" },
  conflict: { label: "Needs review", dot: "bg-[#f0c48a]", text: "text-[#f0c48a]" },
};

export function GitHubPanel({
  sync,
  bookmarkTotal,
}: {
  sync: GitHubSync;
  bookmarkTotal: number;
}) {
  const { config, status, error, conflict } = sync;
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<GitHubMode>("gist");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [path, setPath] = useState("");
  const [gistId, setGistId] = useState("");
  const [busy, setBusy] = useState(false);

  const showForm = !config || editing;
  const statusMeta = STATUS_COPY[status];
  const remoteBookmarks = conflict ? bookmarkCount(conflict.remote.payload) : 0;

  const submit = async () => {
    setBusy(true);
    await sync.connect({
      mode,
      token,
      gistId: mode === "gist" ? gistId || undefined : undefined,
      repo: mode === "repo" ? repo : undefined,
      branch: mode === "repo" ? branch || undefined : undefined,
      path: mode === "repo" ? path || undefined : undefined,
      autoSync: true,
    });
    setBusy(false);
    setToken("");
    setShowToken(false);
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border p-3.5",
          config ? "border-[var(--border)] bg-[var(--field)]" : "border-[var(--accent)]/30 bg-[var(--accent-soft)]",
        )}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--field)] text-[var(--text)]">
            {config ? <GithubMark size={16} /> : <Cloud size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold">
              GitHub cloud storage
              <span className={cn("inline-flex items-center gap-1 text-[10.5px] font-medium", statusMeta.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                {statusMeta.label}
              </span>
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--muted)]">
              {config
                ? "Your bookmarks live in your own GitHub account, so any browser can restore them."
                : "Optional. Keep a private copy of this library in your own GitHub account — no server needed."}
            </p>
          </div>
        </div>

        {config ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)]/40 p-2.5">
            {config.viewer.avatarUrl ? (
              <img
                src={config.viewer.avatarUrl}
                alt=""
                width={30}
                height={30}
                className="h-[30px] w-[30px] rounded-full border border-[var(--border)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--field)] text-[var(--muted)]">
                <GithubMark size={15} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium">
                @{config.viewer.login}
                {config.viewer.name ? (
                  <span className="font-normal text-[var(--muted)]"> · {config.viewer.name}</span>
                ) : null}
              </p>
              <p className="flex items-center gap-1 truncate text-[10.5px] text-[var(--faint)]">
                <Lock size={9.5} />
                {config.mode === "gist" ? "Secret gist" : storageLabel(config)}
                {config.mode === "repo" && config.branch ? ` · ${config.branch}` : ""}
              </p>
            </div>
            {storageUrl(config) ? (
              <a
                href={storageUrl(config)}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn h-7 w-7 shrink-0"
                aria-label="Open cloud storage on GitHub"
                title="Open on GitHub"
              >
                <ExternalLink size={13} />
              </a>
            ) : null}
          </div>
        ) : null}

        {config ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--border)] px-2.5 py-2">
              <p className="text-[13px] font-semibold tabular-nums">{bookmarkTotal}</p>
              <p className="text-[10px] text-[var(--muted)]">on this device</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] px-2.5 py-2">
              <p className="text-[10px] font-medium text-[var(--muted)]">last cloud sync</p>
              <p className="mt-0.5 text-[11.5px] font-medium">{relativeTime(sync.lastSyncedAt)}</p>
            </div>
          </div>
        ) : null}

        {config ? (
          <>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
              <div>
                <p className="text-[12px] font-medium">Sync automatically</p>
                <p className="text-[10.5px] text-[var(--faint)]">
                  Push changes shortly after you make them
                </p>
              </div>
              <Switch
                checked={config.autoSync}
                onChange={sync.setAutoSync}
                label="Sync automatically with GitHub"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => void sync.syncNow()}
                disabled={status === "syncing" || status === "connecting"}
                className="btn-primary h-8 !px-3 !text-[11.5px] disabled:opacity-60"
              >
                {status === "syncing" ? (
                  <Loader2 size={12.5} className="animate-spin" />
                ) : (
                  <RefreshCw size={12.5} />
                )}
                Sync now
              </button>
              <button
                onClick={() => {
                  setMode(config.mode);
                  setRepo(config.owner && config.repo ? `${config.owner}/${config.repo}` : "");
                  setBranch(config.branch ?? "");
                  setPath(config.path ?? "");
                  setGistId(config.gistId ?? "");
                  setEditing(true);
                }}
                className="btn-ghost h-8 !px-3 !text-[11.5px]"
              >
                <Link2 size={12.5} /> Change destination
              </button>
              <button
                onClick={sync.disconnect}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium text-[var(--faint)] transition hover:bg-[#e26a6a]/10 hover:text-[#e88b8b]"
              >
                <Unplug size={12} /> Disconnect
              </button>
            </div>
          </>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-[#e26a6a]/30 bg-[#e26a6a]/10 p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#f0a0a0]">
            <CircleAlert size={13} /> Sync problem
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#f0a0a0]/90">{error}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => void sync.syncNow()}
              className="rounded-full bg-[#e26a6a]/20 px-2.5 py-1 text-[10.5px] font-semibold text-[#f5c0c0] transition hover:bg-[#e26a6a]/30"
            >
              Try again
            </button>
            <button
              onClick={sync.clearError}
              className="text-[10.5px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {conflict ? (
        <div className="rounded-xl border border-[#e6b26b]/35 bg-[#e6b26b]/10 p-3.5">
          <p className="text-[12px] font-semibold text-[#f0c48a]">Two copies, one choice</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#f0c48a]/90">
            GitHub has {remoteBookmarks} bookmarks that were changed on another device. This device has{" "}
            {bookmarkTotal}. Pick how to settle it — nothing is lost until you choose.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => void sync.resolveConflict("merge")}
              disabled={status === "syncing"}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-2.5 py-1.5 text-[10.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-60"
            >
              <GitMerge size={11.5} /> Merge both
            </button>
            <button
              onClick={() => void sync.resolveConflict("cloud")}
              disabled={status === "syncing"}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-2.5 py-1.5 text-[10.5px] font-medium text-[var(--text-soft)] transition hover:bg-[var(--field)] disabled:opacity-60"
            >
              <ArrowDownToLine size={11.5} /> Use cloud copy
            </button>
            <button
              onClick={() => void sync.resolveConflict("device")}
              disabled={status === "syncing"}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-2.5 py-1.5 text-[10.5px] font-medium text-[var(--text-soft)] transition hover:bg-[var(--field)] disabled:opacity-60"
            >
              <ArrowUpFromLine size={11.5} /> Keep this device
            </button>
          </div>
          <p className="mt-2 text-[10px] text-[#f0c48a]/70">
            Merge keeps every bookmark and combines categories with the same name.
          </p>
        </div>
      ) : null}

      {showForm ? (
        <div className="space-y-3.5 rounded-xl border border-[var(--border)] p-3.5">
          <div className="flex items-center gap-2">
            <KeyRound size={13.5} className="text-[var(--muted)]" />
            <p className="text-[12px] font-semibold">
              {editing ? "Change where bookmarks are stored" : "Connect your GitHub account"}
            </p>
          </div>

          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--field)] p-0.5">
            {(
              [
                { id: "gist" as const, label: "Secret Gist", hint: "easiest" },
                { id: "repo" as const, label: "Repository file", hint: "most control" },
              ]
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition",
                  mode === option.id
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]",
                )}
              >
                {option.label}
                <span
                  className={cn(
                    "rounded px-1 text-[8.5px] uppercase tracking-wide",
                    mode === option.id ? "bg-black/15" : "bg-[var(--field)] text-[var(--faint)]",
                  )}
                >
                  {option.hint}
                </span>
              </button>
            ))}
          </div>

          <div>
            <label className="label" htmlFor="gh-token">
              Personal access token
            </label>
            <div className="relative">
              <input
                id="gh-token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={mode === "gist" ? "ghp_…" : "github_pat_…"}
                className="field pr-9 font-mono !text-[11.5px]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowToken((visible) => !visible)}
                className="icon-btn absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <a
                href={tokenCreationUrl(mode)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--accent)] hover:underline"
              >
                Create a {mode === "gist" ? "classic token with gist scope" : "fine-grained token"}
                <ExternalLink size={9.5} />
              </a>
              <span className="text-[10px] text-[var(--faint)]">· stays in this browser</span>
            </div>
          </div>

          {mode === "gist" ? (
            <div>
              <label className="label" htmlFor="gh-gist">
                Gist ID <span className="font-normal normal-case tracking-normal text-[var(--faint)]">optional</span>
              </label>
              <input
                id="gh-gist"
                value={gistId}
                onChange={(event) => setGistId(event.target.value)}
                placeholder="Leave empty to find or create “PersonalB”"
                className="field !text-[11.5px]"
                spellCheck={false}
              />
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--faint)]">
                Reuse an existing PersonalB gist when connecting a second device.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <label className="label" htmlFor="gh-repo">
                  Repository
                </label>
                <input
                  id="gh-repo"
                  value={repo}
                  onChange={(event) => setRepo(event.target.value)}
                  placeholder="your-name/PersonalB-data"
                  className="field !text-[11.5px]"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="label" htmlFor="gh-branch">
                  Branch
                </label>
                <input
                  id="gh-branch"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  placeholder="main"
                  className="field !text-[11.5px]"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="label" htmlFor="gh-path">
                  File path
                </label>
                <input
                  id="gh-path"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  placeholder="PersonalB/bookmarks.json"
                  className="field !text-[11.5px]"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          <details className="group rounded-lg bg-[var(--field)] px-2.5 py-2">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-[var(--text-soft)]">
              <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
              {mode === "gist" ? "Which scopes do I need?" : "Token permissions"}
            </summary>
            <div className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-[var(--muted)]">
              {mode === "gist" ? (
                <>
                  <p className="flex items-start gap-1.5">
                    <Check size={11} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    Use a <strong>classic</strong> token and enable only the <strong>gist</strong>{" "}
                    scope.
                  </p>
                  <p className="flex items-start gap-1.5">
                    <Check size={11} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    PersonalB looks for its file, otherwise creates a{" "}
                    <strong>secret gist</strong> on first sync.
                  </p>
                  <p className="flex items-start gap-1.5">
                    <ShieldCheck size={11} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    Secret gists are unlisted, not encrypted. For stricter privacy use a private
                    repository instead.
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-start gap-1.5">
                    <Check size={11} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    Create the token under <strong>Only select repositories</strong> and choose one
                    repo — ideally a private one you make for this.
                  </p>
                  <p className="flex items-start gap-1.5">
                    <Check size={11} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    Repository permission → <strong>Contents: Read and write</strong>. Nothing else.
                  </p>
                  <p className="flex items-start gap-1.5">
                    <Check size={11} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    The file and folders are created automatically on first sync.
                  </p>
                </>
              )}
            </div>
          </details>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void submit()}
              disabled={busy || !token.trim() || status === "connecting"}
              className="btn-primary h-9 flex-1 justify-center disabled:opacity-60"
            >
              {busy || status === "connecting" ? (
                <Loader2 size={13.5} className="animate-spin" />
              ) : (
                <Cloud size={13.5} />
              )}
              {editing ? "Save destination" : "Connect GitHub"}
            </button>
            {editing || config ? (
              <button
                onClick={() => {
                  setEditing(false);
                  setToken("");
                  sync.clearError();
                }}
                className="btn-ghost h-9"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--faint)]">
            <Lock size={11} className="mt-0.5 shrink-0" />
            The token is kept in this browser's local storage and sent only to api.github.com. It is
            never part of a library export, and there is no PersonalB server involved.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] p-3.5">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold">
          <Server size={13} className="text-[var(--muted)]" /> Self-hosted by design
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
          This page is a static site. Every visitor connects their own GitHub account, so one
          deployment can serve many people and each library stays in its owner's account. You can
          fork it and host it on GitHub Pages, Vercel, or any static host without a backend.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--faint)]">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5">
            <MapPin size={9.5} /> No server
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5">
            <GithubMark size={9.5} /> Your own account
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5">
            <CloudOff size={9.5} /> Works offline
          </span>
        </div>
        <div className="mt-2.5 rounded-lg bg-[var(--field)] p-2 text-[10px] leading-relaxed text-[var(--faint)]">
          Wallpaper images stay on each device. Only bookmarks, categories and visual settings sync
          (custom wallpaper uploads are excluded to keep the GitHub file small).
        </div>
      </div>
    </div>
  );
}

export function SyncStatusButton({
  status,
  onClick,
}: {
  status: GitHubSync["status"];
  onClick: () => void;
}) {
  const meta = STATUS_COPY[status];
  return (
    <button
      onClick={onClick}
      className="icon-btn relative h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--field)]"
      aria-label={`GitHub sync: ${meta.label}`}
      title={`GitHub sync — ${meta.label}`}
    >
      <Cloud size={15} />
      <span
        className={cn(
          "absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-full ring-2 ring-[var(--surface-solid)]",
          meta.dot,
        )}
      />
    </button>
  );
}
