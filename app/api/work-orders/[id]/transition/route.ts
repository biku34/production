import { dbConnect } from "@/lib/mongoose";
import { ok, fail, handle } from "@/lib/api";
import { getSession } from "@/lib/auth-server";
import "@/models";
import WorkOrder from "@/models/WorkOrder";
import SalesOrder from "@/models/SalesOrder";
import {
  canTransition,
  canRoleTransition,
  rolesForTransition,
  ROLE_LABELS,
  WO_STATUS_LABELS,
  type WoStatus,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

// POST /api/work-orders/:id/transition  { to, note }
// Validated + RBAC-gated status change (FR-JB-4 — cannot skip a mandatory
// stage; SRS §2.3 — only the owning role may perform each hand-off).
export const POST = handle(async (req, ctx) => {
  const session = await getSession();
  if (!session) return fail("Not authenticated", 401);

  await dbConnect();
  const { id } = await ctx.params;
  const { to, note } = await req.json();

  const wo = await WorkOrder.findById(id);
  if (!wo) return fail("Work order not found", 404);

  const from = wo.status as WoStatus;
  if (!canTransition(from, to as WoStatus)) {
    return fail(
      `Invalid transition ${WO_STATUS_LABELS[from]} → ${
        WO_STATUS_LABELS[to as WoStatus] ?? to
      }. Cannot skip a mandatory stage.`
    );
  }

  if (!canRoleTransition(session.role, from, to as WoStatus)) {
    const allowed = rolesForTransition(from, to as WoStatus)
      .map((r) => ROLE_LABELS[r])
      .join(" or ");
    return fail(
      `Your role (${ROLE_LABELS[session.role]}) can't move this job ${
        WO_STATUS_LABELS[from]
      } → ${WO_STATUS_LABELS[to as WoStatus]}.${
        allowed ? ` Allowed: ${allowed}.` : ""
      }`,
      403
    );
  }

  wo.status = to;
  wo.statusHistory.push({
    from,
    to,
    byName: session.name,
    byRole: session.role,
    at: new Date(),
    note,
  } as any);
  await wo.save();

  // Write WIP status back to Sales/CRM (FR-JB-6). On dispatch/close, realized
  // delivery date flows back too (FR-SH-3, AC-6).
  if (wo.salesOrder) {
    const soUpdate: Record<string, unknown> = { wipStatus: WO_STATUS_LABELS[to as WoStatus] };
    if (to === "Closed") {
      soUpdate.status = "Delivered";
      soUpdate.realizedDeliveryDate = new Date();
    }
    await SalesOrder.findByIdAndUpdate(wo.salesOrder, soUpdate);
  }

  return ok(wo);
});
