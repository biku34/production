"use client";

import { useMemo, useState } from "react";
import { getJSON, postJSON } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { Modal, Field } from "@/components/ui";
import { UNITS, STAGE_LABELS, type Stage } from "@/lib/domain";

export function StageEntryForm({
  open,
  woId,
  routing,
  onClose,
  onDone,
}: {
  open: boolean;
  woId: string;
  routing: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const machines = useAsync<any[]>(() => getJSON("/api/machines"), []);
  const stages = (routing || []).filter(
    (r) => !["MaterialIssue", "Packing"].includes(r.stage)
  );
  const [f, setF] = useState({
    stage: "",
    qtyIn: "",
    inUnit: "kg",
    qtyOut: "",
    outUnit: "m",
    wastageQty: "0",
    conversionOutPerIn: "",
    machineId: "",
    shift: "A",
    operatorName: "",
    partial: false,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  const routeStage = useMemo(
    () => stages.find((r) => r.stage === f.stage),
    [f.stage, stages]
  );

  // Live loss preview
  const preview = useMemo(() => {
    const qi = Number(f.qtyIn),
      qo = Number(f.qtyOut),
      w = Number(f.wastageQty || 0);
    if (!qi || !qo) return null;
    if (f.inUnit === f.outUnit) {
      const loss = Math.max(0, qi - qo - w);
      return { pct: (loss / qi) * 100, std: routeStage?.stdLossPct ?? 0 };
    }
    const conv = Number(f.conversionOutPerIn) || (qo + w) / qi;
    const expected = qi * conv;
    const missing = Math.max(0, expected - qo);
    return {
      pct: expected ? (missing / expected) * 100 : 0,
      std: routeStage?.stdLossPct ?? 0,
    };
  }, [f, routeStage]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await postJSON("/api/stage-entries", {
        woId,
        stage: f.stage,
        qtyIn: Number(f.qtyIn),
        inUnit: f.inUnit,
        qtyOut: Number(f.qtyOut),
        outUnit: f.outUnit,
        wastageQty: Number(f.wastageQty || 0),
        conversionOutPerIn: f.conversionOutPerIn
          ? Number(f.conversionOutPerIn)
          : undefined,
        machineId: f.machineId || undefined,
        shift: f.shift,
        operatorName: f.operatorName,
        partial: f.partial,
        stdLossPct: routeStage?.stdLossPct,
      });
      onDone();
    } catch (e: any) {
      setErr(e?.message);
    } finally {
      setBusy(false);
    }
  }

  const stageMachines = (machines.data || []).filter(
    (m) => !f.stage || !m.stage || m.stage === f.stage
  );

  return (
    <Modal open={open} title="Stage Production Entry" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage">
            <select
              className="input"
              required
              value={f.stage}
              onChange={(e) => {
                const r = stages.find((x) => x.stage === e.target.value);
                set("stage", e.target.value);
                if (r) {
                  set("inUnit", r.inUnit);
                  set("outUnit", r.outUnit);
                }
              }}
            >
              <option value="">Select stage…</option>
              {stages.map((r) => (
                <option key={r.stage} value={r.stage}>
                  {STAGE_LABELS[r.stage as Stage]} ({r.inUnit}→{r.outUnit}, std{" "}
                  {r.stdLossPct}%)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Machine / line">
            <select
              className="input"
              value={f.machineId}
              onChange={(e) => set("machineId", e.target.value)}
            >
              <option value="">—</option>
              {stageMachines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Field label="Qty in">
            <input
              className="input"
              type="number"
              required
              value={f.qtyIn}
              onChange={(e) => set("qtyIn", e.target.value)}
            />
          </Field>
          <Field label="In unit">
            <select
              className="input"
              value={f.inUnit}
              onChange={(e) => set("inUnit", e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Qty out (good)">
            <input
              className="input"
              type="number"
              required
              value={f.qtyOut}
              onChange={(e) => set("qtyOut", e.target.value)}
            />
          </Field>
          <Field label="Out unit">
            <select
              className="input"
              value={f.outUnit}
              onChange={(e) => set("outUnit", e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Wastage qty">
            <input
              className="input"
              type="number"
              value={f.wastageQty}
              onChange={(e) => set("wastageQty", e.target.value)}
            />
          </Field>
          {f.inUnit !== f.outUnit && (
            <Field label={`Conv (${f.outUnit}/${f.inUnit})`}>
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="auto"
                value={f.conversionOutPerIn}
                onChange={(e) => set("conversionOutPerIn", e.target.value)}
              />
            </Field>
          )}
          <Field label="Shift">
            <select
              className="input"
              value={f.shift}
              onChange={(e) => set("shift", e.target.value)}
            >
              {["A", "B", "C", "General"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <Field label="Operator">
            <input
              className="input"
              value={f.operatorName}
              onChange={(e) => set("operatorName", e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={f.partial}
              onChange={(e) => set("partial", e.target.checked)}
            />
            Partial completion (multi-shift)
          </label>
        </div>

        {preview && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              preview.pct > preview.std
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            Derived loss ≈ <b>{preview.pct.toFixed(1)}%</b> vs standard{" "}
            {preview.std}%{" "}
            {preview.pct > preview.std ? "→ will be flagged ⚠" : "→ within limit"}
          </div>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save stage entry"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
