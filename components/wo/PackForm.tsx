"use client";

import { useState } from "react";
import { postJSON } from "@/lib/client";
import { Modal, Field } from "@/components/ui";
import { GRADES } from "@/lib/domain";

interface RollRow {
  lengthM: string;
  grade: string;
}

export function PackForm({
  open,
  woId,
  lots,
  onClose,
  onDone,
}: {
  open: boolean;
  woId: string;
  lots: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [lotId, setLotId] = useState("");
  const [rows, setRows] = useState<RollRow[]>([{ lengthM: "", grade: "A" }]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setRow = (i: number, k: keyof RollRow, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { lengthM: "", grade: "A" }]);
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const rolls = rows
        .filter((r) => Number(r.lengthM) > 0)
        .map((r) => ({ lengthM: Number(r.lengthM), grade: r.grade }));
      if (!rolls.length) throw new Error("Add at least one roll length");
      await postJSON("/api/rolls", { woId, lotId: lotId || undefined, rolls });
      onDone();
    } catch (e: any) {
      setErr(e?.message);
    } finally {
      setBusy(false);
    }
  }

  const total = rows.reduce((a, r) => a + (Number(r.lengthM) || 0), 0);

  return (
    <Modal open={open} title="Pack Rolls (variable length)" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Lot (for shade/grade tagging)">
          <select
            className="input"
            value={lotId}
            onChange={(e) => setLotId(e.target.value)}
          >
            <option value="">— no lot —</option>
            {lots.map((l) => (
              <option key={l._id} value={l._id}>
                {l.lotNo} · {l.shadeCode}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="label !mb-0">Rolls</span>
            <button type="button" className="btn-ghost btn-sm" onClick={addRow}>
              + Add roll
            </button>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="input"
                type="number"
                placeholder="Length (m)"
                value={r.lengthM}
                onChange={(e) => setRow(i, "lengthM", e.target.value)}
              />
              <select
                className="input !w-28"
                value={r.grade}
                onChange={(e) => setRow(i, "grade", e.target.value)}
              >
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => removeRow(i)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="text-xs text-ink-500">
            {rows.length} rolls · {total.toFixed(0)} m — writes finished goods to
            Inventory with labels (FR-PK-2,3).
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Packing…" : "Pack & label rolls"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
