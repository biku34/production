import { getWipReport, getJobwork } from "@/lib/queries";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [initialWip, initialJobwork] = await Promise.all([
    getWipReport(),
    getJobwork(),
  ]);
  return (
    <ReportsClient
      initialWip={initialWip}
      initialJobwork={initialJobwork as any[] | null}
    />
  );
}
