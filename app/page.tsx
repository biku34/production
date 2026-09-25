import { getDashboard } from "@/lib/queries";
import DashboardClient, { type Dashboard } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const initial = (await getDashboard()) as Dashboard | null;
  return <DashboardClient initial={initial} />;
}
