import { getMachinesWithQueue } from "@/lib/queries";
import MachinesClient from "./MachinesClient";

export const dynamic = "force-dynamic";

export default async function MachinesPage() {
  const initial = (await getMachinesWithQueue()) as any[] | null;
  return <MachinesClient initial={initial} />;
}
