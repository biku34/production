"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { getJSON, postJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import {
  StatusBadge,
  DeliveryBadge,
  PriorityBadge,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useRole } from "@/components/RoleContext";
import {
  WO_TRANSITIONS,
  WO_STATUS_LABELS,
  STAGE_LABELS,
  type WoStatus,
} from "@/lib/domain";
import { StageEntryForm } from "@/components/wo/StageEntryForm";
import { MaterialIssueForm } from "@/components/wo/MaterialIssueForm";
import { LotForm } from "@/components/wo/LotForm";
import { PackForm } from "@/components/wo/PackForm";
import { QcForm } from "@/components/wo/QcForm";
import { JobworkForm } from "@/components/wo/JobworkForm";

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
  const { data, error, loading, reload } = useAsync<any>(
    () => getJSON(`/api/work-orders/${id}`),
    [id]
  );
  const [modal, setModal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function transition(to: WoStatus) {
    setBusy(true);
    try {
      await postJSON(`/api/work-orders/${id}/transition`, { to, byName: role });
      await reload();
    } catch (e: any) {
      alert(e?.message);
    } finally {
      setBusy(false);
    }
  }

  const wo = data?.workOrder;
  const done = () => {
    setModal(null);
    reload();
  };

  return (
    <div className="space-y-5">
      <DataGate loading={loading} error={error} onReload={reload}>
        {wo && (
          <>
            {/* Header */}
            <div className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{wo.woNo}</h1>
                    <StatusBadge status={wo.status} />
                    <PriorityBadge priority={wo.priority} />
                    <DeliveryBadge dueDate={wo.dueDate} />
                  </div>
                  <div className="mt-1 text-sm text-ink-700">
                    {wo.productName}{" "}
                    <span className="text-ink-400">({wo.sku})</span>
                  </div>
                  <div className="text-sm text-ink-500">
                    {wo.customerRef} · Target {fmtNum(wo.targetQty)} {wo.unit} ·
                    Due {fmtDate(wo.dueDate)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-ink-500">Advance status</div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {WO_TRANSITIONS[wo.status as WoStatus].length === 0 && (
                      <span className="badge bg-emerald-100 text-emerald-700">
                        Lifecycle complete
                      </span>
                    )}
                    {WO_TRANSITIONS[wo.status as WoStatus].map((to) => (
                      <button
                        key={to}
                        className="btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => transition(to)}
                      >
                        <Icon name="chevronRight" size={14} />
                        {WO_STATUS_LABELS[to]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Specs snapshot + routing */}
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-ink-500 mb-2">
                    Specs snapshot
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <Spec k="GSM" v={wo.specs?.gsm} />
                    <Spec k="Width" v={wo.specs?.widthInch && `${wo.specs.widthInch}"`} />
                    <Spec k="Composition" v={wo.specs?.composition} />
                    <Spec k="Construction" v={wo.specs?.construction} />
                    <Spec k="Colour" v={wo.specs?.color} />
                    <Spec k="Finish" v={wo.specs?.finish} />
                    <Spec k="BOM ver" v={wo.bomVersion} />
                  </dl>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-ink-500 mb-2">
                    Process routing
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {(wo.routing || []).map((r: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        <span
                          className={`badge ${
                            r.mode === "JobWork"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-ink-100 text-ink-700"
                          }`}
                          title={`${r.inUnit}→${r.outUnit}, std loss ${r.stdLossPct}%${
                            r.mode === "JobWork" ? " · job-work" : ""
                          }`}
                        >
                          {STAGE_LABELS[r.stage as keyof typeof STAGE_LABELS]}
                        </span>
                        {i < wo.routing.length - 1 && (
                          <Icon name="chevronRight" size={13} className="text-ink-300" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap gap-2">
              {[
                { k: "issue", label: "Material Issue" },
                { k: "stage", label: "Stage Entry" },
                { k: "lot", label: "Lot / Shade" },
                { k: "qc", label: "QC / Inspection" },
                { k: "pack", label: "Pack Rolls" },
                { k: "jobwork", label: "Job-work Dispatch" },
              ].map((a) => (
                <button
                  key={a.k}
                  className="btn-ghost btn-sm"
                  onClick={() => setModal(a.k)}
                >
                  <Icon name="plus" size={14} className="text-ink-400" />
                  {a.label}
                </button>
              ))}
            </div>

            {/* Panels */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Stage entries */}
              <Panel title="Stage Entries — qty in/out & loss">
                {data.stageEntries.length === 0 ? (
                  <EmptyState text="No stage entries yet." />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Stage</th>
                        <th className="th text-right">In</th>
                        <th className="th text-right">Out</th>
                        <th className="th text-right">Loss</th>
                        <th className="th">Machine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stageEntries.map((s: any) => (
                        <tr key={s._id}>
                          <td className="td">
                            {STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS]}
                          </td>
                          <td className="td text-right">
                            {fmtNum(s.qtyIn, 0)} {s.inUnit}
                          </td>
                          <td className="td text-right">
                            {fmtNum(s.qtyOut, 0)} {s.outUnit}
                          </td>
                          <td
                            className={`td text-right ${
                              s.lossFlagged ? "text-red-600 font-semibold" : ""
                            }`}
                            title={s.lossFlagged ? "Loss beyond routing standard %" : ""}
                          >
                            <span className="inline-flex items-center justify-end gap-1">
                              {s.lossPct?.toFixed(1)}%
                              {s.lossFlagged && <Icon name="warning" size={13} />}
                            </span>
                          </td>
                          <td className="td text-xs">{s.machineName || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              {/* Material issues */}
              <Panel title="Material Issues — planned vs actual">
                {data.issues.length === 0 ? (
                  <EmptyState text="No materials issued yet." />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Material</th>
                        <th className="th text-right">Planned</th>
                        <th className="th text-right">Issued</th>
                        <th className="th">Slip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.issues.map((m: any) => (
                        <tr key={m._id}>
                          <td className="td">{m.materialName}</td>
                          <td className="td text-right">
                            {fmtNum(m.plannedQty, 0)} {m.unit}
                          </td>
                          <td
                            className={`td text-right ${
                              m.qtyIssued > m.plannedQty && m.plannedQty
                                ? "text-amber-600"
                                : ""
                            }`}
                          >
                            {fmtNum(m.qtyIssued, 0)} {m.unit}
                          </td>
                          <td className="td text-xs">{m.issueSlipNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              {/* Lots */}
              <Panel title="Lots & Shades">
                {data.lots.length === 0 ? (
                  <EmptyState text="No dye/print lots yet." />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Lot</th>
                        <th className="th">Shade</th>
                        <th className="th text-right">Qty</th>
                        <th className="th">Approved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lots.map((l: any) => (
                        <tr key={l._id}>
                          <td className="td font-medium">{l.lotNo}</td>
                          <td className="td">
                            <span className="badge bg-indigo-100 text-indigo-700">
                              {l.shadeCode}
                            </span>
                          </td>
                          <td className="td text-right">
                            {fmtNum(l.qty, 0)} {l.unit}
                          </td>
                          <td className="td text-xs">
                            {l.approvedSampleId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              {/* QC */}
              <Panel title="QC / Inspection & Grading">
                {data.qc.length === 0 ? (
                  <EmptyState text="No inspections yet." />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Grade</th>
                        <th className="th">Result</th>
                        <th className="th text-right">Inspected</th>
                        <th className="th text-right">Reject</th>
                        <th className="th">Defects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.qc.map((q: any) => (
                        <tr key={q._id}>
                          <td className="td font-semibold">{q.grade}</td>
                          <td className="td">{q.result}</td>
                          <td className="td text-right">
                            {fmtNum(q.inspectedQty, 0)} {q.unit}
                          </td>
                          <td className="td text-right text-red-600">
                            {fmtNum(q.rejectQty, 0)}
                          </td>
                          <td className="td text-xs">
                            {(q.defects || [])
                              .map((d: any) => `${d.reasonCode}(${d.qty})`)
                              .join(", ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              {/* Rolls / packing */}
              <Panel title="Finished Rolls (packing)">
                {data.rolls.length === 0 ? (
                  <EmptyState text="No rolls packed yet." />
                ) : (
                  <>
                    <div className="mb-2 text-xs text-ink-500">
                      {data.rolls.length} rolls ·{" "}
                      {fmtNum(
                        data.rolls.reduce(
                          (a: number, r: any) => a + (r.lengthM || 0),
                          0
                        ),
                        0
                      )}{" "}
                      m total
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="th">Roll</th>
                          <th className="th">Lot / Shade</th>
                          <th className="th text-right">Length</th>
                          <th className="th">Grade</th>
                          <th className="th">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rolls.map((r: any) => (
                          <tr key={r._id}>
                            <td className="td font-mono text-xs">{r.rollNo}</td>
                            <td className="td text-xs">
                              {r.lotNo || "—"}
                              {r.shadeCode ? ` · ${r.shadeCode}` : ""}
                            </td>
                            <td className="td text-right">
                              {fmtNum(r.lengthM, 0)} m
                            </td>
                            <td className="td">{r.grade}</td>
                            <td className="td text-xs">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </Panel>

              {/* Job-work */}
              <Panel title="Job-work Dispatch / Return">
                {data.jobwork.length === 0 ? (
                  <EmptyState text="No outsourced dispatches." />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Vendor</th>
                        <th className="th">Stage</th>
                        <th className="th text-right">Sent</th>
                        <th className="th text-right">Returned</th>
                        <th className="th">Status</th>
                        <th className="th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.jobwork.map((j: any) => (
                        <tr key={j._id}>
                          <td className="td">{j.vendorName}</td>
                          <td className="td text-xs">
                            {STAGE_LABELS[j.stage as keyof typeof STAGE_LABELS]}
                          </td>
                          <td className="td text-right">
                            {fmtNum(j.qtySent, 0)} {j.unit}
                          </td>
                          <td className="td text-right">
                            {j.returned ? `${fmtNum(j.qtyReturned, 0)}` : "—"}
                            {j.shortageQty ? (
                              <span className="text-red-600 text-xs">
                                {" "}
                                (-{fmtNum(j.shortageQty, 0)})
                              </span>
                            ) : null}
                          </td>
                          <td className="td">
                            <span
                              className={`badge ${
                                j.status === "OutAtVendor"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {j.status}
                            </span>
                          </td>
                          <td className="td">
                            {!j.returned && (
                              <ReturnButton id={j._id} onDone={reload} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>
            </div>

            {/* Status history */}
            <Panel title="Status History (audit trail)">
              <ol className="relative border-l border-ink-200 ml-2">
                {(wo.statusHistory || []).map((h: any, i: number) => (
                  <li key={i} className="ml-4 mb-3">
                    <div className="absolute w-2 h-2 bg-brand-500 rounded-full -left-1 mt-1.5" />
                    <div className="text-sm">
                      {h.from ? `${WO_STATUS_LABELS[h.from as WoStatus]} → ` : ""}
                      <b>{WO_STATUS_LABELS[h.to as WoStatus] || h.to}</b>
                    </div>
                    <div className="text-xs text-ink-500">
                      {h.byName} · {fmtDate(h.at)}
                      {h.note ? ` · ${h.note}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            {/* Modals */}
            <MaterialIssueForm
              open={modal === "issue"}
              woId={id}
              product={wo}
              onClose={() => setModal(null)}
              onDone={done}
            />
            <StageEntryForm
              open={modal === "stage"}
              woId={id}
              routing={wo.routing}
              onClose={() => setModal(null)}
              onDone={done}
            />
            <LotForm
              open={modal === "lot"}
              woId={id}
              onClose={() => setModal(null)}
              onDone={done}
            />
            <QcForm
              open={modal === "qc"}
              woId={id}
              lots={data.lots}
              rolls={data.rolls}
              onClose={() => setModal(null)}
              onDone={done}
            />
            <PackForm
              open={modal === "pack"}
              woId={id}
              lots={data.lots}
              onClose={() => setModal(null)}
              onDone={done}
            />
            <JobworkForm
              open={modal === "jobwork"}
              woId={id}
              routing={wo.routing}
              lots={data.lots}
              onClose={() => setModal(null)}
              onDone={done}
            />
          </>
        )}
      </DataGate>
    </div>
  );
}

function Spec({ k, v }: { k: string; v?: any }) {
  return (
    <>
      <dt className="text-ink-500">{k}</dt>
      <dd className="text-ink-900">{v ?? "—"}</dd>
    </>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-2 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function ReturnButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        const qty = prompt("Quantity returned?");
        if (qty == null) return;
        setBusy(true);
        try {
          await postJSON(`/api/jobwork/${id}/return`, {
            qtyReturned: Number(qty),
            quality: "Good",
          });
          onDone();
        } catch (e: any) {
          alert(e?.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      Receive
    </button>
  );
}
