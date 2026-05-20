"use client";
// components/inventory/ConsumptionModal.tsx

import React, { useState, useEffect } from "react";
import { X, Flame } from "lucide-react";

interface OnboardItem {
  itemId: string;
  name: string;
  baseUnit: string;
  onHandBaseUnits: number;
}

interface ConsumptionModalProps {
  flightId: string;
  tailNumber: string;
  locationId: string;
  onboardItems: OnboardItem[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ConsumptionModal({
  flightId,
  tailNumber,
  locationId,
  onboardItems,
  onClose,
  onSaved,
}: ConsumptionModalProps) {
  const [consumptions, setConsumptions] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init to 0 for every item
  useEffect(() => {
    const init: Record<string, number> = {};
    onboardItems.forEach((it) => {
      init[it.itemId] = 0;
    });
    setConsumptions(init);
  }, [onboardItems]);

  const handleSubmit = async () => {
    const items = Object.entries(consumptions)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, baseUnitsConsumed]) => ({ itemId, baseUnitsConsumed }));

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightId, locationId, items }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save");
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Record Consumption</h2>
              <p className="text-xs text-slate-500">
                Flight {flightId.slice(0, 8)} · {tailNumber}
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

        <p className="px-5 pt-4 text-sm text-slate-500">
          Enter how many units were consumed during the flight. Leave at{" "}
          <strong>0</strong> if not consumed.
        </p>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {onboardItems.length === 0 && (
            <p className="text-center text-slate-400 py-8">
              No onboard grocery items for this aircraft.
            </p>
          )}

          {onboardItems.map((it) => (
            <div
              key={it.itemId}
              className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">
                  {it.name}
                </p>
                <p className="text-xs text-slate-400">
                  Available: {it.onHandBaseUnits} {it.baseUnit}s
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    setConsumptions((c) => ({
                      ...c,
                      [it.itemId]: Math.max(0, (c[it.itemId] ?? 0) - 1),
                    }))
                  }
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={it.onHandBaseUnits}
                  value={consumptions[it.itemId] ?? 0}
                  onChange={(e) =>
                    setConsumptions((c) => ({
                      ...c,
                      [it.itemId]: Math.max(
                        0,
                        Math.min(it.onHandBaseUnits, +e.target.value),
                      ),
                    }))
                  }
                  className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm font-semibold outline-none"
                />
                <button
                  onClick={() =>
                    setConsumptions((c) => ({
                      ...c,
                      [it.itemId]: Math.min(
                        it.onHandBaseUnits,
                        (c[it.itemId] ?? 0) + 1,
                      ),
                    }))
                  }
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600"
                >
                  +
                </button>
                <span className="text-xs text-slate-400 w-10">
                  {it.baseUnit}s
                </span>
              </div>
            </div>
          ))}

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
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Consumption"}
          </button>
        </div>
      </div>
    </div>
  );
}
