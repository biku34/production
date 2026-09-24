import { dbConnect } from "@/lib/mongoose";
import { ok, created, handle } from "@/lib/api";
import "@/models";
import SalesOrder from "@/models/SalesOrder";
import { nextId } from "@/models/Counter";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await dbConnect();
  const rows = await SalesOrder.find()
    .sort({ createdAt: -1 })
    .populate("product", "name sku")
    .lean();
  return ok(rows);
});

export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const orderNo = b.orderNo || (await nextId("SO"));
  const row = await SalesOrder.create({ ...b, orderNo });
  return created(row);
});
