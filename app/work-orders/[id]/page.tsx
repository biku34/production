import { getWorkOrderDetail } from "@/lib/queries";
import WorkOrderDetailClient from "./WorkOrderDetailClient";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initial = await getWorkOrderDetail(id);
  return <WorkOrderDetailClient id={id} initial={initial} />;
}
