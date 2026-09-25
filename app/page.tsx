import { getWipReport } from "@/lib/queries";
import DashboardClient, { type Wip } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const initial = (await getWipReport()) as Wip | null;
  return <DashboardClient initial={initial} />;
}
