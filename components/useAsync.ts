"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Module-level cache shared across the SPA session. Keyed by a stable string
 * (usually the request URL). Enables stale-while-revalidate: revisiting a page
 * shows cached data instantly, then refreshes in the background — so switching
 * modules feels instant instead of re-loading from the DB every time.
 */
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

/** Warm the cache ahead of navigation (e.g. on link hover). Errors are ignored. */
export async function prefetch<T>(key: string, fn: () => Promise<T>): Promise<void> {
  if (cache.has(key)) return; // already warm
  try {
    cache.set(key, await fn());
  } catch {
    /* best-effort */
  }
}

/** Invalidate one key or all keys after a mutation. */
export function invalidate(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

interface Options {
  /** Stable cache key (usually the URL). Omit to disable caching. */
  cacheKey?: string;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  opts: Options = {}
) {
  const key = opts.cacheKey;
  const initial = key ? (cache.get(key) as T | undefined) : undefined;

  const [data, setData] = useState<T | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(initial === undefined);

  const run = useCallback(async () => {
    const cached = key ? cache.has(key) : false;
    if (cached) {
      // Show cached immediately; revalidate silently (no loading flash).
      setData(cache.get(key!) as T);
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
      if (!cached) setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
}
