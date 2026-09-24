"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getJSON, postJSON } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { Field } from "@/components/ui";
import { PRIORITIES, UNITS } from "@/lib/domain";

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"order" | "stock">("order");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const products = useAsync<any[]>(() => getJSON("/api/products"), [], {
    cacheKey: "/api/products",
  });
  const orders = useAsync<any[]>(() => getJSON("/api/sales-orders"), [], {
    cacheKey: "/api/sales-orders",
  });

  const [form, setForm] = useState({
    salesOrderId: "",
    productId: "",
    targetQty: "",
    unit: "m",
    priority: "Normal",
    dueDate: "",
    customerRef: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body: any =
        mode === "order"
          ? {
              salesOrderId: form.salesOrderId,
              priority: form.priority,
              assignedName: "Production Planner",
            }
          : {
              productId: form.productId,
              targetQty: Number(form.targetQty),
              unit: form.unit,
              priority: form.priority,
              dueDate: form.dueDate || undefined,
              customerRef: form.customerRef || "Stock",
              assignedName: "Production Planner",
            };
      const wo = await postJSON("/api/work-orders", body);
      router.push(`/work-orders/${wo._id}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to create work order");
      setSaving(false);
    }
  }

  const loading = products.loading || orders.loading;
  const error = products.error || orders.error;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          New Work Order
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          From an accepted sales order (specs are snapshotted — AC-1) or as a
          stock build.
        </p>
      </div>

      <DataGate
        loading={loading}
        error={error}
        onReload={() => {
          products.reload();
          orders.reload();
        }}
      >
        <div className="card p-5">
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              className={mode === "order" ? "btn-primary" : "btn-ghost"}
              onClick={() => setMode("order")}
            >
              From Sales Order
            </button>
            <button
              type="button"
              className={mode === "stock" ? "btn-primary" : "btn-ghost"}
              onClick={() => setMode("stock")}
            >
              Stock Build (manual)
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "order" ? (
              <Field label="Sales Order">
                <select
                  className="input"
                  required
                  value={form.salesOrderId}
                  onChange={(e) => set("salesOrderId", e.target.value)}
                >
                  <option value="">Select an accepted order…</option>
                  {(orders.data || [])
                    .filter((o) => o.status !== "Cancelled")
                    .map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.orderNo} — {o.customer} · {o.product?.name} ·{" "}
                        {o.qty} {o.unit}
                      </option>
                    ))}
                </select>
              </Field>
            ) : (
              <>
                <Field label="Product">
                  <select
                    className="input"
                    required
                    value={form.productId}
                    onChange={(e) => set("productId", e.target.value)}
                  >
                    <option value="">Select a product…</option>
                    {(products.data || []).map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Target quantity">
                    <input
                      className="input"
                      type="number"
                      min={1}
                      required
                      value={form.targetQty}
                      onChange={(e) => set("targetQty", e.target.value)}
                    />
                  </Field>
                  <Field label="Unit">
                    <select
                      className="input"
                      value={form.unit}
                      onChange={(e) => set("unit", e.target.value)}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Due date">
                    <input
                      className="input"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => set("dueDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Customer ref (optional)">
                    <input
                      className="input"
                      placeholder="Stock"
                      value={form.customerRef}
                      onChange={(e) => set("customerRef", e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            <Field label="Priority">
              <select
                className="input"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>

            {err && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {err}
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn-primary" disabled={saving}>
                {saving ? "Creating…" : "Create Work Order"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => router.back()}
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-ink-500">
              BOM and routing are auto-attached from the product master on
              creation (FR-WO-4).
            </p>
          </form>
        </div>
      </DataGate>
    </div>
  );
}
