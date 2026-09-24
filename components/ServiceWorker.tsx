"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only. In dev we intentionally skip
 * it so hot-reload is never served a stale cache. Failures are swallowed — the
 * app must work identically whether or not the SW registers.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* installability is best-effort; ignore errors */
      });
    };
    // If the window already finished loading (effects run after 'load' on a
    // fresh navigation), register now; otherwise wait for load.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
