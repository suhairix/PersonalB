import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "@/types";
import {
  applyRemotePayload,
  connectStorage,
  contentKey,
  loadSyncConfig,
  mergeLibraries,
  readSnapshot,
  saveSyncConfig,
  toPayload,
  writeSnapshot,
  type CloudPayload,
  type ConnectInput,
  type GitHubConfig,
  type RemoteSnapshot,
} from "@/lib/github";

export type SyncStatus = "off" | "connecting" | "syncing" | "synced" | "error" | "conflict";
export type SyncConflict = { remote: RemoteSnapshot; detectedAt: number };
export type ResolveStrategy = "cloud" | "device" | "merge";
export type SyncNotice = (message: string, tone?: "success" | "info" | "error") => void;

type Options = {
  data: AppData;
  onApplyRemote: (next: AppData) => void;
  onNotify: SyncNotice;
};

export function useGitHubSync({ data, onApplyRemote, onNotify }: Options) {
  const [config, setConfig] = useState<GitHubConfig | null>(() => loadSyncConfig());
  const [status, setStatus] = useState<SyncStatus>(() => (loadSyncConfig() ? "synced" : "off"));
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflictState] = useState<SyncConflict | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const configRef = useRef<GitHubConfig | null>(config);
  const conflictRef = useRef<SyncConflict | null>(null);
  const busyRef = useRef(false);
  const lastSyncedKeyRef = useRef<string | null>(null);
  const startupRef = useRef(false);

  const commitConfig = useCallback((next: GitHubConfig) => {
    configRef.current = next;
    setConfig(next);
    saveSyncConfig(next);
  }, []);

  const setConflict = useCallback((next: SyncConflict | null) => {
    conflictRef.current = next;
    setConflictState(next);
  }, []);

  const handleError = useCallback(
    (cause: unknown) => {
      const message = cause instanceof Error ? cause.message : "GitHub sync failed.";
      setError(message);
      setStatus("error");
      onNotify(message, "error");
    },
    [onNotify],
  );

  const push = useCallback(
    async (cfg: GitHubConfig, payload: CloudPayload, localStamp?: number) => {
      const localUpdatedAt = localStamp ?? dataRef.current.updatedAt;
      const result = await writeSnapshot(cfg, payload);
      commitConfig({
        ...cfg,
        gistId: result.gistId ?? cfg.gistId,
        gistUrl: result.gistUrl ?? cfg.gistUrl,
        lastRemoteUpdatedAt: payload.updatedAt,
        lastSyncedAt: Date.now(),
        lastSyncedLocalUpdatedAt: localUpdatedAt,
      });
      lastSyncedKeyRef.current = contentKey(payload);
      setStatus("synced");
      setError(null);
    },
    [commitConfig],
  );

  const syncNow = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const cfg = configRef.current;
      if (!cfg || busyRef.current || conflictRef.current) return;
      busyRef.current = true;
      setError(null);
      if (!options.silent) setStatus("syncing");
      try {
        const remote = await readSnapshot(cfg);
        const localPayload = toPayload(dataRef.current);

        if (!remote) {
          await push(cfg, localPayload, dataRef.current.updatedAt);
          if (!options.silent) onNotify("Cloud backup created on GitHub.", "success");
          return;
        }

        const remoteIsNewer = remote.payload.updatedAt > cfg.lastRemoteUpdatedAt;
        const differs = contentKey(remote.payload) !== contentKey(localPayload);

        if (remoteIsNewer && differs) {
          const localEditTime = dataRef.current.updatedAt ?? 0;
          const localIsClean =
            cfg.lastSyncedLocalUpdatedAt !== undefined
              ? localEditTime === cfg.lastSyncedLocalUpdatedAt
              : cfg.lastSyncedAt !== null && localEditTime <= cfg.lastSyncedAt + 5000;

          // This device hasn't edited anything since the last sync, so the newer
          // cloud copy is simply the other device's newer state: adopt it.
          if (localIsClean) {
            onApplyRemote(applyRemotePayload(dataRef.current, remote.payload));
            commitConfig({
              ...cfg,
              lastRemoteUpdatedAt: remote.payload.updatedAt,
              lastSyncedAt: Date.now(),
              lastSyncedLocalUpdatedAt: remote.payload.updatedAt,
            });
            lastSyncedKeyRef.current = contentKey(remote.payload);
            setStatus("synced");
            if (!options.silent) onNotify("Pulled the latest cloud copy from GitHub.", "success");
            return;
          }

          setConflict({ remote, detectedAt: Date.now() });
          setStatus("conflict");
          return;
        }

        if (differs) {
          await push(cfg, localPayload, dataRef.current.updatedAt);
          if (!options.silent) onNotify("Synced your latest changes to GitHub.", "success");
        } else {
          commitConfig({
            ...cfg,
            lastRemoteUpdatedAt: remote.payload.updatedAt,
            lastSyncedAt: Date.now(),
            lastSyncedLocalUpdatedAt: dataRef.current.updatedAt,
          });
          lastSyncedKeyRef.current = contentKey(remote.payload);
          setStatus("synced");
        }
      } catch (cause) {
        handleError(cause);
      } finally {
        busyRef.current = false;
      }
    },
    [commitConfig, handleError, onApplyRemote, onNotify, push, setConflict],
  );

  const connect = useCallback(
    async (input: ConnectInput) => {
      setStatus("connecting");
      setError(null);
      try {
        const { config: cfg, snapshot } = await connectStorage(input);
        commitConfig(cfg);
        const localPayload = toPayload(dataRef.current);

        if (!snapshot) {
          await push(cfg, localPayload, dataRef.current.updatedAt);
          onNotify("Connected. Your library is backed up to GitHub.", "success");
          return;
        }

        if (contentKey(snapshot.payload) === contentKey(localPayload)) {
          commitConfig({
            ...cfg,
            lastRemoteUpdatedAt: snapshot.payload.updatedAt,
            lastSyncedAt: Date.now(),
            lastSyncedLocalUpdatedAt: dataRef.current.updatedAt,
          });
          lastSyncedKeyRef.current = contentKey(snapshot.payload);
          setStatus("synced");
          onNotify("Connected — your library is already in sync.");
          return;
        }

        if (snapshot.payload.categories.length === 0) {
          await push(cfg, localPayload, dataRef.current.updatedAt);
          onNotify("Connected. The cloud copy was empty, so this device was backed up.");
          return;
        }

        setConflict({ remote: snapshot, detectedAt: Date.now() });
        setStatus("conflict");
        onNotify("Connected. Choose which copy to keep below.", "info");
      } catch (cause) {
        handleError(cause);
      }
    },
    [commitConfig, handleError, onNotify, push, setConflict],
  );

  const resolveConflict = useCallback(
    async (strategy: ResolveStrategy) => {
      const cfg = configRef.current;
      const current = conflictRef.current;
      if (!cfg || !current || busyRef.current) return;
      busyRef.current = true;
      setStatus("syncing");
      setError(null);
      try {
        if (strategy === "cloud") {
          onApplyRemote(applyRemotePayload(dataRef.current, current.remote.payload));
          commitConfig({
            ...cfg,
            lastRemoteUpdatedAt: current.remote.payload.updatedAt,
            lastSyncedAt: Date.now(),
            lastSyncedLocalUpdatedAt: current.remote.payload.updatedAt,
          });
          lastSyncedKeyRef.current = contentKey(current.remote.payload);
          onNotify("Cloud copy restored to this device.", "success");
        } else if (strategy === "device") {
          await push(
            cfg,
            { ...toPayload(dataRef.current), updatedAt: Date.now() },
            dataRef.current.updatedAt,
          );
          onNotify("This device replaced the cloud copy on GitHub.", "success");
        } else {
          const merged = mergeLibraries(dataRef.current, current.remote.payload);
          onApplyRemote(merged);
          await push(cfg, toPayload(merged), merged.updatedAt);
          onNotify("Both libraries were merged and backed up.", "success");
        }
        setConflict(null);
        setStatus("synced");
      } catch (cause) {
        handleError(cause);
      } finally {
        busyRef.current = false;
      }
    },
    [commitConfig, handleError, onApplyRemote, onNotify, push, setConflict],
  );

  const disconnect = useCallback(() => {
    configRef.current = null;
    setConfig(null);
    saveSyncConfig(null);
    lastSyncedKeyRef.current = null;
    setConflict(null);
    setError(null);
    setStatus("off");
    onNotify("GitHub sync disconnected. Bookmarks remain on this device.", "info");
  }, [onNotify, setConflict]);

  const setAutoSync = useCallback(
    (value: boolean) => {
      const cfg = configRef.current;
      if (!cfg) return;
      commitConfig({ ...cfg, autoSync: value });
    },
    [commitConfig],
  );

  const refreshFromCloud = useCallback(async () => {
    await syncNow({ silent: true });
  }, [syncNow]);

  /* Pull cloud changes once on startup when automatic sync is on. */
  useEffect(() => {
    if (startupRef.current || !config?.autoSync) return;
    startupRef.current = true;
    const timer = window.setTimeout(() => {
      void refreshFromCloud();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [config?.autoSync, refreshFromCloud]);

  /* Debounced push after local edits. */
  useEffect(() => {
    const cfg = configRef.current;
    if (!cfg || !cfg.autoSync) return;
    if (conflict || busyRef.current || status === "error") return;
    const currentKey = contentKey(toPayload(data));
    if (lastSyncedKeyRef.current && currentKey === lastSyncedKeyRef.current) return;
    if (!lastSyncedKeyRef.current && !startupRef.current) return;
    const timer = window.setTimeout(() => {
      void syncNow({ silent: true });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [data, config?.autoSync, conflict, status, syncNow]);

  return {
    config,
    status,
    error,
    conflict,
    lastSyncedAt: config?.lastSyncedAt ?? null,
    connected: Boolean(config),
    connect,
    disconnect,
    syncNow,
    resolveConflict,
    setAutoSync,
    clearError: () => setError(null),
  };
}

export type GitHubSync = ReturnType<typeof useGitHubSync>;
