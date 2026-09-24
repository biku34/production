"use client";

import { useState } from "react";
import { getJSON, postJSON } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { Modal, Field } from "@/components/ui";
import { UNITS, STAGE_LABELS, type Stage } from "@/lib/domain";

export function JobworkForm({
  open,
  woId,
  routing,
  lots,
  onClose,
  onDone,
}: {
  open: boolean;
  woId: string;
  routing: any[];
  lots: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const vendors = useAsync<any[]>(() => getJSON("/api/vendors"), []);
  // Prefer stages the routing marks as job-work, but allow any.
  const jwStages = (routing || []).filter((r) => r.mode === "JobWork");
  const stageOptions = (jwStages.length ? jwStages : routing || []).filter(
    (r) => !["MaterialIssue", "Packing"].includes(r.stage)
  );

  const [f, setF] = useState({
    stage: "",
    vendorId: "",
    lotId: "",
    qtySent: "",
    unit: "m",
    expectedReturn: "",
    rate: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const lot = lots.find((l) => l._id === f.lotId);
      await postJSON("/api/jobwork", {
        woId,
        stage: f.stage,
        vendorId: f.vendorId,
        lotId: f.lotId || undefined,
        lotNo: lot?.lotNo,
        qtySent: Number(f.qtySent),
        unit: f.unit,
        expectedReturn: f.expectedReturn || undefined,
        rate: Number(f.rate || 0),
      });
      onDone();
    } catch (e: any) {
      setErr(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Job-work Dispatch" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage">
            <select
              className="input"
              required
              value={f.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              <option value="">Select stage…</option>
              {stageOptions.map((r) => (
                <option key={r.stage} value={r.stage}>
                  {STAGE_LABELS[r.stage as Stage]}
                  {r.mode === "JobWork" ? " (job-work)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <select
              className="input"
              required
              value={f.vendorId}
              onChange={(e) => set("vendorId", e.target.value)}
            >
              <option value="">Select vendor…</option>
              {(vendors.data || []).map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Lot (optional)">
          <select
            className="input"
            value={f.lotId}
            onChange={(e) => set("lotId", e.target.value)}
          >
            <option value="">—</option>
            {lots.map((l) => (
              <option key={l._id} value={l._id}>
                {l.lotNo} · {l.shadeCode}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Qty sent">
            <input
              className="input"
              type="number"
              required
              value={f.qtySent}
              onChange={(e) => set("qtySent", e.target.value)}
            />
          </Field>
          <Field label="Unit">
            <select
              className="input"
              value={f.unit}
              onChange={(e) => set("unit", e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Expected return">
            <input
              className="input"
              type="date"
              value={f.expectedReturn}
              onChange={(e) => set("expectedReturn", e.target.value)}
            />
          </Field>
          <Field label="Rate">
            <input
              className="input"
              type="number"
              value={f.rate}
              onChange={(e) => set("rate", e.target.value)}
            />
          </Field>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Dispatching…" : "Dispatch to vendor"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
