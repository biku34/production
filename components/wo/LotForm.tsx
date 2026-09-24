"use client";

import { useState } from "react";
import { postJSON } from "@/lib/client";
import { Modal, Field } from "@/components/ui";
import { UNITS } from "@/lib/domain";

export function LotForm({
  open,
  woId,
  onClose,
  onDone,
}: {
  open: boolean;
  woId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    shadeCode: "",
    qty: "",
    unit: "m",
    swatchRef: "",
    approvedSampleId: "",
    stage: "Dyeing",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await postJSON("/api/lots", { woId, ...f, qty: Number(f.qty || 0) });
      onDone();
    } catch (e: any) {
      setErr(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Create Dye/Print Lot" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shade code">
            <input
              className="input"
              required
              placeholder="e.g. NB-2231"
              value={f.shadeCode}
              onChange={(e) => set("shadeCode", e.target.value)}
            />
          </Field>
          <Field label="Stage">
            <select
              className="input"
              value={f.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              <option>Dyeing</option>
              <option>Printing</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lot quantity">
            <input
              className="input"
              type="number"
              value={f.qty}
              onChange={(e) => set("qty", e.target.value)}
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Swatch ref (placeholder)">
            <input
              className="input"
              placeholder="swatch/navy.png"
              value={f.swatchRef}
              onChange={(e) => set("swatchRef", e.target.value)}
            />
          </Field>
          <Field label="Approved sample / lab-dip">
            <input
              className="input"
              placeholder="LABDIP-0091"
              value={f.approvedSampleId}
              onChange={(e) => set("approvedSampleId", e.target.value)}
            />
          </Field>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Create lot"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
