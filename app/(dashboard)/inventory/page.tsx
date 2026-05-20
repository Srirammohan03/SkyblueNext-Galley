"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Warehouse, ArrowRightLeft, Bell } from "lucide-react";
import InventoryCatalogPage from "./catalog/page";
import WarehousePage from "./warehouse/page";
import OnboardPage from "./onboard/page";
import AlertsPage from "./alerts/page";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "warehouse" | "onboard" | "alerts">("catalog");
  const [alertCount, setAlertCount] = useState(0);

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
      label: "Inv. Catalog",
      icon: BookOpen,
      component: <InventoryCatalogPage />,
    },
    {
      id: "warehouse" as const,
      label: "Warehouse",
      icon: Warehouse,
      component: <WarehousePage />,
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
    <div className="space-y-6">
      {/* Title section */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Inventory Control
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your global grocery catalog, warehouse stock levels, onboard supplies, and reorder alerts.
        </p>
      </div>

      {/* Premium Tab Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex space-x-6 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 pb-4 px-1 text-sm font-bold border-b-2 transition-all relative outline-none",
                  isActive
                    ? "border-[#1868A5] text-[#1868A5]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5", isActive ? "text-[#1868A5]" : "text-slate-400")} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={cn(
                    "flex items-center justify-center min-w-5 h-5 rounded-full px-1 text-[10px] font-extrabold text-white animate-pulse shrink-0",
                    tab.id === "alerts" ? "bg-red-500" : "bg-[#1868A5]"
                  )}>
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
