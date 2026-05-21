/* app/(dashboard)/inventory/deboard/page.tsx */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, Plane } from "lucide-react";
import FlightSelector from "@/components/inventory/flight-selector";
import { displayWarehouseStock } from "@/lib/inventory/conversion";

interface Aircraft {
  id: string;
  tailNumber: string;
  label: string;
  locations: { id: string; name: string }[];
}

interface Balance {
  itemId: string;
  onHandBaseUnits: number;
  item: {
    id: string;
    name: string;
    category: string;
    baseUnit: string;
    packEnabled: boolean;
    packSize: number | null;
    packLabel: string | null;
    reorderThresholdType: string;
    reorderThresholdValue: number;
  };
}

export default function DeboardPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selectedTail, setSelectedTail] = useState<string>("");
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const [deboardBalances, setDeboardBalances] = useState<Balance[]>([]);
  const [warehouseBalances, setWarehouseBalances] = useState<Balance[]>([]);
  const [warehouseLocId, setWarehouseLocId] = useState<string>("");
  const [deboardLocId, setDeboardLocId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Load aircraft and warehouse location once
  useEffect(() => {
    fetch("/api/inventory/aircraft")
      .then((r) => r.json())
      .then((data: Aircraft[]) => {
        setAircraft(data);
        if (data.length > 0) setSelectedTail(data[0].tailNumber);
      })
      .catch(console.error);

    fetch("/api/inventory/locations?type=WAREHOUSE")
      .then((r) => r.json())
      .then((locs: any[]) => {
        if (locs[0]) setWarehouseLocId(locs[0].id);
      })
      .catch(console.error);
  }, []);

  const load = useCallback(async () => {
    if (!selectedTail) return;
    setLoading(true);
    try {
      const ac = aircraft.find((a) => a.tailNumber === selectedTail);
      const dbLocId = ac?.locations[0]?.id;
      if (!dbLocId) {
        setDeboardBalances([]);
        setLoading(false);
        return;
      }
      setDeboardLocId(dbLocId);

      const [dbRes, wbRes] = await Promise.all([
        fetch(`/api/inventory/balances?locationId=${dbLocId}`),
        warehouseLocId
          ? fetch(`/api/inventory/balances?locationId=${warehouseLocId}`)
          : Promise.resolve({ json: async () => [] }),
      ]);

      const dbBals: Balance[] = await dbRes.json();
      const whBals: Balance[] = await (wbRes as Response).json();
      setDeboardBalances(dbBals);
      setWarehouseBalances(whBals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTail, aircraft, warehouseLocId]);

  useEffect(() => {
    load();
  }, [load]);

  const wbMap = Object.fromEntries(
    warehouseBalances.map((b) => [b.itemId, b.onHandBaseUnits]),
  );

  const filtered = deboardBalances.filter(
    (b) =>
      !search ||
      b.item.name.toLowerCase().includes(search.toLowerCase()) ||
      b.item.category?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Deboard Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Items removed from aircraft after flight
          </p>
        </div>
        <div className="flex gap-2">
          {/* Flight selector (sets tail by flight choice) */}
          <div className="min-w-[320px]">
            <FlightSelector
              selectedFlightId={selectedFlightId}
              onSelectFlight={(f) => {
                if (f?.tailNumber) setSelectedTail(f.tailNumber);
                if (f?.id) setSelectedFlightId(f.id);
              }}
            />
          </div>
          <button
            onClick={load}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Deboard
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((b) => (
                  <tr
                    key={b.itemId}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {b.item.name}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {b.item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`font-semibold ${b.onHandBaseUnits === 0 ? "text-slate-400" : "text-slate-900"}`}
                      >
                        {b.onHandBaseUnits} {b.item.baseUnit}s
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-500">
                      {displayWarehouseStock(wbMap[b.itemId] ?? 0, b.item)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No deboard items for {selectedTail}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
