import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import { getSession } from "@/lib/auth-server";
import "@/models"; // register all schemas
import WorkOrder from "@/models/WorkOrder";
import SalesOrder from "@/models/SalesOrder";
import { createWorkOrder } from "@/lib/production";
import { STAGE_TO_STATUS, type Stage } from "@/lib/domain";
import { ROLE_STATUS_SCOPE, canCreateWorkOrder, assignedOwnerFor } from "@/lib/access";
import { attachHandlers } from "@/lib/board-data";

export const dynamic = "force-dynamic";

// GET /api/work-orders?status=&stage=&customer=&q=
// Data-scoped to the caller's role: a shop-floor role only sees the work
// orders that have reached their stage (SRS §4.4 FR-JB-3, §2.3).
export const GET = handle(async (req) => {
  const session = await getSession();
  if (!session) return fail("Not authenticated", 401);

  await dbConnect();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const stage = url.searchParams.get("stage") as Stage | null;
  const customer = url.searchParams.get("customer");
  const q = url.searchParams.get("q");

  const filter: Record<string, unknown> = {};

  // Role scope is the hard boundary — applied first, before any query params.
  const scope = ROLE_STATUS_SCOPE[session.role];
  if (scope !== null) filter.status = { $in: scope };

  // Assigned-owner scope: a planner/manager only sees WOs assigned to them.
  const ownerName = assignedOwnerFor(session.role, session.name);
  if (ownerName) filter.assignedName = ownerName;

  // A specific status/stage filter may only narrow within the role's scope.
  const inScope = (s: string) => scope === null || scope.includes(s as any);
  if (status && inScope(status)) filter.status = status;
  if (stage && STAGE_TO_STATUS[stage] && inScope(STAGE_TO_STATUS[stage]))
    filter.status = STAGE_TO_STATUS[stage];

  if (customer) filter.customerRef = new RegExp(customer, "i");
  if (q)
    filter.$or = [
      { woNo: new RegExp(q, "i") },
      { productName: new RegExp(q, "i") },
      { customerRef: new RegExp(q, "i") },
    ];

  const wos = await WorkOrder.find(filter).sort({ createdAt: -1 }).lean();
  return ok(await attachHandlers(wos as any));
});

// POST /api/work-orders  { productId, targetQty, ... } | { salesOrderId }
export const POST = handle(async (req) => {
  const session = await getSession();
  if (!session) return fail("Not authenticated", 401);
  if (!canCreateWorkOrder(session.role))
    return fail("Only a Production Planner / Manager can create work orders", 403);

  await dbConnect();
  const body = await req.json();

  // Create from an accepted sales order (copies specs — AC-1).
  if (body.salesOrderId && !body.productId) {
    const so = await SalesOrder.findById(body.salesOrderId).lean<any>();
    if (!so) return fail("Sales order not found", 404);
    const wo = await createWorkOrder({
      productId: String(so.product),
      targetQty: body.targetQty ?? so.qty,
      unit: body.unit ?? so.unit,
      dueDate: body.dueDate ?? so.dueDate,
      priority: body.priority,
      salesOrderId: String(so._id),
      customerRef: so.customer,
      assignedName: body.assignedName,
    });
    await SalesOrder.findByIdAndUpdate(so._id, {
      status: "InProduction",
      wipStatus: "Created",
    });
    return created(wo);
  }

  if (!body.productId) return fail("productId or salesOrderId is required");
  if (!body.targetQty || body.targetQty <= 0)
    return fail("targetQty must be > 0");

  const wo = await createWorkOrder({
    productId: body.productId,
    targetQty: body.targetQty,
    unit: body.unit,
    dueDate: body.dueDate,
    priority: body.priority,
    salesOrderId: body.salesOrderId ?? null,
    customerRef: body.customerRef,
    assignedName: body.assignedName,
    overrideReason: body.overrideReason,
  });
  return created(wo);
});
