import { dbConnect } from "@/lib/mongoose";
import { ok, created, handle } from "@/lib/api";
import "@/models";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await dbConnect();
  const rows = await User.find({ active: true }).sort({ name: 1 }).lean();
  return ok(rows);
});

export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const row = await User.create(b);
  return created(row);
});
