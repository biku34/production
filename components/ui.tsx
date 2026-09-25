"use client";

import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import {
  WO_STATUS_LABELS,
  WO_STATUS_REF,
  deliveryFlag,
  type WoStatus,
  type DeliveryFlag,
} from "@/lib/domain";

const STATUS_STYLE: Record<WoStatus, string> = {
  Created: "pill pill-neutral",
  Sampling: "pill pill-violet",
  PreProductionReview: "pill pill-amber",
  InProduction: "pill pill-blue",
  InInspection: "pill pill-fuchsia",
  PackingDispatch: "pill pill-cyan",
  Closed: "pill pill-green",
};

export function StatusBadge({ status }: { status: WoStatus }) {
  return (
    <span
      className={STATUS_STYLE[status] || "pill pill-neutral"}
      title={WO_STATUS_REF[status]}
    >
      {WO_STATUS_LABELS[status] || status}
    </span>
  );
}

const FLAG_STYLE: Record<DeliveryFlag, string> = {
  Overdue: "pill pill-red",
  Today: "pill pill-orange",
  Tomorrow: "pill pill-yellow",
  OnTrack: "pill pill-neutral",
  None: "pill pill-neutral",
};

const FLAG_LABEL: Record<DeliveryFlag, string> = {
  Overdue: "Overdue",
  Today: "Due today",
  Tomorrow: "Due tomorrow",
  OnTrack: "On track",
  None: "No due date",
};

export function DeliveryBadge({ dueDate }: { dueDate?: string | Date | null }) {
  const flag = deliveryFlag(dueDate);
  if (flag === "None") return null;
  return <span className={FLAG_STYLE[flag]}>{FLAG_LABEL[flag]}</span>;
}

export function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority || priority === "Normal") return null;
  const style =
    priority === "Rush"
      ? "bg-red-600 text-[#fff]"
      : "bg-amber-500 text-[#fff]";
  return <span className={`badge ${style}`}>{priority}</span>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/40 p-3 pt-6 backdrop-blur-sm sm:p-4 sm:pt-16"
      onClick={onClose}
    >
      <div
        className={`card w-full shadow-pop ${wide ? "max-w-3xl" : "max-w-lg"} p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          <button
            className="grid h-8 w-8 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "warn" | "good";
}) {
  const toneCls =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "good"
      ? "text-brand-600"
      : "text-ink-900";
  return (
    <div className="card p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${toneCls}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-ink-400">{text}</div>;
}
