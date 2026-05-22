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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Deboard Inventory
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Items removed from aircraft after flight
          </p>
        </div>

        {/* Mobile-Responsive Actions */}
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          {/* Flight selector (sets tail by flight choice) */}
          <div className="flex-1 w-full sm:w-auto sm:min-w-[320px]">
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
            className="flex-shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 sm:p-3"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
        <div className="border-b border-slate-100 p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-xs outline-none transition-all focus:ring-2 focus:ring-emerald-400/20 sm:text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400 sm:p-12">
            Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Added min-w-[600px] to enforce horizontal scroll on tiny screens instead of squishing */}
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider text-slate-500 uppercase sm:px-5 sm:py-4 sm:text-xs">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider text-slate-500 uppercase sm:px-5 sm:py-4 sm:text-xs">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider text-slate-500 uppercase sm:px-5 sm:py-4 sm:text-xs">
                    Deboard
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider text-slate-500 uppercase sm:px-5 sm:py-4 sm:text-xs">
                    Warehouse
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((b) => (
                  <tr
                    key={b.itemId}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 sm:px-5 sm:py-4 sm:text-base">
                      {b.item.name}
                    </td>
                    <td className="px-4 py-3 sm:px-5 sm:py-4">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 sm:px-3 sm:text-xs">
                        {b.item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5 sm:py-4">
                      <span
                        className={`text-sm font-semibold sm:text-base ${b.onHandBaseUnits === 0 ? "text-slate-400" : "text-slate-900"}`}
                      >
                        {b.onHandBaseUnits} {b.item.baseUnit}s
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">
                      {displayWarehouseStock(wbMap[b.itemId] ?? 0, b.item)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-sm text-slate-400 sm:py-12"
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
