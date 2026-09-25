import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export function ok(data: unknown, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function created(data: unknown) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Wrap a route handler so thrown errors become clean JSON (and DB errors are logged). */
export function handle(
  fn: (req: Request, ctx: any) => Promise<Response>
) {
  return async (req: Request, ctx: any) => {
    try {
      const res = await fn(req, ctx);
      // Any successful mutation invalidates the cached read queries (tag
      // "reads"), so the next server render pulls fresh data instead of waiting
      // out the TTL. GETs stay cached.
      if (res.ok && req.method !== "GET" && req.method !== "HEAD") {
        revalidateTag("reads");
      }
      return res;
    } catch (err: any) {
      console.error("[api error]", err?.message || err);
      const msg =
        err?.name === "ValidationError"
          ? Object.values(err.errors || {})
              .map((e: any) => e.message)
              .join(", ")
          : err?.message || "Internal error";
      return fail(msg, 500);
    }
  };
}
