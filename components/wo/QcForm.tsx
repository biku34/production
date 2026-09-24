"use client";

import { useState } from "react";
import { postJSON } from "@/lib/client";
import { Modal, Field } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { GRADES, STAGES, STAGE_LABELS } from "@/lib/domain";

interface Defect {
  reasonCode: string;
  qty: string;
}

const REASON_CODES = ["HOLE", "SHADE_VAR", "SLUB", "STAIN", "BARRE", "CREASE"];

export function QcForm({
  open,
  woId,
  lots,
  rolls,
  onClose,
  onDone,
}: {
  open: boolean;
  woId: string;
  lots: any[];
  rolls: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    inspectedQty: "",
    unit: "m",
    grade: "A",
    result: "Pass",
    rejectQty: "0",
    lotId: "",
    rollId: "",
    inspectorName: "QC Inspector",
    responsibleStage: "",
  });
  const [defects, setDefects] = useState<Defect[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const lot = lots.find((l) => l._id === f.lotId);
      const roll = rolls.find((r) => r._id === f.rollId);
      await postJSON("/api/qc", {
        woId,
        inspectedQty: Number(f.inspectedQty),
        unit: f.unit,
        grade: f.grade,
        result: f.result,
        rejectQty: Number(f.rejectQty || 0),
        lotId: f.lotId || undefined,
        lotNo: lot?.lotNo,
        rollId: f.rollId || undefined,
        rollNo: roll?.rollNo,
        inspectorName: f.inspectorName,
        responsibleStage: f.responsibleStage || undefined,
        defects: defects
          .filter((d) => d.reasonCode)
          .map((d) => ({ reasonCode: d.reasonCode, qty: Number(d.qty || 0) })),
      });
      onDone();
    } catch (e: any) {
      setErr(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="QC / Inspection Entry" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Roll (optional)">
            <select
              className="input"
              value={f.rollId}
              onChange={(e) => set("rollId", e.target.value)}
            >
              <option value="">—</option>
              {rolls.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.rollNo} · {r.lengthM}m
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Inspected qty">
            <input
              className="input"
              type="number"
              required
              value={f.inspectedQty}
              onChange={(e) => set("inspectedQty", e.target.value)}
            />
          </Field>
          <Field label="Grade">
            <select
              className="input"
              value={f.grade}
              onChange={(e) => set("grade", e.target.value)}
            >
              {GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Result">
            <select
              className="input"
              value={f.result}
              onChange={(e) => set("result", e.target.value)}
            >
              {["Pass", "Reject", "Hold"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Reject qty">
            <input
              className="input"
              type="number"
              value={f.rejectQty}
              onChange={(e) => set("rejectQty", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Responsible stage (for reject analysis — FR-QC-4)">
          <select
            className="input"
            value={f.responsibleStage}
            onChange={(e) => set("responsibleStage", e.target.value)}
          >
            <option value="">—</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="label !mb-0">Defects</span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() =>
                setDefects((d) => [...d, { reasonCode: "", qty: "" }])
              }
            >
              + Add defect
            </button>
          </div>
          {defects.map((d, i) => (
            <div key={i} className="flex gap-2">
              <select
                className="input"
                value={d.reasonCode}
                onChange={(e) =>
                  setDefects((ds) =>
                    ds.map((x, idx) =>
                      idx === i ? { ...x, reasonCode: e.target.value } : x
                    )
                  )
                }
              >
                <option value="">Reason…</option>
                {REASON_CODES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                className="input !w-28"
                type="number"
                placeholder="Qty"
                value={d.qty}
                onChange={(e) =>
                  setDefects((ds) =>
                    ds.map((x, idx) =>
                      idx === i ? { ...x, qty: e.target.value } : x
                    )
                  )
                }
              />
              <button
                type="button"
                className="btn-ghost btn-sm !px-2"
                onClick={() =>
                  setDefects((ds) => ds.filter((_, idx) => idx !== i))
                }
                aria-label="Remove defect"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save inspection"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
