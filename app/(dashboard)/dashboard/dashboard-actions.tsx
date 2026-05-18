"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, PlaneTakeoff, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardActions() {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<any>({});

  const emptyFlight = {
    date: new Date().toISOString().slice(0, 10),
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

  const [newFlight, setNewFlight] = useState(emptyFlight);

  const validateFlight = () => {
    const newErrors: any = {};

    if (!newFlight.date) {
      newErrors.date = "Flight date required";
    }

    if (!newFlight.departure.trim()) {
      newErrors.departure = "Departure airport required";
    }

    if (!newFlight.arrival.trim()) {
      newErrors.arrival = "Arrival airport required";
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
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="
            w-full
            sm:w-auto
            bg-[#1868A5]
            hover:bg-[#14598f]
            text-white
            rounded-2xl
            h-12
            px-6
            font-semibold
          "
        >
          <Plus className="w-4 h-4 mr-2" />
          New Flight
        </Button>

        <Link href="/flights" className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full rounded-2xl h-12 px-6 font-semibold"
          >
            <PlaneTakeoff className="w-4 h-4 mr-2" />
            View Flights
          </Button>
        </Link>
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

                  <Select
                    value={newFlight.timezone}
                    onValueChange={(value) =>
                      setNewFlight({
                        ...newFlight,
                        timezone: value,
                      })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>

                    <SelectContent className="rounded-xl">
                      <SelectItem value="IST (UTC+5:30)">
                        IST (UTC+5:30)
                      </SelectItem>
                      <SelectItem value="GST (UTC+4)">GST (UTC+4)</SelectItem>

                      <SelectItem value="UTC">UTC</SelectItem>

                      <SelectItem value="CET (UTC+1)">CET (UTC+1)</SelectItem>

                      <SelectItem value="EST (UTC-5)">EST (UTC-5)</SelectItem>

                      <SelectItem value="PST (UTC-8)">PST (UTC-8)</SelectItem>
                    </SelectContent>
                  </Select>
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
    </>
  );
}
