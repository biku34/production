import { getWorkOrders } from "@/lib/queries";
import CockpitClient from "./CockpitClient";
import { type JobWo } from "../board-utils";

export const dynamic = "force-dynamic";

export default async function CockpitPage() {
  const initial = (await getWorkOrders()) as JobWo[] | null;
  return <CockpitClient initial={initial} />;
}
