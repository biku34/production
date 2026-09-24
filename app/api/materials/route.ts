import { dbConnect } from "@/lib/mongoose";
import { ok, created, handle } from "@/lib/api";
import "@/models";
import Material from "@/models/Material";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await dbConnect();
  const rows = await Material.find().sort({ name: 1 }).lean();
  return ok(rows);
});

export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const row = await Material.create(b);
  return created(row);
});
