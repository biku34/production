import { getProducts } from "@/lib/queries";
import MastersClient from "./MastersClient";

export const dynamic = "force-dynamic";

export default async function MastersPage() {
  const initialProducts = (await getProducts()) as any[] | null;
  return <MastersClient initialProducts={initialProducts} />;
}
