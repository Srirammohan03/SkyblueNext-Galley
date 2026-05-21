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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Flight {
  id: string;
  flightNumber: string;
  tailNumber: string;
  departure: string;
  arrival: string;
  date: string;
  status: string;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
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

export default function OnboardPage() {
  const [activeTab, setActiveTab] = useState<InnerTab>("onboard");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState("");

  const [warehouseBalances, setWarehouseBalances] = useState<any[]>([]);

  const [reusableItems, setReusableItems] = useState<ReusableItem[]>([]);

  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<OnboardRow[]>([]);

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

  // LOAD INITIAL
  useEffect(() => {
    loadInitial();
  }, []);

  // LOAD FLIGHT RELATED
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

      // MOCK REUSABLE FETCH
      // Replace later with actual API:
      // /api/inventory/restored?tailNumber=XXX

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

      // BUILD ROWS
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

      // LOAD REAL ONBOARD ITEMS FROM FLIGHT
      const flightRes = await fetch(`/api/flights/${selectedFlightId}`);

      const flightData = await flightRes.json();

      const onboardItems =
        flightData.items?.filter((item: any) =>
          item.name?.includes("(ONBOARD)"),
        ) || [];
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

  // UPDATE ONBOARD ROW
  const updateRow = (
    itemId: string,
    field: "reuseQty" | "addQty",
    value: number,
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.itemId !== itemId) {
          return row;
        }

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

  // UPDATE DEBOARD
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

  const filteredRows = rows.filter((row) => {
    return (
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.category.toLowerCase().includes(search.toLowerCase())
    );
  });

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

      await Promise.all(
        validRows.map(async (row) => {
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

            throw new Error(error.error || "Failed onboard");
          }
        }),
      );

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
    try {
      const payload = deboardRows.map((r) => ({
        itemId: r.itemId,
        usedQty: r.usedQty,
        remainingQty: r.remainingQty,
      }));

      await fetch("/api/inventory/deboard", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          flightId: selectedFlightId,

          items: payload,
        }),
      });

      toast({
        title: "Deboard Completed",
        description: "Inventory deboarded successfully.",
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Aircraft Inventory
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage onboard and deboard grocery lifecycle per flight
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* FLIGHT SELECT */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm min-w-[280px]">
            <Plane className="w-5 h-5 text-[#1868A5]" />

            <select
              value={selectedFlightId}
              onChange={(e) => setSelectedFlightId(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-900"
            >
              {flights.map((flight) => (
                <option key={flight.id} value={flight.id}>
                  {flight.flightNumber} • {flight.tailNumber}
                </option>
              ))}
            </select>
          </div>

          {/* REFRESH */}
          <button
            onClick={loadFlightInventory}
            className="h-12 w-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* FLIGHT CARD */}
      {selectedFlight && (
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-[#1868A5] to-[#145588] p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black">
                  {selectedFlight.flightNumber}
                </h2>

                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  {selectedFlight.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-200">
                {selectedFlight.departure} → {selectedFlight.arrival}
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Aircraft: {selectedFlight.tailNumber}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-slate-300">
                Flight Date
              </p>

              <p className="mt-1 text-lg font-bold">
                {new Date(selectedFlight.date).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INNER TABS */}
      <div className="flex items-center gap-3 overflow-x-auto">
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
                "flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all",
                active
                  ? "bg-[#1868A5] text-white shadow-lg"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory items..."
          className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none focus:ring-4 focus:ring-[#1868A5]/10"
        />
      </div>

      {/* ONBOARD TAB */}
      {activeTab === "onboard" && (
        <div className="space-y-6">
          {/* EXISTING WARNING */}
          {existingOnboardCount > 0 && (
            <div className="rounded-3xl border border-red-600 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />

                <div>
                  <p className="font-bold text-blue-700">
                    Existing Onboard Items Found
                  </p>

                  <p className="mt-1 text-sm text-blue-600">
                    This flight already has onboard inventory. You can still add
                    more inventory items.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                    Reusable Stock
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-700">
                    {onboardSummary.reused}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-3">
                <Package2 className="h-6 w-6 text-blue-600" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Warehouse Added
                  </p>

                  <p className="mt-1 text-3xl font-black text-blue-700">
                    {onboardSummary.warehouse}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#1868A5]/20 bg-[#1868A5]/5 p-5">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="h-6 w-6 text-[#1868A5]" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1868A5]">
                    Final Onboard
                  </p>

                  <p className="mt-1 text-3xl font-black text-[#1868A5]">
                    {onboardSummary.final}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* INVENTORY LIST */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-black text-slate-900">
                Grocery Inventory
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Allocate reusable and warehouse stock to this aircraft.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <div
                  key={row.itemId}
                  className="
              flex
              flex-col
              gap-5
              p-5
              xl:grid
              xl:grid-cols-12
              xl:items-center
            "
                >
                  {/* ITEM */}
                  <div className="xl:col-span-3">
                    <p className="text-lg font-bold text-slate-900">
                      {row.name}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {row.category}
                    </span>
                  </div>

                  {/* STOCK */}
                  <div className="grid grid-cols-3 gap-3 xl:col-span-4">
                    <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                      <p className="text-xs font-bold uppercase text-emerald-600">
                        Reusable
                      </p>

                      <p className="mt-2 text-2xl font-black text-emerald-700">
                        {row.reusableQty}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4 text-center">
                      <p className="text-xs font-bold uppercase text-blue-600">
                        Warehouse
                      </p>

                      <p className="mt-2 text-2xl font-black text-blue-700">
                        {row.warehouseStock}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#1868A5]/10 p-4 text-center">
                      <p className="text-xs font-bold uppercase text-[#1868A5]">
                        Final
                      </p>

                      <p className="mt-2 text-2xl font-black text-[#1868A5]">
                        {row.finalQty}
                      </p>
                    </div>
                  </div>

                  {/* INPUTS */}
                  <div className="grid grid-cols-2 gap-3 xl:col-span-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-emerald-600">
                        Reuse Qty
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
                        className="
                    h-12
                    w-full
                    rounded-2xl
                    border
                    border-emerald-200
                    bg-white
                    px-4
                    text-center
                    text-sm
                    font-bold
                    outline-none
                    transition-all
                    focus:border-emerald-500
                    focus:ring-4
                    focus:ring-emerald-500/10
                  "
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-blue-600">
                        Add Qty
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
                        className="
                    h-12
                    w-full
                    rounded-2xl
                    border
                    border-blue-200
                    bg-white
                    px-4
                    text-center
                    text-sm
                    font-bold
                    outline-none
                    transition-all
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FINAL ACTION */}
          <div className="flex justify-end">
            <button
              onClick={submitOnboard}
              disabled={loading}
              className="
          h-14
          rounded-2xl
          bg-[#1868A5]
          px-8
          text-sm
          font-bold
          text-white
          shadow-lg
          transition-all
          hover:bg-[#145588]
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
            >
              {loading ? "Processing..." : "Confirm Full Onboard"}
            </button>
          </div>
        </div>
      )}

      {/* DEBOARD TAB */}
      {activeTab === "deboard" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />

              <div>
                <p className="font-bold text-amber-700">
                  Deboard Remaining Items
                </p>

                <p className="text-sm text-amber-600 mt-1">
                  Used quantity will be consumed. Remaining quantity becomes
                  reusable stock for the next flight on the same aircraft.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Item
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                      Onboard
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                      Used
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                      Remaining
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {deboardRows.map((row) => (
                    <tr key={row.itemId} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {row.name}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {row.category}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="font-bold text-[#1868A5]">
                          {row.onboardQty}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={row.onboardQty}
                          value={row.usedQty}
                          onChange={(e) =>
                            updateDeboard(row.itemId, Number(e.target.value))
                          }
                          className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">
                          {row.remainingQty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={submitDeboard}
              className="h-14 rounded-2xl bg-emerald-600 px-8 text-sm font-bold text-white shadow-lg hover:bg-emerald-700"
            >
              Complete Deboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
