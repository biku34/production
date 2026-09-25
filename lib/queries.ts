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
import { WO_STATUSES, deliveryFlag, ROLE_LABELS } from "@/lib/domain";
import { round } from "@/lib/production";
import { getSession } from "@/lib/auth-server";
import { ROLE_STATUS_SCOPE, ROLE_SCOPE_BLURB } from "@/lib/access";
import { attachHandlers } from "@/lib/board-data";

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
  safe(async () => {
    // Data-scoped to the caller's role (mirrors GET /api/work-orders).
    const session = await getSession();
    if (!session) return [];
    const scope = ROLE_STATUS_SCOPE[session.role];
    const filter = scope ? { status: { $in: scope } } : {};
    const wos = await WorkOrder.find(filter).sort({ createdAt: -1 }).lean();
    return plain(await attachHandlers(wos as any));
  });

export const getWorkOrderDetail = (id: string) =>
  safe(async () => {
    const session = await getSession();
    if (!session) return null;
    const wo = await WorkOrder.findById(id).lean<any>();
    if (!wo) return null;
    // A shop-floor role may only open a WO that has reached their stage.
    const scope = ROLE_STATUS_SCOPE[session.role];
    if (scope && !scope.includes(wo.status)) return null;
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

/**
 * Role-scoped dashboard summary (SRS §9). Everyone gets a dashboard, but it
 * only covers the work orders their role may see; a role-specific "spotlight"
 * block adds the metrics that matter to that role (QC grades, packed rolls,
 * machine load, material issues, or the full management view).
 */
export const getDashboard = () =>
  safe(async () => {
    const session = await getSession();
    if (!session) return null;
    const role = session.role;
    const scope = ROLE_STATUS_SCOPE[role];
    const woFilter = scope ? { status: { $in: scope } } : {};
    const wos = await WorkOrder.find(woFilter).sort({ updatedAt: -1 }).lean<any[]>();
    const ids = wos.map((w) => w._id);

    const byStatus: Record<string, number> = {};
    for (const s of WO_STATUSES) byStatus[s] = 0;
    let overdue = 0, today = 0, tomorrow = 0, onTrack = 0, meters = 0, active = 0;
    const prodMap = new Map<string, { count: number; meters: number }>();
    const custMap = new Map<string, number>();
    const prioMap = new Map<string, number>();
    for (const w of wos) {
      byStatus[w.status] = (byStatus[w.status] || 0) + 1;
      if (w.status !== "Closed") active++;
      meters += w.targetQty || 0;
      const flag = deliveryFlag(w.dueDate);
      if (w.status !== "Closed") {
        if (flag === "Overdue") overdue++;
        else if (flag === "Today") today++;
        else if (flag === "Tomorrow") tomorrow++;
        else onTrack++;
      }
      const pm = prodMap.get(w.productName) || { count: 0, meters: 0 };
      pm.count++; pm.meters += w.targetQty || 0; prodMap.set(w.productName, pm);
      custMap.set(w.customerRef, (custMap.get(w.customerRef) || 0) + 1);
      prioMap.set(w.priority, (prioMap.get(w.priority) || 0) + 1);
    }

    const byProduct = [...prodMap]
      .map(([name, v]) => ({ name, count: v.count, meters: v.meters }))
      .sort((a, b) => b.count - a.count).slice(0, 6);
    const byCustomer = [...custMap]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 6);
    const byPriority = [...prioMap].map(([priority, count]) => ({ priority, count }));
    const dueBuckets = [
      { bucket: "Overdue", count: overdue },
      { bucket: "Today", count: today },
      { bucket: "Tomorrow", count: tomorrow },
      { bucket: "Later", count: onTrack },
    ];

    const spotlight: Record<string, unknown> = {};

    if (role === "QCInspector") {
      const qc = await QcInspection.find({ workOrder: { $in: ids } }).lean<any[]>();
      const gradeMap = new Map<string, number>();
      const defMap = new Map<string, number>();
      let inspected = 0, rejected = 0;
      for (const q of qc) {
        gradeMap.set(q.grade, (gradeMap.get(q.grade) || 0) + 1);
        inspected += q.inspectedQty || 0; rejected += q.rejectQty || 0;
        for (const d of q.defects || [])
          defMap.set(d.reasonCode, (defMap.get(d.reasonCode) || 0) + (d.qty || 0));
      }
      spotlight.qc = {
        grades: [...gradeMap].map(([grade, count]) => ({ grade, count })),
        inspectedMeters: Math.round(inspected),
        rejectRate: inspected ? round((rejected / inspected) * 100, 1) : 0,
        topDefects: [...defMap].map(([reason, qty]) => ({ reason, qty }))
          .sort((a, b) => b.qty - a.qty).slice(0, 5),
      };
    } else if (role === "PackingDispatch") {
      const rolls = await Roll.find({ workOrder: { $in: ids } }).lean<any[]>();
      const gradeMap = new Map<string, { count: number; meters: number }>();
      let metersPacked = 0;
      for (const r of rolls) {
        const g = gradeMap.get(r.grade) || { count: 0, meters: 0 };
        g.count++; g.meters += r.lengthM || 0; gradeMap.set(r.grade, g);
        metersPacked += r.lengthM || 0;
      }
      spotlight.packing = {
        rolls: [...gradeMap].map(([grade, v]) => ({ grade, count: v.count, meters: Math.round(v.meters) })),
        totalRolls: rolls.length,
        metersPacked: Math.round(metersPacked),
        ready: byStatus["PackingDispatch"] || 0,
        dispatched: byStatus["Closed"] || 0,
      };
    } else if (role === "StageSupervisor" || role === "JobWorkCoordinator") {
      const entries = await StageEntry.find({ workOrder: { $in: ids } }).lean<any[]>();
      const machMap = new Map<string, { entries: number; meters: number }>();
      const stageLoss = new Map<string, { loss: number; cnt: number; flagged: number }>();
      for (const e of entries) {
        const key = e.machineName || "—";
        const m = machMap.get(key) || { entries: 0, meters: 0 };
        m.entries++; m.meters += e.qtyOut || 0; machMap.set(key, m);
        const sl = stageLoss.get(e.stage) || { loss: 0, cnt: 0, flagged: 0 };
        sl.loss += e.lossPct || 0; sl.cnt++; if (e.lossFlagged) sl.flagged++;
        stageLoss.set(e.stage, sl);
      }
      spotlight.supervisor = {
        machineLoad: [...machMap].map(([machine, v]) => ({ machine, entries: v.entries, meters: Math.round(v.meters) }))
          .sort((a, b) => b.entries - a.entries).slice(0, 8),
        lossByStage: [...stageLoss].map(([stage, v]) => ({ stage, avgLossPct: round(v.loss / v.cnt, 1), flagged: v.flagged })),
      };
      if (role === "JobWorkCoordinator") {
        const jw = await JobworkDispatch.find({ workOrder: { $in: ids } }).lean<any[]>();
        const venMap = new Map<string, number>();
        let out = 0, ret = 0;
        for (const j of jw) {
          if (j.status === "OutAtVendor") out++;
          if (j.returned) ret++;
          venMap.set(j.vendorName, (venMap.get(j.vendorName) || 0) + 1);
        }
        spotlight.jobwork = { total: jw.length, out, returned: ret, byVendor: [...venMap].map(([vendor, count]) => ({ vendor, count })) };
      }
    } else if (role === "StoreKeeper") {
      const issues = await MaterialIssue.find({ workOrder: { $in: ids } }).lean<any[]>();
      const matMap = new Map<string, number>();
      let totalIssued = 0;
      for (const m of issues) {
        matMap.set(m.materialName, (matMap.get(m.materialName) || 0) + (m.qtyIssued || 0));
        totalIssued += m.qtyIssued || 0;
      }
      spotlight.store = {
        byMaterial: [...matMap].map(([material, qty]) => ({ material, qty: Math.round(qty) }))
          .sort((a, b) => b.qty - a.qty).slice(0, 6),
        totalIssued: Math.round(totalIssued),
        issueCount: issues.length,
      };
    } else if (role === "ProductionPlanner" || role === "PlantAdmin") {
      const lossAgg = await StageEntry.aggregate([
        { $group: { _id: "$stage", avgLossPct: { $avg: "$lossPct" }, flagged: { $sum: { $cond: ["$lossFlagged", 1, 0] } }, entries: { $sum: 1 } } },
      ]);
      const rollAgg = await Roll.aggregate([
        { $group: { _id: "$grade", count: { $sum: 1 }, meters: { $sum: "$lengthM" } } },
      ]);
      spotlight.manager = {
        lossByStage: lossAgg.map((l) => ({ stage: l._id, avgLossPct: round(l.avgLossPct || 0, 1), flagged: l.flagged })),
        rollsByGrade: rollAgg.map((r) => ({ grade: r._id, count: r.count, meters: Math.round(r.meters) })),
      };
    }

    const recent = wos.slice(0, 6).map((w) => ({
      _id: String(w._id), woNo: w.woNo, status: w.status,
      customer: w.customerRef, product: w.productName, at: w.updatedAt,
    }));

    return plain({
      role,
      roleLabel: ROLE_LABELS[role],
      name: session.name,
      scopeBlurb: ROLE_SCOPE_BLURB[role],
      unrestricted: scope === null,
      totals: { inScope: wos.length, active, meters: Math.round(meters), overdue, today, tomorrow, onTrack, closed: byStatus["Closed"] || 0 },
      byStatus, byProduct, byCustomer, byPriority, dueBuckets,
      ...spotlight,
      recent,
    });
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
