import { getWorkOrders } from "@/lib/queries";
import JobBoardClient, { type Wo } from "./JobBoardClient";

export const dynamic = "force-dynamic";

export default async function JobBoardPage() {
  const initial = (await getWorkOrders()) as Wo[] | null;
  return <JobBoardClient initial={initial} />;
}
