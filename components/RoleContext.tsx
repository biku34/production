"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ROLES, ROLE_LABELS, STAGES, type Role, type Stage } from "@/lib/domain";

/**
 * Placeholder auth: the current user's role is held in localStorage and can be
 * switched from the header. This drives the role-scoped Job Board (FR-JB-3) —
 * a stage supervisor is pinned to a stage.
 */

interface RoleState {
  role: Role;
  stage: Stage | null; // for a StageSupervisor
  setRole: (r: Role) => void;
  setStage: (s: Stage | null) => void;
}

const RoleCtx = createContext<RoleState | null>(null);

const SUPERVISOR_DEFAULT_STAGE: Stage = "Weaving";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("ProductionPlanner");
  const [stage, setStageState] = useState<Stage | null>(null);

  useEffect(() => {
    const r = (localStorage.getItem("role") as Role) || "ProductionPlanner";
    const s = localStorage.getItem("stage") as Stage | null;
    setRoleState(r);
    setStageState(r === "StageSupervisor" ? s || SUPERVISOR_DEFAULT_STAGE : null);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem("role", r);
    if (r === "StageSupervisor") {
      const s = (localStorage.getItem("stage") as Stage) || SUPERVISOR_DEFAULT_STAGE;
      setStageState(s);
      localStorage.setItem("stage", s);
    } else {
      setStageState(null);
    }
  };

  const setStage = (s: Stage | null) => {
    setStageState(s);
    if (s) localStorage.setItem("stage", s);
  };

  const value = useMemo(
    () => ({ role, stage, setRole, setStage }),
    [role, stage]
  );

  return <RoleCtx.Provider value={value}>{children}</RoleCtx.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export { ROLES, ROLE_LABELS, STAGES };
