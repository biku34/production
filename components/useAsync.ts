"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Module-level cache shared across the SPA session. Keyed by a stable string
 * (usually the request URL). Enables stale-while-revalidate: revisiting a page
 * shows cached data instantly, then refreshes in the background.
 */
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

/** Warm the cache ahead of navigation (e.g. on link hover). Errors are ignored. */
export async function prefetch<T>(key: string, fn: () => Promise<T>): Promise<void> {
  if (cache.has(key)) return;
  try {
    cache.set(key, await fn());
  } catch {
    /* best-effort */
  }
}

export function invalidate(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

interface Options<T> {
  /** Stable cache key (usually the URL). Omit to disable caching. */
  cacheKey?: string;
  /** Server-rendered data — seeds the view so there is no load spinner. */
  initialData?: T;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  opts: Options<T> = {}
) {
  const key = opts.cacheKey;
  const seed =
    (key && cache.has(key) ? (cache.get(key) as T) : undefined) ??
    opts.initialData;

  const [data, setData] = useState<T | null>(seed ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(seed === undefined);

  // Seed the shared cache from server-provided initial data (once), so
  // client-side navigation back to this view is instant.
  if (key && !cache.has(key) && opts.initialData !== undefined) {
    cache.set(key, opts.initialData);
  }

  // Skip the fetch on the very first mount when the server already gave us data;
  // still revalidate on later dependency changes (filters) or explicit reload().
  const skipFirst = useRef(opts.initialData !== undefined);

  const run = useCallback(async () => {
    const haveData = (key && cache.has(key)) || opts.initialData !== undefined;
    if (haveData) {
      if (key && cache.has(key)) setData(cache.get(key) as T);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fn();
      setData(result);
      if (key) cache.set(key, result);
    } catch (e: any) {
      if (!haveData) setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
}
