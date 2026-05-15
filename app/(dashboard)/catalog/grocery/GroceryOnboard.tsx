"use client";

import React, { useEffect, useMemo, useState } from "react";

import axios from "axios";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  Plane,
  ChevronDown,
  ShoppingCart,
  CalendarDays,
  Users,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

async function fetchFlights({ queryKey, signal }: any) {
  const [_, search, status, startDate, endDate] = queryKey;

  const params = new URLSearchParams();

  if (search) {
    params.append("search", search);
  }

  if (status && status !== "All") {
    params.append("status", status);
  }

  if (startDate) {
    params.append("startDate", startDate);
  }

  if (endDate) {
    params.append("endDate", endDate);
  }

  const res = await axios.get(`/api/flights?${params.toString()}`, {
    signal,
  });

  return res.data;
}

async function fetchRestoredItems() {
  const res = await axios.get("/api/restored-items");

  return res.data;
}

export default function GroceryOnboard() {
  const [openFlightId, setOpenFlightId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const { data: flights = [], isFetching } = useQuery({
    queryKey: [
      "grocery-onboard-flights",
      debouncedSearch,
      statusFilter,
      startDate,
      endDate,
    ],

    queryFn: fetchFlights,
    placeholderData: keepPreviousData,
  });

  const { data: restoredItems = [], isLoading: restoredLoading } = useQuery({
    queryKey: ["restored-items"],
    queryFn: fetchRestoredItems,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timeout);
  }, [search]);

  const flightsWithOrders = useMemo(() => {
    return flights.filter(
      (flight: any) => Array.isArray(flight.items) && flight.items.length > 0,
    );
  }, [flights]);

  const toggleAccordion = (flightId: string) => {
    setOpenFlightId((prev) => (prev === flightId ? null : flightId));
  };

  return (
    <div className="pb-10">
      {/* FILTERS */}
      <div className="mb-6 rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          {/* LEFT */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Grocery Onboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage onboard and restored grocery items
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex flex-wrap items-end gap-3">
            {/* SEARCH */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search flights..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full min-w-[240px] rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-[#1868A5] focus:ring-4 focus:ring-[#1868A5]/10"
              />
            </div>

            {/* STATUS */}
            <div className="flex flex-col gap-1">
              <label className="pl-1 text-xs font-medium text-slate-500">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all focus:border-[#1868A5] focus:ring-4 focus:ring-[#1868A5]/10"
              >
                <option value="All">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
                <option value="SentToVendor">Sent To Vendor</option>
              </select>
            </div>

            {/* START DATE */}
            <div className="flex flex-col gap-1">
              <label className="pl-1 text-xs font-medium text-slate-500">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all focus:border-[#1868A5] focus:ring-4 focus:ring-[#1868A5]/10"
              />
            </div>

            {/* END DATE */}
            <div className="flex flex-col gap-1">
              <label className="pl-1 text-xs font-medium text-slate-500">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all focus:border-[#1868A5] focus:ring-4 focus:ring-[#1868A5]/10"
              />
            </div>

            {/* CLEAR */}
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
                setStartDate("");
                setEndDate("");
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {isFetching ? (
          <p className="text-xs text-slate-400 mt-1">Searching...</p>
        ) : !flightsWithOrders?.length ? (
          <div
            className="
          rounded-[32px]
          border
          border-slate-200
          bg-white
          p-10
          text-center
          shadow-sm
        "
          >
            <div
              className="
            mx-auto
            mb-5
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-3xl
            bg-slate-100
          "
            >
              <ShoppingCart className="h-8 w-8 text-slate-400" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              No onboard grocery orders
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Flights with ordered items will appear here.
            </p>
          </div>
        ) : (
          flightsWithOrders.map((flight: any) => {
            const date = new Date(flight.date);

            const isOpen = openFlightId === flight.id;

            const totalPrice =
              flight.items?.reduce((sum: number, item: any) => {
                return (
                  sum + Number(item.price || 0) * Number(item.quantity || 0)
                );
              }, 0) || 0;

            return (
              <div
                key={flight.id}
                className="
              overflow-hidden
              rounded-[32px]
              border
              border-slate-200
              bg-white
              shadow-sm
            "
              >
                {/* HEADER */}
                <button
                  onClick={() => toggleAccordion(flight.id)}
                  className="
                w-full
                p-4
                sm:p-6
                text-left
                transition-all
                hover:bg-slate-50
              "
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* LEFT */}
                    <div className="flex items-start gap-4 min-w-0">
                      {/* DATE */}
                      <div
                        className="
                      flex
                      h-16
                      w-16
                      shrink-0
                      flex-col
                      items-center
                      justify-center
                      rounded-3xl
                      bg-[#1868A5]/10
                    "
                      >
                        <p className="text-[10px] font-bold uppercase text-[#1868A5]">
                          {date.toLocaleString("default", {
                            month: "short",
                          })}
                        </p>

                        <p className="text-2xl font-bold text-slate-900">
                          {date.getDate()}
                        </p>
                      </div>

                      {/* DETAILS */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className="
                          flex
                          items-center
                          gap-2
                          text-lg
                          font-bold
                          text-slate-900
                        "
                          >
                            <span>{flight.departure}</span>

                            <Plane className="h-4 w-4 text-slate-400" />

                            <span>{flight.arrival}</span>
                          </h2>

                          {flight.flightNumber && (
                            <span
                              className="
                            rounded-full
                            bg-slate-100
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            text-slate-600
                          "
                            >
                              {flight.flightNumber}
                            </span>
                          )}
                        </div>

                        {/* INFO */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />

                            <span>{date.toLocaleDateString()}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />

                            <span>
                              {flight.paxCount} pax • {flight.crewCount} crew
                            </span>
                          </div>

                          {flight.tailNumber && (
                            <span>{flight.tailNumber}</span>
                          )}
                        </div>

                        {/* STATUS */}
                        <div className="mt-4">
                          <span
                            className={cn(
                              `
                            inline-flex
                            items-center
                            rounded-full
                            border
                            px-3
                            py-1
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-wide
                          `,

                              flight.status === "Approved" &&
                                "border-emerald-200 bg-emerald-100 text-emerald-700",

                              flight.status === "Rejected" &&
                                "border-red-200 bg-red-100 text-red-700",

                              flight.status === "Draft" &&
                                "border-orange-200 bg-orange-100 text-orange-700",

                              flight.status === "Submitted" &&
                                "border-sky-200 bg-sky-100 text-sky-700",

                              flight.status === "Completed" &&
                                "border-blue-200 bg-blue-100 text-blue-700",

                              flight.status === "SentToVendor" &&
                                "border-violet-200 bg-violet-100 text-violet-700",

                              flight.status === "Confirmed" &&
                                "border-cyan-200 bg-cyan-100 text-cyan-700",

                              flight.status === "Cancelled" &&
                                "border-slate-300 bg-slate-200 text-slate-700",
                            )}
                          >
                            {flight.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="flex items-center justify-between gap-4">
                      {/* STATS */}
                      <div className="flex items-center gap-3">
                        <div
                          className="
                        rounded-2xl
                        bg-slate-100
                        px-4
                        py-3
                        text-center
                      "
                        >
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Items
                          </p>

                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {flight.items?.length || 0}
                          </p>
                        </div>

                        <div
                          className="
                        rounded-2xl
                        bg-[#1868A5]/10
                        px-4
                        py-3
                        text-center
                      "
                        >
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Total
                          </p>

                          <p className="mt-1 text-lg font-bold text-[#1868A5]">
                            ₹{totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* ACCORDION ICON */}
                      <div
                        className={cn(
                          `
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        border
                        border-slate-200
                        transition-all
                      `,
                          isOpen && "border-[#1868A5] bg-[#1868A5] text-white",
                        )}
                      >
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 transition-transform duration-300",
                            isOpen && "rotate-180",
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {/* CONTENT */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    <div className="p-4 sm:p-6">
                      {/* ORDERED ITEMS */}
                      <div>
                        <div className="mb-5">
                          <h3 className="text-base font-bold text-slate-900">
                            Onboard Items
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            All grocery items ordered for this flight
                          </p>
                        </div>

                        {flight.items?.length > 0 ? (
                          <>
                            <div
                              className="
                overflow-x-auto
                rounded-3xl
                border
                border-slate-200
                bg-white
              "
                            >
                              <table className="min-w-full">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                      S.No
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                      Item
                                    </th>

                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                      Category
                                    </th>

                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                      Vendor
                                    </th>

                                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                      Qty
                                    </th>

                                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                      Unit Price
                                    </th>

                                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                      Total
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {flight.items.map(
                                    (item: any, index: number) => {
                                      const itemTotal =
                                        Number(item.price || 0) *
                                        Number(item.quantity || 0);

                                      return (
                                        <tr
                                          key={index}
                                          className="
                            border-t
                            border-slate-100
                            hover:bg-slate-50
                          "
                                        >
                                          <td className="px-4 py-4">
                                            <p className="text-sm font-bold text-slate-900">
                                              {index + 1}
                                            </p>
                                          </td>
                                          <td className="min-w-[220px] px-4 py-4">
                                            <div>
                                              <p className="text-sm font-bold text-slate-900">
                                                {item.name}
                                              </p>

                                              {item.notes && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                  {item.notes}
                                                </p>
                                              )}
                                            </div>
                                          </td>

                                          <td className="px-4 py-4">
                                            <span
                                              className="
                                inline-flex
                                rounded-full
                                bg-slate-100
                                px-2.5
                                py-1
                                text-[11px]
                                font-semibold
                                text-slate-600
                                whitespace-nowrap
                              "
                                            >
                                              {item.category || "-"}
                                            </span>
                                          </td>

                                          <td className="px-4 py-4">
                                            <span
                                              className="
                                inline-flex
                                rounded-full
                                bg-emerald-100
                                px-2.5
                                py-1
                                text-[11px]
                                font-semibold
                                text-emerald-700
                                whitespace-nowrap
                              "
                                      >
                                        {item.vendorName || "Grocery Catalog"}
                                      </span>
                                    </td>

                                    <td className="px-4 py-4 text-center">
                                      <span className="text-sm font-bold text-slate-900">
                                        {item.quantity}
                                      </span>
                                    </td>

                                    <td className="px-4 py-4 text-right">
                                      <span className="text-sm font-semibold text-slate-700">
                                        ₹
                                        {Number(
                                          item.price || 0,
                                        ).toLocaleString()}
                                      </span>
                                    </td>

                                    <td className="px-4 py-4 text-right">
                                      <span className="text-sm font-bold text-[#1868A5]">
                                        ₹{itemTotal.toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                            {/* ORDERED TOTAL */}
                            <div
                              className="
                mt-4
                flex
                items-center
                justify-between
                rounded-[28px]
                bg-[#1868A5]
                px-5
                py-5
                text-white
              "
                            >
                              <div>
                                <p className="md:text-lg text-sm font-bold">
                                  Ordered Items Total
                                </p>

                                <p className="text-xs text-slate-200">
                                  Total ordered grocery value
                                </p>
                              </div>

                              <div className="md:text-2xl text-xl font-bold">
                                ₹
                                {flight.items
                                  ?.reduce((sum: number, item: any) => {
                                    return (
                                      sum +
                                      Number(item.price || 0) *
                                        Number(item.quantity || 0)
                                    );
                                  }, 0)
                                  .toLocaleString()}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div
                            className="
              rounded-3xl
              border
              border-dashed
              border-slate-300
              bg-white
              px-6
              py-10
              text-center
            "
                          >
                            <p className="text-sm font-medium text-slate-500">
                              No ordered items present
                            </p>
                          </div>
                        )}
                      </div>

                      {/* SEPARATOR */}
                      <div className="my-8 border-t border-dashed border-slate-300" />

                      {/* RESTORED ITEMS */}
                      <div>
                        <div className="mb-5">
                          <h3 className="text-base font-bold text-slate-900">
                            Restored Items
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Returned / restored onboard grocery items
                          </p>
                        </div>

                        {(() => {
                          const flightRestoredItems = restoredItems.filter(
                            (restored: any) =>
                              restored.flightOrderId === flight.id,
                          );

                          const restoredTotal = flightRestoredItems.reduce(
                            (sum: number, restored: any) => {
                              const originalItem = flight.items.find(
                                (item: any) => item.id === restored.itemId,
                              );

                              return (
                                sum +
                                Number(originalItem?.price || 0) *
                                  Number(restored.returnedQty || 0)
                              );
                            },
                            0,
                          );

                          if (restoredLoading) {
                            return (
                              <div
                                className="
            rounded-3xl
            border
            border-slate-200
            bg-white
            px-6
            py-10
            text-center
          "
                              >
                                <p className="text-sm font-medium text-slate-500">
                                  Loading restored items...
                                </p>
                              </div>
                            );
                          }

                          if (!flightRestoredItems.length) {
                            return (
                              <div
                                className="
            rounded-3xl
            border
            border-dashed
            border-slate-300
            bg-white
            px-6
            py-10
            text-center
          "
                              >
                                <p className="text-sm font-medium text-slate-500">
                                  No restored items present
                                </p>
                              </div>
                            );
                          }

                          return (
                            <>
                              <div
                                className="
            overflow-x-auto
            rounded-3xl
            border
            border-slate-200
            bg-white
          "
                              >
                                <table className="min-w-[900px] w-full">
                                  <thead className="bg-slate-100">
                                    <tr>
                                      <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                        S.No
                                      </th>

                                      <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                        Item
                                      </th>

                                      <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                        Category
                                      </th>

                                      <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                        Vendor
                                      </th>

                                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                        Restored Qty
                                      </th>

                                      <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                        Unit Price
                                      </th>

                                      <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                                        Total
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {flightRestoredItems.map(
                                      (restored: any, index: number) => {
                                        const originalItem = flight.items.find(
                                          (item: any) =>
                                            item.id === restored.itemId,
                                        );

                                        const restoredTotalPrice =
                                          Number(originalItem?.price || 0) *
                                          Number(restored.returnedQty || 0);

                                        return (
                                          <tr
                                            key={restored.id}
                                            className="
                        border-t
                        border-slate-100
                        hover:bg-slate-50
                      "
                                          >
                                            <td className="px-4 py-4">
                                              <p className="text-sm font-bold text-slate-900">
                                                {index + 1}
                                              </p>
                                            </td>

                                            <td className="min-w-[220px] px-4 py-4">
                                              <p className="text-sm font-bold text-slate-900">
                                                {originalItem?.name}
                                              </p>
                                            </td>

                                            <td className="px-4 py-4">
                                              <span
                                                className="
                            inline-flex
                            rounded-full
                            bg-slate-100
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            text-slate-600
                          "
                                              >
                                                {originalItem?.category || "-"}
                                              </span>
                                            </td>

                                            <td className="px-4 py-4">
                                              <span
                                                className="
                            inline-flex
                            rounded-full
                            bg-emerald-100
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            text-emerald-700
                          "
                                          >
                                            {originalItem?.vendorName ||
                                              "Grocery Catalog"}
                                          </span>
                                        </td>

                                        <td className="px-4 py-4 text-center">
                                          <span className="text-sm font-bold text-slate-900">
                                            {restored.returnedQty}
                                          </span>
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                          <span className="text-sm font-semibold text-slate-700">
                                            ₹
                                            {Number(
                                              originalItem?.price || 0,
                                            ).toLocaleString()}
                                          </span>
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                          <span className="text-sm font-bold text-emerald-600">
                                            ₹
                                            {restoredTotalPrice.toLocaleString()}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  },
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* TOTAL */}
                          <div
                            className="
            mt-4
            flex
            items-center
            justify-between
            rounded-[28px]
            bg-emerald-600
            px-5
            py-5
            text-white
          "
                              >
                                <div>
                                  <p className="text-lg font-bold">
                                    Restored Items Total
                                  </p>

                                  <p className="text-xs text-emerald-100">
                                    Total restored grocery value
                                  </p>
                                </div>

                                <div className="text-xl md:text-2xl font-bold">
                                  ₹{restoredTotal.toLocaleString()}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
