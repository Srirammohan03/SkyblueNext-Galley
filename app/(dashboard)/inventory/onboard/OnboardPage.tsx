// app/(dashboard)/inventory/onboard/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Plane,
  Search,
  RefreshCw,
  Package2,
  ArrowRightLeft,
  Undo2,
  CheckCircle2,
  AlertCircle,
  Filter,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";

interface Flight {
  id: string;
  flightNumber: string;
  tailNumber: string;
  departure: string;
  arrival: string;
  date: string;
  departureTime: string;
  status: string;
}

interface ReusableItem {
  id: string;
  itemId: string;
  name: string;
  category: string;
  availableQty: number;
}

interface OnboardRow {
  itemId: string;
  name: string;
  category: string;
  warehouseStock: number;
  reusableQty: number;
  reuseQty: number;
  addQty: number;
  finalQty: number;
}

type InnerTab = "onboard" | "deboard";

const categories = [
  "All",
  "Alcohol",
  "Bakery",
  "Beverages",
  "Dairy",
  "Snacks",
  "Supplies",
];

export default function OnboardPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<InnerTab>("onboard");
  const [loading, setLoading] = useState(false);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState("");

  const [warehouseBalances, setWarehouseBalances] = useState<any[]>([]);
  const [reusableItems, setReusableItems] = useState<ReusableItem[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [rows, setRows] = useState<OnboardRow[]>([]);
  const [showReusableOnly, setShowReusableOnly] = useState(false);
  const [isDeboardCompleted, setIsDeboardCompleted] = useState(false);
  const [deboardRows, setDeboardRows] = useState<
    {
      itemId: string;
      name: string;
      category: string;
      onboardQty: number;
      usedQty: number;
      remainingQty: number;
    }[]
  >([]);

  const [existingOnboardCount, setExistingOnboardCount] = useState(0);

  const selectedFlight = useMemo(() => {
    return flights.find((f) => f.id === selectedFlightId);
  }, [flights, selectedFlightId]);

  useEffect(() => {
    const flightId = searchParams.get("flightId");
    const tab = searchParams.get("tab");

    if (flightId) {
      setSelectedFlightId(flightId);
    }

    if (tab === "deboard") {
      setActiveTab("deboard");
    }

    if (tab === "onboard") {
      setActiveTab("onboard");
    }
  }, [searchParams]);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedFlightId) {
      loadFlightInventory();
    }
  }, [selectedFlightId]);

  useEffect(() => {
    if (selectedFlightId && warehouseBalances.length > 0) {
      loadFlightInventory();
    }
  }, [warehouseBalances]);

  const loadInitial = async () => {
    try {
      setLoading(true);

      const [flightRes, warehouseRes] = await Promise.all([
        fetch("/api/flights"),
        fetch("/api/inventory/balances?locationId=any random text"),
      ]);

      const flightsData = await flightRes.json();
      const warehouseData = await warehouseRes.json();

      const activeFlights = Array.isArray(flightsData)
        ? flightsData.filter(
            (flight: any) =>
              !["Completed", "Cancelled", "Rejected"].includes(flight.status),
          )
        : [];

      setFlights(activeFlights);
      setWarehouseBalances(warehouseData || []);

      if (activeFlights.length > 0) {
        setSelectedFlightId(activeFlights[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFlightInventory = useCallback(async () => {
    try {
      if (!selectedFlight) return;

      setLoading(true);

      const restoredRes = await fetch(
        `/api/restored-items?tailNumber=${selectedFlight.tailNumber}`,
      );

      const restoredData = await restoredRes.json();

      const reusableMapped: ReusableItem[] = restoredData.map((item: any) => ({
        id: item.id,
        itemId: item.catalogItemId,
        name: item.name,
        category: item.category,
        availableQty: item.returnedQty,
      }));

      setReusableItems(reusableMapped);

      const groceryBalances = warehouseBalances.filter(
        (balance: any) => balance.item?.type?.toLowerCase() === "grocery",
      );

      const mappedRows: OnboardRow[] = groceryBalances.map((balance: any) => {
        const item = balance.item;

        const reusable = reusableMapped.find((r) => r.itemId === item.id);

        return {
          itemId: item.id,
          name: item.name,
          category: item.category,
          warehouseStock: balance.onHandBaseUnits || 0,
          reusableQty: reusable?.availableQty || 0,
          reuseQty: 0,
          addQty: 0,
          finalQty: 0,
        };
      });

      setRows(mappedRows);

      const flightRes = await fetch(`/api/flights/${selectedFlightId}`);

      const flightData = await flightRes.json();

      const onboardItems =
        flightData.items?.filter((item: any) =>
          item.name?.includes("(ONBOARD)"),
        ) || [];
      const alreadyDeboarded =
        flightData.status === "DeBoard" || flightData.status === "Completed";

      setIsDeboardCompleted(alreadyDeboarded);
      setExistingOnboardCount(onboardItems.length);

      setDeboardRows(
        onboardItems.map((item: any) => ({
          itemId: item.itemId,
          name: item.name,
          category: item.category,
          onboardQty: item.quantity,
          usedQty: 0,
          remainingQty: item.quantity,
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedFlight, warehouseBalances]);

  const updateRow = (
    itemId: string,
    field: "reuseQty" | "addQty",
    value: number,
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.itemId !== itemId) return row;

        const updatedRow = {
          ...row,
          [field]: Math.max(0, value),
        };

        if (updatedRow.reuseQty > updatedRow.reusableQty) {
          updatedRow.reuseQty = updatedRow.reusableQty;
        }

        if (updatedRow.addQty > updatedRow.warehouseStock) {
          updatedRow.addQty = updatedRow.warehouseStock;
        }

        updatedRow.finalQty = updatedRow.reuseQty + updatedRow.addQty;

        return updatedRow;
      }),
    );
  };
  const autoFillReusableItems = () => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.reusableQty > 0) {
          return {
            ...row,
            reuseQty: row.reusableQty,
            finalQty: row.reusableQty + row.addQty,
          };
        }

        return row;
      }),
    );
  };
  const updateDeboard = (itemId: string, usedQty: number) => {
    setDeboardRows((prev) =>
      prev.map((row) => {
        if (row.itemId !== itemId) return row;

        const safeUsed = Math.max(0, Math.min(usedQty, row.onboardQty));

        return {
          ...row,
          usedQty: safeUsed,
          remainingQty: row.onboardQty - safeUsed,
        };
      }),
    );
  };

  const filteredRows = useMemo(() => {
    let filtered = rows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.category.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        row.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesReusable = !showReusableOnly || row.reusableQty > 0;

      return matchesSearch && matchesCategory && matchesReusable;
    });

    // REUSABLE ITEMS FIRST
    filtered.sort((a, b) => {
      if (a.reusableQty > 0 && b.reusableQty === 0) return -1;
      if (a.reusableQty === 0 && b.reusableQty > 0) return 1;

      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [rows, search, selectedCategory, showReusableOnly]);
  const filteredDeboardRows = useMemo(() => {
    return deboardRows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.category.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        row.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [deboardRows, search, selectedCategory]);

  const onboardSummary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.reused += row.reuseQty;
        acc.warehouse += row.addQty;
        acc.final += row.finalQty;

        return acc;
      },
      {
        reused: 0,
        warehouse: 0,
        final: 0,
      },
    );
  }, [rows]);

  const submitOnboard = async () => {
    if (loading) return;

    try {
      const validRows = rows.filter((r) => r.finalQty > 0);

      if (validRows.length === 0) {
        toast({
          variant: "destructive",
          title: "No Items Added",
          description: "Please add onboard quantity.",
        });

        return;
      }

      setLoading(true);

      for (const row of validRows) {
        const res = await fetch("/api/inventory/onboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            catalogItemId: row.itemId,
            flightId: selectedFlightId,
            baseUnits: row.finalQty,
          }),
        });

        if (!res.ok) {
          const error = await res.json();

          throw new Error(error.error || `Failed onboard for ${row.name}`);
        }
      }

      toast({
        title: "Success",
        description: "Onboard inventory allocated successfully",
      });

      await loadInitial();
    } catch (err: any) {
      console.error(err);

      toast({
        variant: "destructive",
        title: "Onboard Failed",
        description: err.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitDeboard = async () => {
    // PREVENT MULTIPLE CLICKS
    if (loading) return;

    try {
      setLoading(true);

      const payload = deboardRows.map((r) => ({
        itemId: r.itemId,
        usedQty: r.usedQty,
        remainingQty: r.remainingQty,
      }));

      const res = await fetch("/api/inventory/deboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flightId: selectedFlightId,
          items: payload,
        }),
      });

      if (!res.ok) {
        const error = await res.json();

        throw new Error(error.error || "Deboard failed");
      }

      toast({
        title: "Deboard Completed",
        description: "Inventory deboarded successfully.",
      });
      setIsDeboardCompleted(true);
      setDeboardRows([]);

      // OPTIONAL REFRESH
      await loadFlightInventory();
    } catch (err: any) {
      console.error(err);

      toast({
        variant: "destructive",
        title: "Deboard Failed",
        description: err.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Aircraft Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage onboard & deboard inventory workflow
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Plane className="h-5 w-5 text-[#1868A5]" />

            <select
              value={selectedFlightId}
              onChange={(e) => setSelectedFlightId(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold outline-none"
            >
              {flights.map((flight) => (
                <option key={flight.id} value={flight.id}>
                  {flight.flightNumber} • {flight.tailNumber}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadFlightInventory}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white transition-all hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* FLIGHT CARD */}
      {selectedFlight && (
        <div className="overflow-hidden rounded-3xl border border-[#1868A5]/10 bg-gradient-to-br from-[#1868A5] via-[#155b90] to-[#114974] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black">
                  {selectedFlight.flightNumber}
                </h2>

                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                  {selectedFlight.status}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-200">
                {selectedFlight.departure} → {selectedFlight.arrival}
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Aircraft: {selectedFlight.tailNumber}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-slate-300">
                Flight Schedule
              </p>

              <p className="mt-2 text-xl font-black">
                {new Date(selectedFlight.date).toLocaleDateString("en-IN")}
              </p>

              <p className="mt-1 text-sm text-slate-200">
                Departure: {selectedFlight.departureTime}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {[
          {
            id: "onboard",
            label: "Onboard",
            icon: ArrowRightLeft,
          },
          {
            id: "deboard",
            label: "Deboard",
            icon: Undo2,
          },
        ].map((tab) => {
          const Icon = tab.icon;

          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as InnerTab)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-bold transition-all",
                active
                  ? "bg-[#1868A5] text-white shadow-lg"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH + FILTER */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory items..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium outline-none transition-all focus:border-[#1868A5] focus:bg-white focus:ring-4 focus:ring-[#1868A5]/10"
            />
          </div>
          {/* CATEGORY FILTER */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <Filter className="h-4 w-4 text-slate-600" />
            </div>

            {categories.map((category) => {
              const active = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition-all",
                    active
                      ? "bg-[#1868A5] text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {category}
                </button>
              );
            })}

            {(search || selectedCategory !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All");
                }}
                className="flex shrink-0 items-center gap-1 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
          {/* REUSABLE FILTER */}
          {activeTab === "onboard" && (
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setShowReusableOnly(false)}
                className={cn(
                  "rounded-2xl px-4 py-2 text-xs font-bold transition-all",
                  !showReusableOnly
                    ? "bg-[#1868A5] text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-600",
                )}
              >
                Show All Items
              </button>

              <button
                onClick={() => {
                  setShowReusableOnly(true);
                  autoFillReusableItems();
                }}
                className={cn(
                  "flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all",
                  showReusableOnly
                    ? "bg-emerald-600 text-white shadow-md"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700",
                )}
              >
                <div className="h-2 w-2 rounded-full bg-current" />
                Reusable Only
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                  {rows.filter((r) => r.reusableQty > 0).length}
                </span>
              </button>
              <button
                onClick={() => {
                  setRows((prevRows) =>
                    prevRows.map((row) => ({
                      ...row,
                      reuseQty: 0,
                      finalQty: row.addQty,
                    })),
                  );

                  setShowReusableOnly(false);
                }}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all"
              >
                Clear Reuse
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ONBOARD */}
      {activeTab === "onboard" && (
        <div className="space-y-5">
          {/* WARNING */}
          {existingOnboardCount > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />

                <div>
                  <p className="font-bold text-amber-700">
                    Existing onboard items found
                  </p>

                  <p className="mt-1 text-sm text-amber-600">
                    This flight already has onboard inventory. You can still
                    allocate more items.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                    Reusable
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-700">
                    {onboardSummary.reused}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Package2 className="h-6 w-6 text-blue-600" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Warehouse
                  </p>

                  <p className="mt-1 text-3xl font-black text-blue-700">
                    {onboardSummary.warehouse}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#1868A5]/20 bg-gradient-to-br from-[#1868A5]/5 to-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="h-6 w-6 text-[#1868A5]" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1868A5]">
                    Final
                  </p>

                  <p className="mt-1 text-3xl font-black text-[#1868A5]">
                    {onboardSummary.final}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* INVENTORY LIST */}
          <div className="space-y-3">
            {filteredRows.map((row) => (
              <div
                key={row.itemId}
                className={cn(
                  "rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
                  row.reusableQty > 0
                    ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                    : "border-slate-200 hover:border-[#1868A5]/20",
                )}
              >
                {/* TOP */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* LEFT */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate text-lg font-black text-slate-900">
                        {row.name}
                      </h3>

                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        {row.category}
                      </span>
                    </div>

                    {/* MOBILE INPUTS */}
                    <div className="mt-4 grid grid-cols-2 gap-3 lg:hidden">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                          Reuse
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.reuseQty || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");

                            updateRow(
                              row.itemId,
                              "reuseQty",
                              value === "" ? 0 : parseInt(value),
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 text-center text-sm font-bold outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-blue-600">
                          Add
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.addQty || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");

                            updateRow(
                              row.itemId,
                              "addQty",
                              value === "" ? 0 : parseInt(value),
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50/40 px-3 text-center text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    {/* STATS */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex min-w-[88px] flex-col items-center rounded-2xl bg-emerald-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase text-emerald-600">
                          Reusable
                        </p>

                        <p className="mt-1 text-2xl font-black text-emerald-700">
                          {row.reusableQty}
                        </p>
                      </div>

                      <div className="flex min-w-[88px] flex-col items-center rounded-2xl bg-blue-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase text-blue-600">
                          Warehouse
                        </p>

                        <p className="mt-1 text-2xl font-black text-blue-700">
                          {row.warehouseStock}
                        </p>
                      </div>

                      <div className="flex min-w-[88px] flex-col items-center rounded-2xl bg-[#1868A5]/10 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase text-[#1868A5]">
                          Final
                        </p>

                        <p className="mt-1 text-2xl font-black text-[#1868A5]">
                          {row.finalQty}
                        </p>
                      </div>
                    </div>

                    {/* DESKTOP INPUTS */}
                    <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3">
                      <div className="w-[130px]">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                          Reuse
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.reuseQty || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");

                            updateRow(
                              row.itemId,
                              "reuseQty",
                              value === "" ? 0 : parseInt(value),
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 text-center text-sm font-bold outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>

                      <div className="w-[130px]">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-blue-600">
                          Add
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.addQty || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");

                            updateRow(
                              row.itemId,
                              "addQty",
                              value === "" ? 0 : parseInt(value),
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50/40 px-3 text-center text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredRows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm font-medium text-slate-500">
                  No inventory items found
                </p>
              </div>
            )}
          </div>

          {/* ACTION */}
          <div className="sticky bottom-4 z-20">
            <button
              onClick={submitOnboard}
              disabled={loading}
              className="h-14 w-full rounded-3xl bg-[#1868A5] text-sm font-black text-white shadow-2xl transition-all hover:bg-[#145588] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Full Onboard"}
            </button>
          </div>
        </div>
      )}

      {/* DEBOARD */}
      {activeTab === "deboard" && (
        <>
          {isDeboardCompleted && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

                <div>
                  <p className="font-bold text-emerald-700">
                    Flight already deboarded
                  </p>

                  <p className="mt-1 text-sm text-emerald-600">
                    All onboard inventory items were successfully deboarded for
                    this flight.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3 pb-24">
            {!isDeboardCompleted &&
              filteredDeboardRows.map((row) => (
                <div
                  key={row.itemId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* LEFT */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="truncate text-lg font-black text-slate-900">
                          {row.name}
                        </h3>

                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {row.category}
                        </span>
                      </div>

                      {/* MOBILE INPUT */}
                      <div className="mt-4 lg:hidden">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-600">
                          Used Qty
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.usedQty || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");

                            updateDeboard(
                              row.itemId,
                              value === "" ? 0 : parseInt(value),
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 text-center text-sm font-bold outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
                        />
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      {/* STATS */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex min-w-[92px] flex-col items-center rounded-2xl bg-[#1868A5]/10 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase text-[#1868A5]">
                            Onboard
                          </p>

                          <p className="mt-1 text-2xl font-black text-[#1868A5]">
                            {row.onboardQty}
                          </p>
                        </div>

                        <div className="flex min-w-[92px] flex-col items-center rounded-2xl bg-emerald-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase text-emerald-600">
                            Remaining
                          </p>

                          <p className="mt-1 text-2xl font-black text-emerald-700">
                            {row.remainingQty}
                          </p>
                        </div>
                      </div>

                      {/* DESKTOP INPUT */}
                      <div className="hidden lg:block lg:w-[150px]">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-600">
                          Used Qty
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.usedQty || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");

                            updateDeboard(
                              row.itemId,
                              value === "" ? 0 : parseInt(value),
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 text-center text-sm font-bold outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {!isDeboardCompleted && filteredDeboardRows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm font-medium text-slate-500">
                  No deboard items found
                </p>
              </div>
            )}

            {/* ACTION */}
            {!isDeboardCompleted && (
              <div className="sticky bottom-0 z-30 bg-[#F8FAFC] px-1 py-3">
                <button
                  type="button"
                  onClick={submitDeboard}
                  disabled={loading || deboardRows.length === 0}
                  className="h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-xl transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm Deboard"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
