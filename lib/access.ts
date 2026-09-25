import type { Role, WoStatus } from "@/lib/domain";

/**
 * Access policy (SRS §2.3 / §4.4 FR-JB-3). Two dimensions:
 *   1. MODULES  — which nav sections a role may open (shop-floor roles only get
 *      their work modules, not the management dashboards).
 *   2. STATUS SCOPE — which work orders a role may see (their stage's queue).
 * Both are enforced server-side (the real boundary) and mirrored in the UI.
 *
 * Edge-safe: no server-only imports, so middleware and client can both use it.
 */

/** Top-level routes a role may open. `/` is matched exactly; others by prefix. */
export const ROLE_MODULES: Record<Role, string[]> = {
  PlantAdmin: ["/", "/job-board", "/work-orders", "/machines", "/reports", "/trace", "/masters"],
  ProductionPlanner: ["/", "/job-board", "/work-orders", "/machines", "/reports", "/trace", "/masters"],
  StoreKeeper: ["/job-board", "/work-orders"],
  StageSupervisor: ["/job-board", "/work-orders", "/machines"],
  QCInspector: ["/job-board", "/work-orders"],
  JobWorkCoordinator: ["/job-board", "/work-orders"],
  PackingDispatch: ["/job-board", "/work-orders"],
};

/** Only managers create work orders. */
export const WO_CREATE_ROLES: Role[] = ["PlantAdmin", "ProductionPlanner"];
export function canCreateWorkOrder(role: Role | null | undefined): boolean {
  return !!role && WO_CREATE_ROLES.includes(role);
}

/** Where a role lands after login (shop-floor roles have no dashboard). */
export function homeFor(role: Role): string {
  return ROLE_MODULES[role]?.includes("/") ? "/" : "/job-board";
}

/** Whether a role may open a given page path. */
export function canAccessPath(role: Role, pathname: string): boolean {
  // Creating a WO is manager-only, even though everyone can list work orders.
  if (pathname === "/work-orders/new" || pathname.startsWith("/work-orders/new")) {
    return canCreateWorkOrder(role);
  }
  const mods = ROLE_MODULES[role] ?? [];
  return mods.some((m) =>
    m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(m + "/")
  );
}

/**
 * The work-order statuses a role may see (their stage's active queue).
 * `null` = unrestricted (managers/admin see the whole pipeline). A shop-floor
 * role only sees orders that have reached their stage — e.g. the dispatch team
 * sees Packing & Dispatch (and the ones they've closed), QC sees In Inspection.
 */
export const ROLE_STATUS_SCOPE: Record<Role, WoStatus[] | null> = {
  PlantAdmin: null,
  ProductionPlanner: null,
  StoreKeeper: ["PreProductionReview"],
  StageSupervisor: ["InProduction"],
  JobWorkCoordinator: ["InProduction"],
  QCInspector: ["InInspection"],
  PackingDispatch: ["PackingDispatch", "Closed"],
};

/** True if a role is allowed to see a WO of the given status. */
export function canSeeStatus(role: Role | null | undefined, status: WoStatus): boolean {
  if (!role) return false;
  const scope = ROLE_STATUS_SCOPE[role];
  return scope === null ? true : scope.includes(status);
}
