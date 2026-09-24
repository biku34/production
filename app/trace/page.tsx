"use client";

import { useState } from "react";
import Link from "next/link";
import { getJSON, fmtDate, fmtNum } from "@/lib/client";
import { STAGE_LABELS } from "@/lib/domain";

export default function TracePage() {
  const [rollNo, setRollNo] = useState("");
  const [trace, setTrace] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setTrace(null);
    try {
      const t = await getJSON(`/api/trace/${encodeURIComponent(rollNo.trim())}`);
      setTrace(t);
    } catch (e: any) {
      setErr(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Roll Traceability</h1>
        <p className="text-sm text-ink-500">
          From a finished roll, trace back through lot, shade, stages, materials
          and job-work vendors (AC-4). Try{" "}
          <span className="font-mono">ROLL-00001</span>.
        </p>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <input
          className="input !w-64"
          placeholder="Roll number, e.g. ROLL-00001"
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
        />
        <button className="btn-primary" disabled={busy || !rollNo.trim()}>
          {busy ? "Tracing…" : "Trace"}
        </button>
      </form>

      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {err}
        </div>
      )}

      {trace && (
        <div className="space-y-3">
          <TraceCard title={`Roll ${trace.roll.rollNo}`} tone="brand">
            <Row k="Length" v={`${fmtNum(trace.roll.lengthM, 0)} m`} />
            <Row k="Grade" v={trace.roll.grade} />
            <Row k="Status" v={trace.roll.status} />
          </TraceCard>

          {trace.lot && (
            <TraceCard title={`Lot ${trace.lot.lotNo}`}>
              <Row k="Shade" v={trace.lot.shadeCode} />
              <Row k="Approved sample" v={trace.lot.approvedSampleId || "—"} />
              <Row k="Qty" v={`${fmtNum(trace.lot.qty, 0)} ${trace.lot.unit}`} />
            </TraceCard>
          )}

          {trace.workOrder && (
            <TraceCard title={`Work Order ${trace.workOrder.woNo}`}>
              <Row k="Product" v={trace.workOrder.productName} />
              <Row k="Customer" v={trace.workOrder.customerRef} />
              <Row k="Due" v={fmtDate(trace.workOrder.dueDate)} />
              <Link
                href={`/work-orders/${trace.workOrder._id}`}
                className="text-sm text-brand-700 hover:underline"
              >
                Open work order →
              </Link>
            </TraceCard>
          )}

          <TraceCard title="Stages (in order)">
            {trace.stages.length === 0 ? (
              <p className="text-sm text-ink-500">No stage entries.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {trace.stages.map((s: any) => (
                  <li key={s._id} className="flex justify-between">
                    <span>
                      {STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS]}
                      {s.machineName ? ` · ${s.machineName}` : ""}
                    </span>
                    <span className="text-ink-500">
                      {fmtNum(s.qtyIn, 0)} {s.inUnit} → {fmtNum(s.qtyOut, 0)}{" "}
                      {s.outUnit} ({s.lossPct?.toFixed(1)}% loss)
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </TraceCard>

          <TraceCard title="Materials consumed">
            {trace.materials.length === 0 ? (
              <p className="text-sm text-ink-500">No material issues.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {trace.materials.map((m: any) => (
                  <li key={m._id} className="flex justify-between">
                    <span>{m.materialName}</span>
                    <span className="text-ink-500">
                      {fmtNum(m.qtyIssued, 0)} {m.unit} · {m.issueSlipNo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TraceCard>

          {trace.jobwork.length > 0 && (
            <TraceCard title="Job-work vendors">
              <ul className="space-y-1 text-sm">
                {trace.jobwork.map((j: any) => (
                  <li key={j._id} className="flex justify-between">
                    <span>
                      {j.vendorName} ·{" "}
                      {STAGE_LABELS[j.stage as keyof typeof STAGE_LABELS]}
                    </span>
                    <span className="text-ink-500">
                      sent {fmtNum(j.qtySent, 0)} {j.unit} · {j.status}
                    </span>
                  </li>
                ))}
              </ul>
            </TraceCard>
          )}
        </div>
      )}
    </div>
  );
}

function TraceCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "brand";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`card p-4 ${
        tone === "brand" ? "border-brand-500 ring-1 ring-brand-100" : ""
      }`}
    >
      <h3 className="font-semibold mb-2 text-sm">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
