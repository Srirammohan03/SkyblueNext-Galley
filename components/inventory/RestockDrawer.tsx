"use client";
// components/inventory/RestockDrawer.tsx

import React, { useState, useEffect } from "react";
import { X, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { displayWarehouseStock } from "@/lib/inventory/conversion";

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  baseUnit: string;
  packEnabled: boolean;
  packSize: number | null;
  packLabel: string | null;
  reorderThresholdType: string;
  reorderThresholdValue: number;
}

interface Balance {
  itemId: string;
  onHandBaseUnits: number;
}

interface RestockDrawerProps {
  warehouseLocationId: string;
  onboardLocationId: string;
  tailNumber: string;
  eligibleItems: CatalogItem[];
  warehouseBalances: Balance[];
  onboardBalances: Balance[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function RestockDrawer({
  warehouseLocationId,
  onboardLocationId,
  tailNumber,
  eligibleItems,
  warehouseBalances,
  onboardBalances,
  onClose,
  onSuccess,
}: RestockDrawerProps) {
  const [rows, setRows] = useState<{ itemId: string; units: number }[]>([
    { itemId: "", units: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWarehouseBalance = (itemId: string) =>
    warehouseBalances.find((b) => b.itemId === itemId)?.onHandBaseUnits ?? 0;

  const getOnboardBalance = (itemId: string) =>
    onboardBalances.find((b) => b.itemId === itemId)?.onHandBaseUnits ?? 0;

  const getItem = (id: string) => eligibleItems.find((it) => it.id === id);

  const addRow = () =>
    setRows((r) => [...r, { itemId: "", units: 0 }]);

  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<{ itemId: string; units: number }>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const handleSubmit = async () => {
    const valid = rows.filter((r) => r.itemId && r.units > 0);
    if (!valid.length) {
      setError("Add at least one item with units > 0.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const row of valid) {
        const whBal = getWarehouseBalance(row.itemId);
        if (whBal < row.units) {
          throw new Error(
            `Insufficient warehouse stock for "${getItem(row.itemId)?.name}": have ${whBal}, need ${row.units}`,
          );
        }
        const res = await fetch("/api/inventory/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "TRANSFER",
            itemId: row.itemId,
            fromLocationId: warehouseLocationId,
            toLocationId: onboardLocationId,
            baseUnits: row.units,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Transfer failed");
        }
      }
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Restock Onboard</h2>
              <p className="text-xs text-slate-500">
                Warehouse → {tailNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {rows.map((row, i) => {
            const item = getItem(row.itemId);
            const whBal = item ? getWarehouseBalance(item.id) : 0;
            const obBal = item ? getOnboardBalance(item.id) : 0;
            const insufficient = item && row.units > whBal;

            return (
              <div
                key={i}
                className="p-4 border border-slate-200 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Item {i + 1}
                  </span>
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <select
                  value={row.itemId}
                  onChange={(e) =>
                    updateRow(i, { itemId: e.target.value, units: 0 })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/30"
                >
                  <option value="">Select eligible item…</option>
                  {eligibleItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.category})
                    </option>
                  ))}
                </select>

                {item && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                      <span>
                        Warehouse:{" "}
                        <strong>
                          {displayWarehouseStock(whBal, item as any)}
                        </strong>
                      </span>
                      <span>
                        Onboard:{" "}
                        <strong>
                          {obBal} {item.baseUnit}s
                        </strong>
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        Units to transfer ({item.baseUnit}s)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={whBal}
                        value={row.units}
                        onChange={(e) =>
                          updateRow(i, { units: Math.max(0, +e.target.value) })
                        }
                        className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition-colors ${
                          insufficient
                            ? "border-red-400 bg-red-50"
                            : "border-slate-200"
                        }`}
                      />
                      {insufficient && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Exceeds warehouse stock ({whBal})
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <button
            onClick={addRow}
            className="w-full py-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 text-sm transition-colors"
          >
            + Add Another Item
          </button>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Transferring…" : "Confirm Restock"}
          </button>
        </div>
      </div>
    </div>
  );
}
