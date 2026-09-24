"use client";

import { useEffect } from "react";
import {
  WO_STATUS_LABELS,
  WO_STATUS_REF,
  deliveryFlag,
  type WoStatus,
  type DeliveryFlag,
} from "@/lib/domain";

const STATUS_STYLE: Record<WoStatus, string> = {
  Created: "bg-slate-100 text-slate-700",
  Sampling: "bg-violet-100 text-violet-700",
  PreProductionReview: "bg-amber-100 text-amber-700",
  InProduction: "bg-blue-100 text-blue-700",
  InInspection: "bg-fuchsia-100 text-fuchsia-700",
  PackingDispatch: "bg-cyan-100 text-cyan-700",
  Closed: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status }: { status: WoStatus }) {
  return (
    <span
      className={`badge ${STATUS_STYLE[status] || "bg-slate-100 text-slate-700"}`}
      title={WO_STATUS_REF[status]}
    >
      {WO_STATUS_LABELS[status] || status}
    </span>
  );
}

const FLAG_STYLE: Record<DeliveryFlag, string> = {
  Overdue: "bg-red-100 text-red-700",
  Today: "bg-orange-100 text-orange-700",
  Tomorrow: "bg-yellow-100 text-yellow-800",
  OnTrack: "bg-emerald-50 text-emerald-700",
  None: "bg-slate-100 text-slate-500",
};

const FLAG_LABEL: Record<DeliveryFlag, string> = {
  Overdue: "Overdue",
  Today: "Delivery Today",
  Tomorrow: "Delivery Tomorrow",
  OnTrack: "On track",
  None: "No due date",
};

export function DeliveryBadge({ dueDate }: { dueDate?: string | Date | null }) {
  const flag = deliveryFlag(dueDate);
  if (flag === "None") return null;
  return <span className={`badge ${FLAG_STYLE[flag]}`}>{FLAG_LABEL[flag]}</span>;
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`card w-full ${wide ? "max-w-3xl" : "max-w-lg"} p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose}>
            ✕
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
      ? "text-emerald-600"
      : "text-ink-900";
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneCls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-sm text-ink-500 py-10">{text}</div>
  );
}
