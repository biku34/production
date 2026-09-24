import { dbConnect } from "@/lib/mongoose";
import { ok, created, handle } from "@/lib/api";
import "@/models";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await dbConnect();
  const rows = await Product.find().sort({ name: 1 }).populate("boms.lines.material").lean();
  return ok(rows);
});

export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const row = await Product.create(b);
  return created(row);
});
