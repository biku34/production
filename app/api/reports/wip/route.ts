import { dbConnect } from "@/lib/mongoose";
import { ok, handle } from "@/lib/api";
import "@/models";
import WorkOrder from "@/models/WorkOrder";
import StageEntry from "@/models/StageEntry";
import Roll from "@/models/Roll";
import { WO_STATUSES, deliveryFlag } from "@/lib/domain";

export const dynamic = "force-dynamic";

// GET /api/reports/wip -> Job Board / WIP summary (SRS §9), delivery performance
export const GET = handle(async () => {
  await dbConnect();
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

  // Wastage/loss rollup per stage (variance vs standard — SRS §9, FR-WR-2).
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

  const rollAgg = await Roll.aggregate([
    { $group: { _id: "$grade", count: { $sum: 1 }, meters: { $sum: "$lengthM" } } },
  ]);

  return ok({
    totalWo: wos.length,
    byStatus,
    delivery: { overdue, today, tomorrow, closed },
    lossByStage,
    rollsByGrade: rollAgg,
  });
});
