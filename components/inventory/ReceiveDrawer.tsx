"use client";
// components/inventory/ReceiveDrawer.tsx

import React, { useState } from "react";
import { X, Package } from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  baseUnit: string;
  packEnabled: boolean;
  packSize: number | null;
  packLabel: string | null;
}

interface ReceiveRow {
  itemId: string;
  packs: number;
  extraUnits: number;
  baseUnits: number; // for non-pack items
}

interface ReceiveDrawerProps {
  warehouseLocationId: string;
  items: CatalogItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReceiveDrawer({
  warehouseLocationId,
  items,
  onClose,
  onSuccess,
}: ReceiveDrawerProps) {
  const [rows, setRows] = useState<ReceiveRow[]>([
    { itemId: "", packs: 0, extraUnits: 0, baseUnits: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () =>
    setRows((r) => [
      ...r,
      { itemId: "", packs: 0, extraUnits: 0, baseUnits: 0 },
    ]);

  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<ReceiveRow>) =>
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );

  const getItem = (id: string) => items.find((it) => it.id === id);

  const handleSubmit = async () => {
    const valid = rows.filter((r) => r.itemId);
    if (!valid.length) {
      setError("Select at least one item.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const row of valid) {
        const item = getItem(row.itemId);
        if (!item) continue;
        const body: any = {
          type: "RECEIVE",
          itemId: row.itemId,
          toLocationId: warehouseLocationId,
        };
        if (item.packEnabled && item.packSize) {
          body.packs = row.packs;
          body.extraUnits = row.extraUnits;
        } else {
          body.baseUnits = row.baseUnits;
        }
        const res = await fetch("/api/inventory/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Failed");
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
    <div className="fixed m-0 inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#1868A5]" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Receive Stock</h2>
              <p className="text-xs text-slate-500">Add to Warehouse</p>
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
                  onChange={(e) => updateRow(i, { itemId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1868A5]/30"
                >
                  <option value="">Select item…</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.category})
                    </option>
                  ))}
                </select>

                {item?.packEnabled && item.packSize ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        Packs ({item.packLabel ?? "pack"})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={row.packs}
                        onChange={(e) =>
                          updateRow(i, { packs: Math.max(0, +e.target.value) })
                        }
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        1 pack = {item.packSize} {item.baseUnit}s
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        Extra {item.baseUnit}s
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={row.extraUnits}
                        onChange={(e) =>
                          updateRow(i, {
                            extraUnits: Math.max(0, +e.target.value),
                          })
                        }
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                ) : item ? (
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Units ({item.baseUnit})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={row.baseUnits}
                      onChange={(e) =>
                        updateRow(i, {
                          baseUnits: Math.max(0, +e.target.value),
                        })
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                    />
                  </div>
                ) : null}

                {item && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    Will add{" "}
                    <strong>
                      {item.packEnabled && item.packSize
                        ? row.packs * item.packSize + row.extraUnits
                        : row.baseUnits}{" "}
                      {item.baseUnit}s
                    </strong>{" "}
                    to warehouse
                  </p>
                )}
              </div>
            );
          })}

          <button
            onClick={addRow}
            className="w-full py-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#1868A5] hover:text-[#1868A5] text-sm transition-colors"
          >
            + Add Another Item
          </button>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
              {error}
            </p>
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
            className="flex-1 py-2.5 rounded-xl bg-[#1868A5] text-white text-sm font-semibold hover:bg-[#1456890] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Confirm Receive"}
          </button>
        </div>
      </div>
    </div>
  );
}
