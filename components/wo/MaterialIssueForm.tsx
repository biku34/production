"use client";

import { useState } from "react";
import { getJSON, postJSON } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { Modal, Field } from "@/components/ui";
import { UNITS } from "@/lib/domain";

export function MaterialIssueForm({
  open,
  woId,
  onClose,
  onDone,
}: {
  open: boolean;
  woId: string;
  product?: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const materials = useAsync<any[]>(() => getJSON("/api/materials"), []);
  const [f, setF] = useState({
    materialId: "",
    plannedQty: "",
    qtyIssued: "",
    unit: "kg",
    issuedByName: "Store Keeper",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await postJSON("/api/material-issues", {
        woId,
        materialId: f.materialId,
        plannedQty: Number(f.plannedQty || 0),
        qtyIssued: Number(f.qtyIssued),
        unit: f.unit,
        issuedByName: f.issuedByName,
      });
      onDone();
    } catch (e: any) {
      setErr(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Issue Material" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Material">
          <select
            className="input"
            required
            value={f.materialId}
            onChange={(e) => {
              const m = materials.data?.find((x) => x._id === e.target.value);
              set("materialId", e.target.value);
              if (m) set("unit", m.unit);
            }}
          >
            <option value="">Select material…</option>
            {(materials.data || []).map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} ({m.category}) · stock {m.stockQty} {m.unit}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Planned (BOM)">
            <input
              className="input"
              type="number"
              value={f.plannedQty}
              onChange={(e) => set("plannedQty", e.target.value)}
            />
          </Field>
          <Field label="Issued qty">
            <input
              className="input"
              type="number"
              required
              value={f.qtyIssued}
              onChange={(e) => set("qtyIssued", e.target.value)}
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
        <Field label="Issued by">
          <input
            className="input"
            value={f.issuedByName}
            onChange={(e) => set("issuedByName", e.target.value)}
          />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Issue & generate slip"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
