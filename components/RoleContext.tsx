"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getJSON } from "@/lib/client";
import { ROLES, ROLE_LABELS, STAGES, type Role, type Stage } from "@/lib/domain";

/**
 * Real (placeholder-grade) auth: the signed-in user comes from the httpOnly
 * session cookie via /api/auth/me. This drives the role-scoped Job Board
 * (FR-JB-3) — a stage supervisor is pinned to their stage — and stamps the
 * actual person's name on every action (FR-WO-6).
 */

export interface CurrentUser {
  uid: string;
  name: string;
  username: string;
  role: Role;
  stages: Stage[];
}

interface RoleState {
  user: CurrentUser | null;
  role: Role | null;
  stage: Stage | null; // primary stage for a StageSupervisor
  loading: boolean;
}

const RoleCtx = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getJSON<CurrentUser>("/api/auth/me")
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<RoleState>(
    () => ({
      user,
      role: user?.role ?? null,
      stage: user?.stages?.[0] ?? null,
      loading,
    }),
    [user, loading]
  );

  return <RoleCtx.Provider value={value}>{children}</RoleCtx.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export { ROLES, ROLE_LABELS, STAGES };
