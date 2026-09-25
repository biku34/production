/**
 * Domain vocabulary for the Fabric Production module.
 * Mirrors SRS §3.2 (WO lifecycle), §2.3 (roles), Appendix A (stages).
 */

// --- Work-order lifecycle statuses (SRS §3.2) --------------------------------
export const WO_STATUSES = [
  "Created", // New Order — WO generated, BOM & routing attached
  "Sampling", // In Design — lab-dip / shade approval / design
  "PreProductionReview", // Order Review — availability/routing/schedule confirmed
  "InProduction", // In Production — weaving/dyeing/finishing in progress
  "InInspection", // QC — grading / defect capture
  "PackingDispatch", // Order Shipment — packed roll-wise, handed to shipment
  "Closed", // Fully produced, inspected, packed, reconciled
] as const;
export type WoStatus = (typeof WO_STATUSES)[number];

export const WO_STATUS_LABELS: Record<WoStatus, string> = {
  Created: "Created / Planned",
  Sampling: "Sampling / Approval",
  PreProductionReview: "Pre-production Review",
  InProduction: "In Production",
  InInspection: "In Inspection",
  PackingDispatch: "Packing & Dispatch",
  Closed: "Closed",
};

/** Hex colors per status, used by charts (aligned with the badge hues). */
export const WO_STATUS_COLORS: Record<WoStatus, string> = {
  Created: "#94a3b8",
  Sampling: "#8b5cf6",
  PreProductionReview: "#f59e0b",
  InProduction: "#3b82f6",
  InInspection: "#d946ef",
  PackingDispatch: "#06b6d4",
  Closed: "#1c6f63",
};

/** Reference-app lineage (SRS §3.2 / Appendix B) — shown as tooltip. */
export const WO_STATUS_REF: Record<WoStatus, string> = {
  Created: "Ref: New Order",
  Sampling: "Ref: In Design",
  PreProductionReview: "Ref: Order Review",
  InProduction: "Ref: In Production",
  InInspection: "Ref: (QC)",
  PackingDispatch: "Ref: Order Shipment",
  Closed: "Ref: Closed",
};

/** Allowed forward/backward transitions (FR-JB-4 — cannot skip a mandatory stage). */
export const WO_TRANSITIONS: Record<WoStatus, WoStatus[]> = {
  Created: ["Sampling", "PreProductionReview"],
  Sampling: ["PreProductionReview", "Created"],
  PreProductionReview: ["InProduction", "Sampling"],
  InProduction: ["InInspection", "PreProductionReview"],
  InInspection: ["PackingDispatch", "InProduction"],
  PackingDispatch: ["Closed", "InInspection"],
  Closed: [],
};

export function canTransition(from: WoStatus, to: WoStatus): boolean {
  return WO_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Roles (SRS §2.3) --------------------------------------------------------
export const ROLES = [
  "PlantAdmin",
  "ProductionPlanner",
  "StoreKeeper",
  "StageSupervisor",
  "QCInspector",
  "JobWorkCoordinator",
  "PackingDispatch",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  PlantAdmin: "Plant Owner / Admin",
  ProductionPlanner: "Production Planner / Manager",
  StoreKeeper: "Store / Materials Keeper",
  StageSupervisor: "Stage Supervisor",
  QCInspector: "QC / Inspector",
  JobWorkCoordinator: "Job-work Coordinator",
  PackingDispatch: "Packing / Dispatch",
};

/**
 * RBAC — which roles may perform each status transition (FR-JB-4, SRS §2.3).
 * PlantAdmin can do anything (see canRoleTransition). Keyed `"<from>>><to>"`.
 * The manager (planner) pushes a WO into the pipeline; each subsequent role
 * owns the hand-off out of its own stage; QC can reject back to production.
 */
export const TRANSITION_ROLES: Partial<Record<string, Role[]>> = {
  "Created>>Sampling": ["ProductionPlanner"],
  "Created>>PreProductionReview": ["ProductionPlanner"],
  "Sampling>>PreProductionReview": ["ProductionPlanner"],
  "Sampling>>Created": ["ProductionPlanner"],
  "PreProductionReview>>InProduction": ["ProductionPlanner", "StoreKeeper"],
  "PreProductionReview>>Sampling": ["ProductionPlanner"],
  "InProduction>>InInspection": ["StageSupervisor"],
  "InProduction>>PreProductionReview": ["StageSupervisor", "ProductionPlanner"],
  "InInspection>>PackingDispatch": ["QCInspector"],
  "InInspection>>InProduction": ["QCInspector"], // QC reject → back to floor
  "PackingDispatch>>Closed": ["PackingDispatch"],
  "PackingDispatch>>InInspection": ["PackingDispatch", "QCInspector"],
};

/** Roles allowed to move a WO from `from` to `to` (empty ⇒ nobody but Admin). */
export function rolesForTransition(from: WoStatus, to: WoStatus): Role[] {
  return TRANSITION_ROLES[`${from}>>${to}`] ?? [];
}

/** Whether a given role may perform a transition. PlantAdmin is unrestricted. */
export function canRoleTransition(
  role: Role | null | undefined,
  from: WoStatus,
  to: WoStatus
): boolean {
  if (!canTransition(from, to)) return false;
  if (role === "PlantAdmin") return true;
  return role ? rolesForTransition(from, to).includes(role) : false;
}

// --- Production stages (SRS Appendix A) --------------------------------------
export const STAGES = [
  "MaterialIssue",
  "Weaving", // weaving / knitting
  "Dyeing", // dyeing / printing
  "Finishing",
  "Inspection",
  "Packing",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  MaterialIssue: "Material Issue",
  Weaving: "Weaving / Knitting",
  Dyeing: "Dyeing / Printing",
  Finishing: "Finishing",
  Inspection: "Inspection / QC",
  Packing: "Packing",
};

/**
 * Which WO status a supervisor of a given stage is scoped to (FR-JB-3).
 * A Weaving/Dyeing/Finishing supervisor watches "In Production"; QC watches
 * "In Inspection"; Packing watches "Packing & Dispatch".
 */
export const STAGE_TO_STATUS: Record<Stage, WoStatus> = {
  MaterialIssue: "PreProductionReview",
  Weaving: "InProduction",
  Dyeing: "InProduction",
  Finishing: "InProduction",
  Inspection: "InInspection",
  Packing: "PackingDispatch",
};

// --- Units (SRS §2.5 — explicit, convertible) --------------------------------
export const UNITS = ["kg", "m", "yd", "pcs", "roll"] as const;
export type Unit = (typeof UNITS)[number];

// --- QC grades ---------------------------------------------------------------
export const GRADES = ["A", "B", "C", "Reject"] as const;
export type Grade = (typeof GRADES)[number];

// --- WO priority -------------------------------------------------------------
export const PRIORITIES = ["Normal", "Flagged", "Rush"] as const;
export type Priority = (typeof PRIORITIES)[number];

// --- Delivery flags (FR-JB-2) ------------------------------------------------
export type DeliveryFlag = "Overdue" | "Today" | "Tomorrow" | "OnTrack" | "None";

export function deliveryFlag(dueDate?: Date | string | null): DeliveryFlag {
  if (!dueDate) return "None";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "None";
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const dayMs = 24 * 60 * 60 * 1000;
  if (dueDay < today) return "Overdue";
  if (dueDay === today) return "Today";
  if (dueDay === today + dayMs) return "Tomorrow";
  return "OnTrack";
}
