import { dbConnect } from "@/lib/mongoose";
import "@/models";
import WorkOrder from "@/models/WorkOrder";
import StageEntry from "@/models/StageEntry";
import MaterialIssue from "@/models/MaterialIssue";
import Lot from "@/models/Lot";
import Roll from "@/models/Roll";
import QcInspection from "@/models/QcInspection";
import JobworkDispatch from "@/models/JobworkDispatch";
import Product from "@/models/Product";
import Material from "@/models/Material";
import Machine from "@/models/Machine";
import Vendor from "@/models/Vendor";
import User from "@/models/User";
import SalesOrder from "@/models/SalesOrder";
import { WO_STATUSES, deliveryFlag } from "@/lib/domain";

/**
 * Server-side data functions used by Server Components so the page renders with
 * data already present (no client loading spinner). They mirror the API GET
 * routes but skip the HTTP hop. Results are plain JSON (ObjectId/Date → string)
 * so they can be passed to Client Components as props.
 */

function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Any of these returning null lets the client show its normal error/seed UI. */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    await dbConnect();
    return await fn();
  } catch (e) {
    console.error("[query error]", (e as any)?.message || e);
    return null;
  }
}

export const getWorkOrders = () =>
  safe(async () => plain(await WorkOrder.find().sort({ createdAt: -1 }).lean()));

export const getWorkOrderDetail = (id: string) =>
  safe(async () => {
    const wo = await WorkOrder.findById(id).lean<any>();
    if (!wo) return null;
    const [stageEntries, issues, lots, rolls, qc, jobwork] = await Promise.all([
      StageEntry.find({ workOrder: id }).sort({ date: 1 }).lean(),
      MaterialIssue.find({ workOrder: id }).sort({ at: 1 }).lean(),
      Lot.find({ workOrder: id }).sort({ createdAt: 1 }).lean(),
      Roll.find({ workOrder: id }).sort({ createdAt: 1 }).lean(),
      QcInspection.find({ workOrder: id }).sort({ at: 1 }).lean(),
      JobworkDispatch.find({ workOrder: id }).sort({ dispatchedAt: 1 }).lean(),
    ]);
    return plain({ workOrder: wo, stageEntries, issues, lots, rolls, qc, jobwork });
  });

export const getWipReport = () =>
  safe(async () => {
    const wos = await WorkOrder.find().lean<any[]>();
    const byStatus: Record<string, number> = {};
    for (const s of WO_STATUSES) byStatus[s] = 0;
    let overdue = 0,
      today = 0,
      tomorrow = 0,
      closed = 0;
    for (const wo of wos) {
      byStatus[wo.status] = (byStatus[wo.status] || 0) + 1;
      if (wo.status === "Closed") closed++;
      const flag = deliveryFlag(wo.dueDate);
      if (wo.status !== "Closed") {
        if (flag === "Overdue") overdue++;
        else if (flag === "Today") today++;
        else if (flag === "Tomorrow") tomorrow++;
      }
    }
    const lossByStage = await StageEntry.aggregate([
      {
        $group: {
          _id: "$stage",
          totalLossQty: { $sum: "$lossQty" },
          avgLossPct: { $avg: "$lossPct" },
          flagged: { $sum: { $cond: ["$lossFlagged", 1, 0] } },
          entries: { $sum: 1 },
        },
      },
    ]);
    const rollsByGrade = await Roll.aggregate([
      { $group: { _id: "$grade", count: { $sum: 1 }, meters: { $sum: "$lengthM" } } },
    ]);
    return plain({
      totalWo: wos.length,
      byStatus,
      delivery: { overdue, today, tomorrow, closed },
      lossByStage,
      rollsByGrade,
    });
  });

export const getProducts = () =>
  safe(async () =>
    plain(
      await Product.find().sort({ name: 1 }).populate("boms.lines.material").lean()
    )
  );

export const getMaterials = () =>
  safe(async () => plain(await Material.find().sort({ name: 1 }).lean()));

export const getVendors = () =>
  safe(async () => plain(await Vendor.find().sort({ name: 1 }).lean()));

export const getUsers = () =>
  safe(async () =>
    plain(await User.find({ active: true }).sort({ name: 1 }).lean())
  );

export const getSalesOrders = () =>
  safe(async () =>
    plain(
      await SalesOrder.find()
        .sort({ createdAt: -1 })
        .populate("product", "name sku")
        .lean()
    )
  );

export const getJobwork = () =>
  safe(async () =>
    plain(await JobworkDispatch.find().sort({ dispatchedAt: -1 }).lean())
  );

export const getMachinesWithQueue = () =>
  safe(async () => {
    const rows = await Machine.find().sort({ code: 1 }).lean<any[]>();
    const queues = await StageEntry.aggregate([
      { $group: { _id: "$machine", entries: { $sum: 1 }, lastDate: { $max: "$date" } } },
    ]);
    const byId = new Map(queues.map((q) => [String(q._id), q]));
    return plain(
      rows.map((m) => ({ ...m, queue: byId.get(String(m._id)) || { entries: 0 } }))
    );
  });
