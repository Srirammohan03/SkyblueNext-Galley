"use client";

import React, { useEffect, useMemo, useState } from "react";

import axios from "axios";

import { useQuery } from "@tanstack/react-query";

import {
  Plane,
  ChevronDown,
  ShoppingCart,
  CalendarDays,
  Users,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

async function fetchFlights({
  signal,
  search,
  status,
  startDate,
  endDate,
}: {
  signal: AbortSignal;
  search: string;
  status: string;
  startDate?: string;
  endDate?: string;
}) {
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

export default function FoodOnboard() {
  const [openFlightId, setOpenFlightId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const debouncedSearch = useDebounce(search, 500);

  const {
    data: flights = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "food-onboard-flights",
      debouncedSearch,
      statusFilter,
      startDate,
      endDate,
    ],

    queryFn: ({ signal }) =>
      fetchFlights({
        signal,
        search: debouncedSearch,
        status: statusFilter,
        startDate,
        endDate,
      }),

    staleTime: 1000 * 60,
  });

  const filteredFlights = flights
    .map((flight: any) => ({
      ...flight,

      items: flight.items?.filter((item: any) => item.type === "food") || [],
    }))
    .filter(
      (flight: any) => Array.isArray(flight.items) && flight.items.length > 0,
    );

  const toggleAccordion = (flightId: string) => {
    setOpenFlightId((prev) => (prev === flightId ? null : flightId));
  };

  return (
    <div className="pb-10">
      {/* FILTERS */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Food Onboard</h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage onboard food orders
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
          {/* SEARCH */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search flights..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full sm:w-[260px] rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-[#1868A5] focus:ring-4 focus:ring-[#1868A5]/10"
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
            <label
              htmlFor="startdate"
              className="pl-1 text-xs font-medium text-slate-500"
            >
              Start Date
            </label>

            <input
              id="startdate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all focus:border-[#1868A5] focus:ring-4 focus:ring-[#1868A5]/10"
            />
          </div>

          {/* END DATE */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="enddate"
              className="pl-1 text-xs font-medium text-slate-500"
            >
              End Date
            </label>

            <input
              id="enddate"
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
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {isFetching && !isLoading && (
        <div className="mb-4 text-sm text-slate-500">Updating flights...</div>
      )}

      {/* FLIGHTS */}
      <div className="space-y-5">
        {!filteredFlights?.length ? (
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
              No onboard food orders
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Flights with food items will appear here.
            </p>
          </div>
        ) : (
          filteredFlights.map((flight: any) => {
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
                  hover:bg-slate-50
                "
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* LEFT */}
                    <div className="flex items-start gap-4">
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

                      <div>
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
                        </div>

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
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="flex items-center gap-4">
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

                      <div
                        className={cn(
                          `
                          flex
                          h-11
                          w-11
                          items-center
                          justify-center
                          rounded-2xl
                          border
                          border-slate-200
                        `,
                          isOpen && "border-[#1868A5] bg-[#1868A5] text-white",
                        )}
                      >
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {/* TABLE */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                    <div className="mb-5">
                      <h3 className="text-base font-bold text-slate-900">
                        Food Items
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Food items ordered for this flight
                      </p>
                    </div>

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
                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              S.No
                            </th>

                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Item
                            </th>

                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Category
                            </th>

                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Vendor
                            </th>

                            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                              Qty
                            </th>

                            <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                              Unit Price
                            </th>

                            <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                              Total
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {flight.items.map((item: any, index: number) => {
                            const itemTotal =
                              Number(item.price || 0) *
                              Number(item.quantity || 0);

                            return (
                              <tr
                                key={item.id}
                                className="border-t border-slate-100 hover:bg-slate-50"
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
                                    ₹{Number(item.price || 0).toLocaleString()}
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

                    {/* TOTAL */}
                    <div
                      className="
                      mt-5
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
                        <p className="text-sm md:text-lg font-bold">
                          Food Items Total
                        </p>

                        <p className="text-xs text-slate-200">
                          Total onboard food value
                        </p>
                      </div>

                      <div className="text-lg md:text-2xl font-bold">
                        ₹{totalPrice.toLocaleString()}
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
