import { getWorkOrders } from "@/lib/queries";
import WorkOrdersClient, { type Wo } from "./WorkOrdersClient";

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage() {
  const initial = (await getWorkOrders()) as Wo[] | null;
  return <WorkOrdersClient initial={initial} />;
}
