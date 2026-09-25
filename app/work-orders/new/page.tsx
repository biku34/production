import { getProducts, getSalesOrders } from "@/lib/queries";
import NewWorkOrderClient from "./NewWorkOrderClient";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage() {
  const [initialProducts, initialOrders] = await Promise.all([
    getProducts(),
    getSalesOrders(),
  ]);
  return (
    <NewWorkOrderClient
      initialProducts={initialProducts as any[] | null}
      initialOrders={initialOrders as any[] | null}
    />
  );
}
