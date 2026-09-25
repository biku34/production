import { deliveryFlag, type WoStatus } from "@/lib/domain";

export interface JobWo {
  _id: string;
  woNo: string;
  productName: string;
  sku?: string;
  customerRef: string;
  targetQty: number;
  unit: string;
  status: WoStatus;
  priority: string;
  dueDate?: string;
}

/** Due-date buckets used by the Grid and Summary matrices. */
export const DUE_BUCKETS = ["Overdue", "Today", "Tomorrow", "Later", "Closed"] as const;
export type DueBucket = (typeof DUE_BUCKETS)[number];

export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  Overdue: "Overdue",
  Today: "Due today",
  Tomorrow: "Due tomorrow",
  Later: "Later",
  Closed: "Closed",
};

/** Row tint (bg / accent text) for each bucket, matching the reference board. */
export const DUE_BUCKET_TONE: Record<
  DueBucket,
  { row: string; text: string; dot: string }
> = {
  Overdue: { row: "bg-red-50/60", text: "text-red-600", dot: "#dc2626" },
  Today: { row: "bg-amber-50/60", text: "text-amber-600", dot: "#d97706" },
  Tomorrow: { row: "bg-blue-50/50", text: "text-blue-700", dot: "#2563eb" },
  Later: { row: "bg-white", text: "text-ink-700", dot: "#64748b" },
  Closed: { row: "bg-brand-50/50", text: "text-brand-700", dot: "#1c6f63" },
};

export function dueBucket(w: JobWo): DueBucket {
  if (w.status === "Closed") return "Closed";
  const f = deliveryFlag(w.dueDate);
  if (f === "Overdue") return "Overdue";
  if (f === "Today") return "Today";
  if (f === "Tomorrow") return "Tomorrow";
  return "Later";
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days until the due date (negative = overdue). Null when no due date. */
export function daysLeft(dueDate?: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((startOfDay(due) - startOfDay(new Date())) / 86_400_000);
}

/** Short human label for the "days left" column. */
export function daysLeftLabel(w: JobWo): { label: string; tone: string } {
  if (w.status === "Closed") return { label: "done", tone: "text-ink-400" };
  const n = daysLeft(w.dueDate);
  if (n == null) return { label: "—", tone: "text-ink-400" };
  if (n < 0) return { label: `${Math.abs(n)}d late`, tone: "text-red-600 font-semibold" };
  if (n === 0) return { label: "today", tone: "text-amber-600 font-semibold" };
  if (n === 1) return { label: "1d", tone: "text-blue-700 font-medium" };
  return { label: `${n}d`, tone: "text-ink-700" };
}
