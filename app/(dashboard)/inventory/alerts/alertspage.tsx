"use client";
// app/(dashboard)/inventory/alerts/page.tsx

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Download,
  RefreshCw,
  Package,
} from "lucide-react";
import {
  displayWarehouseStock,
  type CatalogItemConfig,
} from "@/lib/inventory/conversion";
import { getThresholdBaseUnits } from "@/lib/inventory/threshold";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import { useSearchParams } from "next/navigation";
interface Alert {
  id: string;
  itemId: string;
  locationId: string;
  severity: string;
  onHandBaseUnits: number;
  createdAt: string;
  acknowledgedAt: string | null;
  item: CatalogItemConfig & {
    id: string;
    name: string;
    category: string;
    reorderThresholdType: string;
    reorderThresholdValue: number;
  };
  location: { id: string; name: string; type: string };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const searchParams = useSearchParams();
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
      const res = await fetch("/api/inventory/alerts");
      const data: Alert[] = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);

    try {
      await fetch("/api/inventory/alerts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertId }),
      });

      // reload alerts
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setAcknowledging(null);
    }
  };

  const filtered =
    activeCategory === "All"
      ? alerts
      : alerts.filter((a) => a.item.category === activeCategory);

  // Sort by coverage (lowest first = most urgent)
  const sorted = [...filtered].sort(
    (a, b) =>
      a.onHandBaseUnits / Math.max(1, getThresholdBaseUnits(a.item as any)) -
      b.onHandBaseUnits / Math.max(1, getThresholdBaseUnits(b.item as any)),
  );

  const csvData = sorted.map((a) => ({
    Item: a.item.name,
    Category: a.item.category,
    "On Hand": displayWarehouseStock(
      a.onHandBaseUnits,
      a.item as CatalogItemConfig,
    ),
    "On Hand (units)": a.onHandBaseUnits,
    Threshold: "10 units",
    Location: a.location.name,
    "Alert Since": new Date(a.createdAt).toLocaleDateString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-red-500" />
            Low Stock Alerts
            {alerts.length > 0 && (
              <span className="ml-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-sm font-bold">
                {alerts.length}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Items below their reorder threshold
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            data={csvData}
            filename="low-stock-alerts.csv"
            label="Export Reorder List"
          />
          <button
            onClick={load}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              activeCategory === cat
                ? "bg-red-500 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          Loading alerts…
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-900 font-semibold">All stocked up!</p>
          <p className="text-slate-500 text-sm mt-1">
            No low-stock alerts at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((alert) => {
            const thresholdBu = getThresholdBaseUnits(alert.item as any);
            const coverage =
              thresholdBu > 0 ? alert.onHandBaseUnits / thresholdBu : 0;
            const pct = Math.min(100, Math.round(coverage * 100));

            return (
              <div
                key={alert.id}
                className="bg-white rounded-2xl border border-red-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">
                        {alert.item.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {alert.item.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      <span className="font-semibold text-red-600">
                        {displayWarehouseStock(
                          alert.onHandBaseUnits,
                          alert.item as CatalogItemConfig,
                        )}
                      </span>{" "}
                      on hand · Threshold: <strong>10 units</strong>
                    </p>
                    {/* Coverage bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-red-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{pct}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <a
                    href="/inventory?tab=catalog&receive=true"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1868A5] text-white text-xs font-semibold hover:bg-[#155a8a] transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Receive Stock
                  </a>
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={acknowledging === alert.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {acknowledging === alert.id ? "…" : "Acknowledge"}
                  </button>
                  {alert.acknowledgedAt && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">
                      Acknowledged
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
