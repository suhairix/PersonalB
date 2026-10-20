import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { colorFromString, faviconFor, initialsOf } from "@/lib/storage";

export function Modal({
  open,
  onClose,
  children,
  className,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto">
      <div
        className="fixed inset-0 animate-fade-in bg-[var(--scrim)] backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={cn(
            "glass-solid relative z-10 w-full max-w-lg animate-pop-in rounded-[22px] p-5 sm:p-6",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Sheet({
  open,
  onClose,
  children,
  title,
  subtitle,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 animate-fade-in bg-[var(--scrim)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-solid absolute inset-y-0 right-0 flex w-full max-w-[430px] animate-slide-in flex-col rounded-l-[26px] border-y-0 border-r-0 sm:rounded-l-[26px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                {icon}
              </div>
            ) : null}
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p> : null}
            </div>
          </div>
          <button onClick={onClose} className="icon-btn shrink-0" aria-label="Close panel">
            <X size={17} />
          </button>
        </header>
        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function FaviconTile({
  url,
  title,
  size = 28,
  color,
  className,
}: {
  url: string;
  title: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tint = color || colorFromString(url || title);
  const iconSize = Math.max(13, Math.round(size * 0.55));

  return (
    <span
      className={cn("favicon-tile rounded-[9px]", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {!loaded ? (
        <span
          className="absolute inset-0 grid place-items-center font-semibold"
          style={{
            fontSize: Math.max(9, Math.round(size * 0.33)),
            color: tint,
            backgroundColor: `${tint}1f`,
          }}
        >
          {initialsOf(title)}
        </span>
      ) : null}
      {!failed ? (
        <img
          src={faviconFor(url)}
          alt=""
          width={iconSize}
          height={iconSize}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={cn("relative rounded-[3px] transition-opacity", loaded ? "opacity-100" : "opacity-0")}
          style={{ width: iconSize, height: iconSize }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}

export function CategoryGlyph({
  emoji,
  accent,
  size = 30,
  className,
}: {
  emoji: string;
  accent: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-[10px] border", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `${accent}1f`,
        borderColor: `${accent}38`,
        fontSize: Math.max(12, Math.round(size * 0.48)),
        lineHeight: 1,
      }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute right-full top-1/2 mr-2.5 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-soft)] opacity-0 shadow-lg transition-opacity group-hover/tip:block group-hover/tip:opacity-100">
        {label}
      </span>
    </span>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[12.5px] font-medium text-[var(--text-soft)]">{label}</label>
        <span className="rounded-md bg-[var(--field)] px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--muted)]">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range": `${pct}%` } as CSSProperties}
        aria-label={label}
      />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors",
        checked
          ? "border-transparent bg-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--field)]",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 grid h-[16px] w-[16px] -translate-y-1/2 place-items-center rounded-full transition-all",
          checked ? "left-[19px] bg-[var(--accent-ink)]" : "left-[3px] bg-[var(--muted)]",
        )}
      >
        {checked ? <Check size={10} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-[400px]">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-[#e26a6a] px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} size={16} />;
}
