import "@/models";
import StageEntry from "@/models/StageEntry";

/**
 * Attach "who is currently handling this WO" and "which stage it is currently
 * at" to a list of work orders, for the Job Board. Derived from the latest
 * stage entry per WO (the person who last physically worked the job). Falls
 * back to the WO's assigned planner / status when there are no entries yet.
 * One aggregation for the whole list — cheap.
 */
export async function attachHandlers<T extends { _id: any; assignedName?: string }>(
  wos: T[]
): Promise<(T & { assignedTo: string | null; currentStage: string | null })[]> {
  if (!wos.length) return wos as any;
  const ids = wos.map((w) => w._id);
  const latest = await StageEntry.aggregate([
    { $match: { workOrder: { $in: ids } } },
    { $sort: { date: 1, createdAt: 1 } },
    {
      $group: {
        _id: "$workOrder",
        operatorName: { $last: "$operatorName" },
        stage: { $last: "$stage" },
      },
    },
  ]);
  const byWo = new Map(latest.map((l) => [String(l._id), l]));
  return wos.map((w) => {
    const l = byWo.get(String(w._id));
    return {
      ...w,
      assignedTo: l?.operatorName || w.assignedName || null,
      currentStage: l?.stage || null,
    };
  });
}
