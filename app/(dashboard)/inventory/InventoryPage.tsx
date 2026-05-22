// app\(dashboard)\inventory\InventoryPage.tsx
"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Warehouse, ArrowRightLeft, Bell } from "lucide-react";
import InventoryCatalogPage from "./catalog/page";
import WarehousePage from "./warehouse/page";
import OnboardPage from "./onboard/page";
import AlertsPage from "./alerts/page";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
export default function InventoryPage() {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");

  const validTabs = ["catalog", "onboard", "deboard", "alerts"];

  const initialTab = validTabs.includes(tabParam || "")
    ? (tabParam as "catalog" | "onboard" | "alerts")
    : "catalog";

  const [activeTab, setActiveTab] = useState<"catalog" | "onboard" | "alerts">(
    initialTab,
  );
  const [alertCount, setAlertCount] = useState(0);
  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab && ["catalog", "onboard", "deboard", "alerts"].includes(tab)) {
      if (tab === "deboard") {
        setActiveTab("onboard");
      } else {
        setActiveTab(tab as "catalog" | "onboard" | "alerts");
      }
    }
  }, [searchParams]);
  // Fetch alert count dynamically to display on the tab badge
  const fetchAlertCount = async () => {
    try {
      const res = await fetch("/api/inventory/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlertCount(data.length || 0);
      }
    } catch (err) {
      console.error("Failed to fetch alert count", err);
    }
  };

  useEffect(() => {
    fetchAlertCount();
    // Poll every 30 seconds for dynamic updates
    const interval = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    {
      id: "catalog" as const,
      label: "Grocery/Warehouse",
      icon: BookOpen,
      component: <InventoryCatalogPage />,
    },
    {
      id: "onboard" as const,
      label: "Onboard",
      icon: ArrowRightLeft,
      component: <OnboardPage />,
    },
    {
      id: "alerts" as const,
      label: "Alerts",
      icon: Bell,
      component: <AlertsPage />,
      badge: alertCount > 0 ? alertCount : undefined,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Title section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Inventory Control
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Manage your global grocery catalog, warehouse stock levels, onboard
          supplies, and reorder alerts.
        </p>
      </div>

      {/* Premium Tab Bar - Responsive, No Scrollbars */}
      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 sm:gap-2.5 border-b-2 px-1 pb-3 sm:pb-4 text-[11px] sm:text-sm font-bold tracking-tight outline-none transition-all whitespace-nowrap",
                  isActive
                    ? "border-[#1868A5] text-[#1868A5]"
                    : "border-transparent text-slate-400 hover:text-slate-600",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 sm:h-4.5 sm:w-4.5",
                    isActive ? "text-[#1868A5]" : "text-slate-400",
                  )}
                />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-full px-1.5 font-extrabold text-white animate-pulse",
                      "h-4 min-w-[16px] text-[9px] sm:h-5 sm:min-w-[20px] sm:text-[10px]",
                      tab.id === "alerts" ? "bg-red-500" : "bg-[#1868A5]",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panel */}
      <div className="mt-4 transition-all duration-300">
        {tabs.find((t) => t.id === activeTab)?.component}
      </div>
    </div>
  );
}
