"use client";

/** Small typed fetch wrapper for the browser. */
export async function api<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return (json?.data ?? json) as T;
}

export const getJSON = <T = any>(p: string) => api<T>(p);
export const postJSON = <T = any>(p: string, body: unknown) =>
  api<T>(p, { method: "POST", body: JSON.stringify(body) });
export const patchJSON = <T = any>(p: string, body: unknown) =>
  api<T>(p, { method: "PATCH", body: JSON.stringify(body) });

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtNum(n?: number | null, dp = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}
