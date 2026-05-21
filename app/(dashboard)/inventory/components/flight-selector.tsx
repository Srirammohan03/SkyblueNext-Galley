"use client";

import React, { useState, useEffect } from "react";
import { Search, Plane, Calendar, Users, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Flight {
  id: string;
  flightNumber: string;
  tailNumber: string;
  departure: string;
  arrival: string;
  date: string;
  departureTime?: string;
  paxCount: number;
  crewCount: number;
  status: string;
}

interface FlightSelectorProps {
  onSelectFlight: (flight: Flight) => void;
  selectedFlightId?: string;
  allowedStatuses?: string[];
}

export default function FlightSelector({
  onSelectFlight,
  selectedFlightId,
  allowedStatuses,
}: FlightSelectorProps) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flights");
      if (res.ok) {
        const data = await res.json();
        setFlights(data);
      }
    } catch (err) {
      console.error("Failed to fetch flights for selector", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const filteredFlights = flights.filter((f) => {
    // Apply search filter (flight number, tail number, departure, arrival)
    const matchesSearch =
      search.trim() === "" ||
      f.flightNumber?.toLowerCase().includes(search.toLowerCase()) ||
      f.tailNumber?.toLowerCase().includes(search.toLowerCase()) ||
      f.departure?.toLowerCase().includes(search.toLowerCase()) ||
      f.arrival?.toLowerCase().includes(search.toLowerCase());

    // Apply status filter
    const matchesStatus =
      statusFilter === "All" ||
      f.status === statusFilter;

    // Apply allowed statuses filter if provided
    const isAllowedStatus =
      !allowedStatuses || allowedStatuses.includes(f.status);

    return matchesSearch && matchesStatus && isAllowedStatus;
  });

  // Get unique statuses for dropdown filter
  const statuses = ["All", ...Array.from(new Set(flights.map((f) => f.status)))];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Flight, Tail #, or Destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#1868A5]/20 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none bg-white font-medium text-slate-700 min-w-[120px]"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </select>
          <button
            onClick={fetchFlights}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 bg-white"
            title="Refresh Flights"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flight Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 border border-slate-100 rounded-2xl bg-slate-50/50">
          <RefreshCw className="w-8 h-8 text-[#1868A5] animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading flight manifest...</p>
        </div>
      ) : filteredFlights.length === 0 ? (
        <div className="text-center p-12 border border-slate-100 rounded-2xl bg-slate-50/50">
          <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No active flights found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
          {filteredFlights.map((flight) => {
            const isSelected = selectedFlightId === flight.id;
            const date = new Date(flight.date);

            return (
              <button
                key={flight.id}
                onClick={() => onSelectFlight(flight)}
                className={cn(
                  "text-left p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 relative group",
                  isSelected
                    ? "border-[#1868A5] bg-[#1868A5]/5 ring-2 ring-[#1868A5]/10"
                    : "border-slate-200 hover:border-slate-300 bg-white shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 group-hover:text-[#1868A5] transition-colors">
                        {flight.flightNumber || "TBD"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold uppercase">
                        {flight.tailNumber || "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 font-bold text-slate-800">
                      <span>{flight.departure}</span>
                      <Plane className="w-3.5 h-3.5 text-slate-400 rotate-45" />
                      <span>{flight.arrival}</span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      flight.status === "Approved" && "bg-emerald-100 text-emerald-700",
                      flight.status === "Draft" && "bg-orange-100 text-orange-700",
                      flight.status === "Submitted" && "bg-sky-100 text-sky-700",
                      flight.status === "Delivered" && "bg-purple-100 text-purple-700",
                      flight.status === "Onboard" && "bg-blue-100 text-blue-700",
                      flight.status === "Deboard" && "bg-amber-100 text-amber-700",
                      flight.status === "Completed" && "bg-teal-100 text-teal-700"
                    )}
                  >
                    {flight.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{date.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{flight.paxCount} Pax • {flight.crewCount} Crew</span>
                  </div>
                </div>

                <ChevronRight className={cn(
                  "w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition-all group-hover:text-[#1868A5] group-hover:translate-x-0.5",
                  isSelected ? "text-[#1868A5]" : ""
                )} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
