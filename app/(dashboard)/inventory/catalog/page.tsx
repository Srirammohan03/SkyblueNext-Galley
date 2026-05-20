"use client";
// app/(dashboard)/inventory/catalog/page.tsx

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  AlertTriangle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  displayWarehouseStock,
  displayOnboardStock,
  type CatalogItemConfig,
} from "@/lib/inventory/conversion";
import { isLowStock } from "@/lib/inventory/threshold";

interface Aircraft {
  id: string;
  tailNumber: string;
  label: string;
  locations: { id: string }[];
}

interface CatalogItemRow {
  id: string;
  name: string;
  category: string;
  baseUnit: string;
  packEnabled: boolean;
  packSize: number | null;
  packLabel: string | null;
  reorderThresholdType: string;
  reorderThresholdValue: number;
  isAvailable: boolean;
}

interface Balance {
  itemId: string;
  onHandBaseUnits: number;
}

interface Eligibility {
  itemId: string;
  eligible: boolean;
}

export default function InventoryCatalogPage() {
  const [items, setItems] = useState<CatalogItemRow[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selectedTail, setSelectedTail] = useState("");
  const [warehouseLocId, setWarehouseLocId] = useState("");
  const [onboardLocId, setOnboardLocId] = useState("");
  const [warehouseBals, setWarehouseBals] = useState<Balance[]>([]);
  const [onboardBals, setOnboardBals] = useState<Balance[]>([]);
  const [eligMap, setEligMap] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [togglingElig, setTogglingElig] = useState<string | null>(null);

  const categories = [
    "All",
    "Alcohol",
    "Bakery",
    "Beverages",
    "Dairy",
    "Snacks",
    "Supplies",
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, acRes, locRes] = await Promise.all([
        fetch("/api/catalog?type=grocery"),
        fetch("/api/inventory/aircraft"),
        fetch("/api/inventory/locations?type=WAREHOUSE"),
      ]);
      const catItems: CatalogItemRow[] = await catRes.json();
      const acList: Aircraft[] = await acRes.json();
      const locs: any[] = await locRes.json();

      setItems(catItems);
      setAircraft(acList);
      const wlId = locs[0]?.id ?? "";
      setWarehouseLocId(wlId);

      if (acList.length > 0 && !selectedTail) {
        setSelectedTail(acList[0].tailNumber);
      }

      if (wlId) {
        const wbRes = await fetch(`/api/inventory/balances?locationId=${wlId}`);
        const wbData: any[] = await wbRes.json();
        setWarehouseBals(
          wbData.map((b) => ({
            itemId: b.itemId,
            onHandBaseUnits: b.onHandBaseUnits,
          })),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load onboard data when aircraft selection changes
  useEffect(() => {
    if (!selectedTail || aircraft.length === 0) return;
    const ac = aircraft.find((a) => a.tailNumber === selectedTail);
    const obId = ac?.locations[0]?.id ?? "";
    setOnboardLocId(obId);
    if (!obId) return;

    Promise.all([
      fetch(`/api/inventory/balances?locationId=${obId}`).then((r) => r.json()),
      fetch(`/api/inventory/eligibility?locationId=${obId}`).then((r) =>
        r.json(),
      ),
    ]).then(([bals, eligs]) => {
      setOnboardBals(
        (bals as any[]).map((b) => ({
          itemId: b.itemId,
          onHandBaseUnits: b.onHandBaseUnits,
        })),
      );
      const map: Record<string, boolean> = {};
      (eligs as Eligibility[]).forEach((e) => {
        map[e.itemId] = e.eligible;
      });
      setEligMap(map);
    });
  }, [selectedTail, aircraft]);

  useEffect(() => {
    load();
  }, [load]);

  const wbMap = Object.fromEntries(
    warehouseBals.map((b) => [b.itemId, b.onHandBaseUnits]),
  );
  const obMap = Object.fromEntries(
    onboardBals.map((b) => [b.itemId, b.onHandBaseUnits]),
  );

  const filtered = items.filter((it) => {
    const matchCat = activeCategory === "All" || it.category === activeCategory;
    const matchSearch =
      !search ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleToggleEligibility = async (itemId: string) => {
    if (!onboardLocId) return;
    const current = eligMap[itemId] ?? false;
    setTogglingElig(itemId);
    try {
      const res = await fetch("/api/inventory/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: onboardLocId,
          itemId,
          eligible: !current,
        }),
      });
      if (res.ok) {
        setEligMap((prev) => ({ ...prev, [itemId]: !current }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingElig(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Grocery Catalog</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} items · stock + eligibility overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* {aircraft.length > 0 && (
            <select
              value={selectedTail}
              onChange={(e) => setSelectedTail(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none bg-white"
            >
              {aircraft.map((a) => (
                <option key={a.id} value={a.tailNumber}>
                  {a.tailNumber}
                </option>
              ))}
            </select>
          )} */}
          <button
            onClick={load}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#1868A5]/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                  activeCategory === cat
                    ? "bg-[#1868A5] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
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
                    Warehouse
                  </th>

                  {/* <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Eligible
                  </th> */}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((it) => {
                  const whQty = wbMap[it.id] ?? 0;
                  const obQty = obMap[it.id] ?? 0;
                  const low = isLowStock(whQty, it as any);
                  const eligible = eligMap[it.id] ?? false;
                  const toggling = togglingElig === it.id;

                  return (
                    <tr
                      key={it.id}
                      className={`hover:bg-slate-50 transition-colors ${low ? "bg-red-50/20" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {low && (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          )}
                          <span className="font-medium text-slate-900">
                            {it.name}
                          </span>
                          {it.packEnabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold">
                              {it.packLabel ?? `${it.packSize}-pack`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                          {it.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`text-sm font-semibold ${low ? "text-red-600" : "text-slate-900"}`}
                        >
                          {displayWarehouseStock(
                            whQty,
                            it as CatalogItemConfig,
                          )}
                        </span>
                      </td>

                      {/* <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleToggleEligibility(it.id)}
                          disabled={toggling || !onboardLocId}
                          className="inline-flex items-center gap-1 text-xs font-medium disabled:opacity-50 transition-colors"
                          title={
                            eligible
                              ? "Click to remove eligibility"
                              : "Click to allow onboard"
                          }
                        >
                          {eligible ? (
                            <ToggleRight className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-300" />
                          )}
                          <span
                            className={
                              eligible ? "text-emerald-600" : "text-slate-400"
                            }
                          >
                            {eligible ? "Onboard" : "Off"}
                          </span>
                        </button>
                      </td> */}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No items found.
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
