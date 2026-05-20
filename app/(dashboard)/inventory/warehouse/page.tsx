"use client";
// app/(dashboard)/inventory/warehouse/page.tsx

import React, { useCallback, useEffect, useState } from "react";
import { Search, Package, AlertTriangle, RefreshCw } from "lucide-react";
import ReceiveDrawer from "@/components/inventory/ReceiveDrawer";
import {
  displayWarehouseStock,
  type CatalogItemConfig,
} from "@/lib/inventory/conversion";
import { isLowStock } from "@/lib/inventory/threshold";

interface Balance {
  id: string;
  locationId: string;
  itemId: string;
  onHandBaseUnits: number;
  item: CatalogItemConfig & {
    id: string;
    name: string;
    category: string;
    isAvailable: boolean;
    reorderThresholdType: string;
    reorderThresholdValue: number;
  };
  location: { id: string; name: string; type: string };
}

interface Location {
  id: string;
  name: string;
  type: string;
}

export default function WarehousePage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [warehouseLocation, setWarehouseLocation] = useState<Location | null>(
    null,
  );
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showReceive, setShowReceive] = useState(false);

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
      const [locRes, catRes] = await Promise.all([
        fetch("/api/inventory/locations?type=WAREHOUSE"),
        fetch("/api/catalog?type=grocery"),
      ]);
      const locs: Location[] = await locRes.json();
      const items = await catRes.json();
      setAllItems(items);

      const wl = locs[0] ?? null;
      setWarehouseLocation(wl);

      if (wl) {
        const balRes = await fetch(
          `/api/inventory/balances?locationId=${wl.id}`,
        );
        const bals: Balance[] = await balRes.json();
        setBalances(bals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const balanceMap: Record<string, Balance> = {};
  for (const b of balances) {
    balanceMap[b.itemId] = b;
  }

  const groceryItems = allItems.filter((it) => it.type === "grocery");

  const filtered = groceryItems.filter((it) => {
    const matchCat = activeCategory === "All" || it.category === activeCategory;
    const matchSearch =
      !search ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const alertCount = balances.filter((b) =>
    isLowStock(b.onHandBaseUnits, b.item as any),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Stock</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {warehouseLocation?.name ?? "Loading…"} · {filtered.length} items
            {alertCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {alertCount} low stock
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {warehouseLocation && (
            <button
              onClick={() => setShowReceive(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1868A5] text-white text-sm font-semibold hover:bg-[#155a8a] transition-colors"
            >
              <Package className="w-4 h-4" />
              Receive Stock
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
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

        {/* Table */}
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
                    On Hand
                  </th>

                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((it) => {
                  const bal = balanceMap[it.id];
                  const qty = bal?.onHandBaseUnits ?? 0;
                  const low = isLowStock(qty, it as any);
                  const displayStock = displayWarehouseStock(
                    qty,
                    it as CatalogItemConfig,
                  );

                  return (
                    <tr
                      key={it.id}
                      className={`hover:bg-slate-50 transition-colors ${low ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {low && (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <span className="font-medium text-slate-900">
                            {it.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {it.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`font-semibold ${low ? "text-red-600" : "text-slate-900"}`}
                        >
                          {displayStock}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {low ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            OK
                          </span>
                        )}
                      </td>
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

      {/* Receive Drawer */}
      {showReceive && warehouseLocation && (
        <ReceiveDrawer
          warehouseLocationId={warehouseLocation.id}
          items={allItems.filter((it) => it.type === "grocery")}
          onClose={() => setShowReceive(false)}
          onSuccess={() => {
            setShowReceive(false);
            load();
          }}
        />
      )}
    </div>
  );
}
