import { NextResponse } from "next/server";

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
      return await fn(req, ctx);
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
