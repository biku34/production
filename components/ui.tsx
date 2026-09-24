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

const chip = "ring-1 ring-inset";

const STATUS_STYLE: Record<WoStatus, string> = {
  Created: "bg-ink-100 text-ink-700 ring-ink-600/15",
  Sampling: "bg-violet-50 text-violet-700 ring-violet-600/20",
  PreProductionReview: "bg-amber-50 text-amber-700 ring-amber-600/20",
  InProduction: "bg-blue-50 text-blue-700 ring-blue-600/20",
  InInspection: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20",
  PackingDispatch: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  Closed: "bg-brand-50 text-brand-700 ring-brand-600/20",
};

export function StatusBadge({ status }: { status: WoStatus }) {
  return (
    <span
      className={`badge ${chip} ${STATUS_STYLE[status] || "bg-ink-100 text-ink-700 ring-ink-600/15"}`}
      title={WO_STATUS_REF[status]}
    >
      {WO_STATUS_LABELS[status] || status}
    </span>
  );
}

const FLAG_STYLE: Record<DeliveryFlag, string> = {
  Overdue: "bg-red-50 text-red-700 ring-red-600/20",
  Today: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Tomorrow: "bg-yellow-50 text-yellow-800 ring-yellow-600/25",
  OnTrack: "bg-ink-50 text-ink-600 ring-ink-500/15",
  None: "bg-ink-50 text-ink-500 ring-ink-500/15",
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
  return <span className={`badge ${chip} ${FLAG_STYLE[flag]}`}>{FLAG_LABEL[flag]}</span>;
}

export function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority || priority === "Normal") return null;
  const style =
    priority === "Rush"
      ? "bg-red-600 text-white"
      : "bg-amber-500 text-white";
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/40 p-4 pt-16 backdrop-blur-sm"
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
