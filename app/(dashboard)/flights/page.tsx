// app\flights\page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Plus, Plane, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function FlightsPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<any>({});
  const router = useRouter();
  const getLocalDate = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };
  const emptyFlight = {
    date: getLocalDate(),
    departureTime: "",
    departure: "",
    arrival: "",
    flightNumber: "",
    tailNumber: "",
    paxCount: 1,
    crewCount: 1,
    timezone: "IST (UTC+5:30)",
    pickupLocation: "",
    dietaryNotes: "",
    serviceStyleNotes: "",
    specialInstructions: "",
    status: "Draft",
  };
  const [newFlight, setNewFlight] = useState({
    date: getLocalDate(),
    departureTime: "",
    departure: "",
    arrival: "",
    flightNumber: "",
    tailNumber: "",
    paxCount: 1,
    crewCount: 1,
    timezone: "IST (UTC+5:30)",
    pickupLocation: "",
    dietaryNotes: "",
    serviceStyleNotes: "",
    specialInstructions: "",
    status: "Draft",
  });

  useEffect(() => {
    fetch("/api/flights")
      .then((res) => res.json())
      .then((data) => {
        setFlights(data);
        setLoading(false);
      });
  }, []);
  const validateFlight = () => {
    const newErrors: any = {};

    if (!newFlight.date) {
      newErrors.date = "Flight date required";
    }

    if (!newFlight.departure.trim()) {
      newErrors.departure = "Departure airport required";
    } else if (!/^[A-Z]{3,4}$/i.test(newFlight.departure)) {
      newErrors.departure = "Use valid IATA/ICAO code";
    }

    if (!newFlight.arrival.trim()) {
      newErrors.arrival = "Arrival airport required";
    } else if (!/^[A-Z]{3,4}$/i.test(newFlight.arrival)) {
      newErrors.arrival = "Use valid IATA/ICAO code";
    }

    if (newFlight.departure.toUpperCase() === newFlight.arrival.toUpperCase()) {
      newErrors.arrival = "Arrival airport must differ from departure";
    }

    if (newFlight.paxCount < 0) {
      newErrors.paxCount = "Invalid passenger count";
    }

    if (newFlight.crewCount < 0) {
      newErrors.crewCount = "Invalid crew count";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };
  const handleCreateFlight = async () => {
    const isValid = validateFlight();

    if (!isValid) return;

    try {
      setSaving(true);

      const res = await fetch("/api/flights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newFlight,
          departure: newFlight.departure.toUpperCase(),
          arrival: newFlight.arrival.toUpperCase(),
          items: [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create flight");
      }

      setErrors({});
      setIsModalOpen(false);
      setNewFlight(emptyFlight);

      router.push(`/flights/${data.id}`);
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getFlightDisplayDate = (flight: any) => {
    if (flight.deliveryDate) {
      const [year, month, day] = flight.deliveryDate.split("-");

      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const rawDate = flight.date.split("T")[0];

    const [year, month, day] = rawDate.split("-");

    return new Date(Number(year), Number(month) - 1, Number(day));
  };
  const upcomingFlights = flights.filter((f: any) => {
    const flightDate = getFlightDisplayDate(f);

    return flightDate >= today;
  });

  const pastFlights = flights.filter((f: any) => {
    const flightDate = getFlightDisplayDate(f);

    return flightDate < today;
  });

  const renderFlightCard = (flight: any) => {
    const displayDate = getFlightDisplayDate(flight);

    return (
      <div
        key={flight.id}
        className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-4"
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-center w-12 sm:w-16 shrink-0">
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">
              {displayDate.toLocaleString("default", { month: "short" })}
            </p>

            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {displayDate.getDate()}
            </p>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {flight.departure}{" "}
                <Plane className="w-3 h-3 sm:w-4 sm:h-4 inline mx-1 text-slate-400" />{" "}
                {flight.arrival}
              </h3>
              <span className="text-xs sm:text-sm font-medium text-slate-500">
                {flight.flightNumber}
              </span>
              <span
                className={cn(
                  `
      inline-flex
      items-center
      rounded-full
      px-3
      py-1
      text-[11px]
      font-semibold
      tracking-wide
      border
    `,

                  flight.status === "Approved" &&
                    "bg-emerald-100 text-emerald-700 border-emerald-200",

                  flight.status === "Rejected" &&
                    "bg-red-100 text-red-700 border-red-200",

                  flight.status === "Draft" &&
                    "bg-orange-100 text-orange-700 border-orange-200",

                  flight.status === "Submitted" &&
                    "bg-sky-100 text-sky-700 border-sky-200",

                  flight.status === "Completed" &&
                    "bg-blue-100 text-blue-700 border-blue-200",

                  flight.status === "SentToVendor" &&
                    "bg-violet-100 text-violet-700 border-violet-200",

                  flight.status === "Confirmed" &&
                    "bg-cyan-100 text-cyan-700 border-cyan-200",

                  flight.status === "Cancelled" &&
                    "bg-slate-200 text-slate-700 border-slate-300",
                )}
              >
                {flight.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {flight.departureTime} • {flight.paxCount} pax •{" "}
              {flight.crewCount} crew • {flight.tailNumber}
            </p>
          </div>
        </div>
        <Link
          href={`/flights/${flight.id}`}
          className="w-full sm:w-auto text-center px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-[#1868A5] hover:text-white text-sm font-medium"
        >
          Manage Order
        </Link>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flights</h1>
          <p className="text-slate-500">
            {upcomingFlights.length} upcoming flights
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-[#1868A5] text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Flight
        </button>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Upcoming Flights
          </h2>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-slate-500">Loading...</div>
            ) : (
              upcomingFlights.map(renderFlightCard)
            )}
            {upcomingFlights.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                No upcoming flights found.
              </div>
            )}
          </div>
        </div>

        {pastFlights.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Past Flights
            </h2>
            <div className="space-y-4 opacity-75">
              {pastFlights.map(renderFlightCard)}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                Add New Flight
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-black hover:text-white hover:bg-[#1868A5] rounded-xl hover:rotate-180 transition-all duration-300 cursor-pointer p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* DATE + TIME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Flight Date *</Label>

                  <Input
                    type="date"
                    value={newFlight.date}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        date: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />

                  {errors.date && (
                    <p className="text-xs text-red-500">{errors.date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Departure Time</Label>

                  <Input
                    type="time"
                    value={newFlight.departureTime}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        departureTime: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* AIRPORTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Departure Airport *</Label>

                  <Input
                    value={newFlight.departure}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        departure: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="DXB"
                    className="h-11 rounded-xl uppercase"
                  />

                  {errors.departure && (
                    <p className="text-xs text-red-500">{errors.departure}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Arrival Airport *</Label>

                  <Input
                    value={newFlight.arrival}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        arrival: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="LHR"
                    className="h-11 rounded-xl uppercase"
                  />

                  {errors.arrival && (
                    <p className="text-xs text-red-500">{errors.arrival}</p>
                  )}
                </div>
              </div>

              {/* FLIGHT INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Flight Number</Label>

                  <Input
                    value={newFlight.flightNumber}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        flightNumber: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="PJ-101"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tail Number</Label>

                  <Input
                    value={newFlight.tailNumber}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        tailNumber: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="VP-BDJ"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* PAX */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Passengers *</Label>

                  <Input
                    type="number"
                    min="0"
                    value={newFlight.paxCount}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        paxCount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-11 rounded-xl"
                  />

                  {errors.paxCount && (
                    <p className="text-xs text-red-500">{errors.paxCount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Crew *</Label>

                  <Input
                    type="number"
                    min="0"
                    value={newFlight.crewCount}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        crewCount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-11 rounded-xl"
                  />

                  {errors.crewCount && (
                    <p className="text-xs text-red-500">{errors.crewCount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>

                  <Input
                    value="IST (UTC+5:30)"
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-slate-200 text-black "
                  />
                </div>
              </div>

              {/* PICKUP */}
              <div className="space-y-2">
                <Label>Pickup / Delivery Location</Label>

                <Input
                  value={newFlight.pickupLocation}
                  onChange={(e) =>
                    setNewFlight({
                      ...newFlight,
                      pickupLocation: e.target.value,
                    })
                  }
                  placeholder="Jetex FBO Dubai"
                  className="h-11 rounded-xl"
                />
              </div>

              {/* NOTES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Dietary Notes</Label>

                  <textarea
                    value={newFlight.dietaryNotes}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        dietaryNotes: e.target.value,
                      })
                    }
                    placeholder="1 pax halal..."
                    className="
          min-h-[120px]
          w-full
          rounded-2xl
          border
          border-input
          bg-background
          px-4
          py-3
          text-sm
          outline-none
          transition-all
          focus:ring-2
          focus:ring-ring
        "
                  />
                </div>

                <div className="space-y-2">
                  <Label>Service Style Notes</Label>

                  <textarea
                    value={newFlight.serviceStyleNotes}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        serviceStyleNotes: e.target.value,
                      })
                    }
                    placeholder="Full breakfast setup..."
                    className="
          min-h-[120px]
          w-full
          rounded-2xl
          border
          border-input
          bg-background
          px-4
          py-3
          text-sm
          outline-none
          transition-all
          focus:ring-2
          focus:ring-ring
        "
                  />
                </div>
              </div>

              {/* SPECIAL */}
              <div className="space-y-2">
                <Label>Special Instructions</Label>

                <textarea
                  value={newFlight.specialInstructions}
                  onChange={(e) =>
                    setNewFlight({
                      ...newFlight,
                      specialInstructions: e.target.value,
                    })
                  }
                  placeholder="Birthday cake for VIP passenger..."
                  className="
        min-h-[120px]
        w-full
        rounded-2xl
        border
        border-input
        bg-background
        px-4
        py-3
        text-sm
        outline-none
        transition-all
        focus:ring-2
        focus:ring-ring
      "
                />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>

              <Button
                onClick={handleCreateFlight}
                disabled={saving}
                className="rounded-xl px-6 bg-[#1868A5] text-white hover:bg-[#1868A5] hover:text-white"
              >
                {saving ? "Creating..." : "Create Flight"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
