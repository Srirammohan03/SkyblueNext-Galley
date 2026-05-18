// app\vendors\page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Store,
  Upload,
  Plus,
  Phone,
  Mail,
  Edit2,
  Trash2,
  X,
  Search,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const emptyVendor = {
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    serviceAirports: [],
    deliveryOptions: [],
    currency: "INR",
    taxNotes: "",
    notes: "",
  };
  const [newVendor, setNewVendor] = useState<any>(emptyVendor);
  const [airportInput, setAirportInput] = useState("");
  const [errors, setErrors] = useState<any>({});

  const loadData = async () => {
    const res = await fetch("/api/vendors");
    const data = await res.json();

    setVendors(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateVendor = () => {
    const newErrors: any = {};

    // COMPANY NAME
    if (!newVendor.name?.trim()) {
      newErrors.name = "Vendor name is required";
    } else if (newVendor.name.length < 2) {
      newErrors.name = "Vendor name is too short";
    }

    // EMAIL
    if (!newVendor.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(newVendor.email)
    ) {
      newErrors.email = "Invalid email address";
    }

    // PHONE
    if (!newVendor.phone?.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9+\-\s()]{6,20}$/.test(newVendor.phone)) {
      newErrors.phone = "Invalid phone number";
    }

    // CONTACT PERSON
    if (!newVendor.contactPerson?.trim()) {
      newErrors.contactPerson = "Contact person required";
    }

    // AIRPORTS
    if (!newVendor.serviceAirports?.length) {
      newErrors.serviceAirports = "At least one airport is required";
    }

    // ADDRESS
    if (!newVendor.address?.trim()) {
      newErrors.address = "Address is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };
  const handleSaveVendor = async () => {
    const isValid = validateVendor();

    if (!isValid) return;

    try {
      setSaving(true);

      const isEditing = !!newVendor.id;

      const res = await fetch("/api/vendors", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newVendor),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setIsModalOpen(false);

      setErrors({});

      setNewVendor(emptyVendor);

      await loadData();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!vendorToDelete?.id) return;

    try {
      const res = await fetch(`/api/vendors?id=${vendorToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      setVendors((prev) => prev.filter((v) => v.id !== vendorToDelete.id));

      setVendorToDelete(null);
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  };

  const deliveryOptionsList = [
    "FBO Delivery",
    "Ramp Delivery",
    "Pickup at Kitchen",
    "Hotel Lobby Pickup",
  ];

  const filteredVendors = vendors.filter((v) => {
    const name = v.name?.toLowerCase() || "";
    const email = v.email?.toLowerCase() || "";

    return (
      name.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase())
    );
  });
  const addAirport = () => {
    const airport = airportInput.trim().toUpperCase();

    const isValidIATA = /^[A-Z]{3,4}$/.test(airport);

    if (!airport) return;

    if (!isValidIATA) {
      setErrors((prev: any) => ({
        ...prev,
        serviceAirports: "Airport code must be 3-4 letters",
      }));

      return;
    }

    if (!newVendor.serviceAirports?.includes(airport)) {
      setNewVendor({
        ...newVendor,
        serviceAirports: [...(newVendor.serviceAirports || []), airport],
      });

      setErrors((prev: any) => ({
        ...prev,
        serviceAirports: "",
      }));
    }

    setAirportInput("");
  };
  const removeAirport = (airport: string) => {
    setNewVendor({
      ...newVendor,
      serviceAirports: newVendor.serviceAirports?.filter((a) => a !== airport),
    });
  };

  const toggleDeliveryOption = (option: string) => {
    const currentOptions = newVendor.deliveryOptions || [];
    if (currentOptions.includes(option)) {
      setNewVendor({
        ...newVendor,
        deliveryOptions: currentOptions.filter((o) => o !== option),
      });
    } else {
      setNewVendor({
        ...newVendor,
        deliveryOptions: [...currentOptions, option],
      });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-500 text-sm">
            {vendors.length} partners registered
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setErrors({});
              setNewVendor(emptyVendor);

              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-[#1868A5] text-white px-4 py-2 rounded-xl hover:bg-[#1868A5]/90 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="
  w-full
  h-11
  pl-10
  pr-4
  rounded-2xl
  border-slate-200
  bg-white

  transition-all

  focus-visible:ring-2
  focus-visible:ring-[#1868A5]
  focus-visible:border-[#1868A5]

  placeholder:text-slate-400
"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

              <p className="text-sm font-medium text-slate-500">
                Loading vendors...
              </p>
            </div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Store className="h-8 w-8 text-slate-400" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No vendors found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add your first catering vendor to begin.
            </p>

            <Button
              onClick={() => {
                setErrors({});
                setNewVendor(emptyVendor);
                setIsModalOpen(true);
              }}
              className="mt-6 rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </div>
        ) : (
          filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="
      bg-white
      rounded-3xl
      border
      border-slate-200
      shadow-sm
      hover:shadow-md
      transition-all

      p-5
      sm:p-6

      flex
      flex-col
      xl:flex-row
      xl:items-center
      justify-between

      gap-6
    "
            >
              {/* LEFT */}

              <div
                className="
        flex
        flex-col
        sm:flex-row
        gap-4
        min-w-0
        flex-1
      "
              >
                {/* ICON */}

                <div
                  className="
          w-14
          h-14
          rounded-2xl
          bg-[#1868A5]/10
          text-[#1868A5]

          flex
          items-center
          justify-center

          shrink-0
        "
                >
                  <Store className="w-6 h-6" />
                </div>

                {/* CONTENT */}

                <div className="min-w-0 flex-1">
                  {/* HEADER */}

                  <div
                    className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            gap-3
          "
                  >
                    <h3
                      className="
              font-bold
              text-slate-900
              text-lg
              break-words
            "
                    >
                      {vendor.name}
                    </h3>

                    <span
                      className="
              inline-flex
              items-center
              w-fit

              rounded-full
              bg-[#1868A5]/10
              border
              border-[#1868A5]/20

              px-3
              py-1

              text-[11px]
              font-bold
              text-[#1868A5]
            "
                    >
                      {vendor.currency}
                    </span>
                  </div>

                  {/* AIRPORTS */}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {vendor.serviceAirports?.map((a: string) => (
                      <span
                        key={a}
                        className="
                inline-flex
                items-center

                rounded-full

                px-3
                py-1

                text-[11px]
                font-semibold

                bg-[#1868A5]/10
                text-black
                border
                border-[#1868A5]/20
              "
                      >
                        {a}
                      </span>
                    ))}
                  </div>

                  {/* CONTACT */}

                  <div
                    className="
            mt-4
            grid
            grid-cols-1
            sm:grid-cols-2
            gap-3
          "
                  >
                    <div
                      className="
              flex
              items-center
              gap-2

              text-sm
              text-slate-500

              break-all
            "
                    >
                      <Mail className="w-4 h-4 text-[#1868A5] shrink-0" />
                      {vendor.email}
                    </div>

                    <div
                      className="
              flex
              items-center
              gap-2

              text-sm
              text-slate-500
            "
                    >
                      <Phone className="w-4 h-4 text-[#1868A5] shrink-0" />
                      {vendor.phone}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}

              <div
                className="
        w-full
        xl:w-auto

        flex
        flex-col
        gap-4
      "
              >
                {/* ACTION BUTTONS */}

                <div
                  className="
          grid
          grid-cols-1
          sm:grid-cols-2
          gap-3
          w-full
        "
                >
                  <Link
                    href={`/vendors/${vendor.id}/menu`}
                    className="
            h-11

            rounded-2xl

            bg-[#1868A5]/10
            text-[#1868A5]

            hover:bg-[#1868A5]
            hover:text-white

            transition-all

            flex
            items-center
            justify-center
            gap-2
                    px-4
            text-sm
            font-semibold
          "
                  >
                    <Store className="w-4 h-4" />
                    Menu
                  </Link>

                  <Link
                    href={`/vendors/import?vendorId=${vendor.id}`}
                    className="
            h-11

            rounded-2xl

            bg-slate-100
            text-slate-700

            hover:bg-slate-200

            transition-all

            flex
            items-center
            justify-center
            gap-2

            text-sm
            font-semibold
          "
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </Link>
                </div>

                {/* ICON ACTIONS */}

                <div
                  className="
          flex
          items-center
          justify-end
          gap-2
        "
                >
                  <button
                    onClick={() => {
                      setErrors({});

                      setNewVendor({
                        ...emptyVendor,
                        ...vendor,
                      });

                      setIsModalOpen(true);
                    }}
                    className="
            w-10
            h-10

            rounded-xl

            bg-[#1868A5]/10
            text-[#1868A5]

            hover:bg-[#1868A5]
            hover:text-white

            transition-all

            flex
            items-center
            justify-center
          "
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setVendorToDelete(vendor)}
                    className="
            w-10
            h-10

            rounded-xl

            bg-red-50
            text-red-600

            hover:bg-red-600
            hover:text-white

            transition-all

            flex
            items-center
            justify-center
          "
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal - Exactly same UI as your catalog ones for consistency */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {newVendor.id ? "Edit Vendor" : "Add New Vendor"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-black hover:text-white hover:bg-[#1868A5] rounded-xl p-2 hover:rotate-180 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* COMPANY NAME */}
              <div className="space-y-2">
                <Label>Vendor / Company Name *</Label>

                <Input
                  type="text"
                  aria-invalid={!!errors.name}
                  value={newVendor.name}
                  onChange={(e) =>
                    setNewVendor({
                      ...newVendor,
                      name: e.target.value,
                    })
                  }
                  placeholder="Skyline Catering Dubai"
                  className="h-11 rounded-xl"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 font-medium">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* CONTACT + PHONE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Contact Person</Label>

                  <Input
                    type="text"
                    aria-invalid={!!errors.contactPerson}
                    value={newVendor.contactPerson}
                    onChange={(e) =>
                      setNewVendor({
                        ...newVendor,
                        contactPerson: e.target.value,
                      })
                    }
                    placeholder="Sriram..."
                    className="h-11 rounded-xl"
                  />
                  {errors.contactPerson && (
                    <p className="text-xs text-red-500 font-medium">
                      {errors.contactPerson}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>

                  <Input
                    type="number"
                    min={0}
                    max={10}
                    aria-invalid={!!errors.phone}
                    value={newVendor.phone}
                    onChange={(e) =>
                      setNewVendor({
                        ...newVendor,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+971-4-555-0123"
                    className="h-11 rounded-xl"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 font-medium">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <Label>Email *</Label>

                <Input
                  aria-invalid={!!errors.email}
                  type="email"
                  value={newVendor.email}
                  onChange={(e) =>
                    setNewVendor({
                      ...newVendor,
                      email: e.target.value,
                    })
                  }
                  placeholder="orders@skylinecatering.ae"
                  className="h-11 rounded-xl"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 font-medium">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* ADDRESS */}
              <div className="space-y-2">
                <Label>Address</Label>

                <textarea
                  value={newVendor.address}
                  onChange={(e) =>
                    setNewVendor({
                      ...newVendor,
                      address: e.target.value,
                    })
                  }
                  placeholder="Hangar 7, Al Maktoum Int'l Airport"
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
                {errors.address && (
                  <p className="text-xs text-red-500 font-medium">
                    {errors.address}
                  </p>
                )}
              </div>

              {/* AIRPORTS */}
              <div className="space-y-3">
                <Label>Service Airports *</Label>

                <div className="flex gap-2">
                  <Input
                    aria-invalid={!!errors.serviceAirports}
                    value={airportInput}
                    onChange={(e) => setAirportInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addAirport())
                    }
                    placeholder="Enter IATA Code (DXB)"
                    className="h-11 rounded-xl"
                  />

                  <Button
                    type="button"
                    onClick={addAirport}
                    className="h-11 rounded-xl px-6 bg-[#1868A5] text-white hover:bg-[#1868A5] hover:text-white transition-all duration-200"
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {newVendor.serviceAirports?.map((airport) => (
                    <div
                      key={airport}
                      className="
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-blue-100
            bg-blue-50
            px-3
            py-1.5
            text-xs
            font-semibold
            text-[#1868A5]
          "
                    >
                      {airport}

                      <button
                        type="button"
                        onClick={() => removeAirport(airport)}
                        className="text-blue-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {errors.serviceAirports && (
                  <p className="text-xs text-red-500 font-medium">
                    {errors.serviceAirports}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-800">
                  Vendor Currency
                </Label>

                <div className="relative">
                  <select
                    value={newVendor.currency}
                    onChange={(e) =>
                      setNewVendor({
                        ...newVendor,
                        currency: e.target.value,
                      })
                    }
                    className="
        w-full
        h-12

        appearance-none

        rounded-2xl
        border
        border-slate-200

        bg-white

        px-4
        pr-12

        text-sm
        font-semibold
        text-slate-900

        shadow-sm

        transition-all
        duration-200

        outline-none

        hover:border-[#1868A5]/40

        focus-visible:border-[#1868A5]
        focus-visible:ring-4
        focus-visible:ring-[#1868A5]/10

        disabled:cursor-not-allowed
        disabled:opacity-50
      "
                  >
                    <option value="INR">🇮🇳 INR — Indian Rupee</option>

                    <option value="USD">🇺🇸 USD — US Dollar</option>

                    <option value="AED">🇦🇪 AED — UAE Dirham</option>

                    <option value="EUR">🇪🇺 EUR — Euro</option>

                    <option value="GBP">🇬🇧 GBP — British Pound</option>

                    <option value="SAR">🇸🇦 SAR — Saudi Riyal</option>

                    <option value="QAR">🇶🇦 QAR — Qatari Riyal</option>
                  </select>

                  {/* ICON */}

                  <div
                    className="
        pointer-events-none
        absolute
        inset-y-0
        right-4

        flex
        items-center

        text-slate-400
      "
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* INFO CARD */}

                <div
                  className="
      rounded-2xl

      border
      border-[#1868A5]/10

      bg-[#1868A5]/5

      px-4
      py-3
    "
                >
                  <p
                    className="
        text-xs
        sm:text-sm

        font-medium
        text-[#1868A5]

        leading-relaxed
      "
                  >
                    All imported menu pricing will default to{" "}
                    <span className="font-bold">{newVendor.currency}</span>
                  </p>
                </div>

                {/* ERROR */}

                {errors.currency && (
                  <p className="text-xs font-medium text-red-500">
                    {errors.currency}
                  </p>
                )}
              </div>

              {/* DELIVERY OPTIONS */}
              <div className="space-y-3">
                <Label>Delivery / Pickup Options</Label>

                <div className="flex flex-wrap gap-2">
                  {deliveryOptionsList.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleDeliveryOption(option)}
                      className={`
            rounded-full
            border
            px-4
            py-2
            text-xs
            font-semibold
            transition-all
            ${
              newVendor.deliveryOptions?.includes(option)
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }
          `}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3 bg-slate-50 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <Button
                onClick={handleSaveVendor}
                disabled={saving}
                className="w-full sm:w-auto rounded-xl px-6 bg-[#1868A5] text-white hover:bg-[#1868A5] hover:text-white transition-all duration-200"
              >
                {saving
                  ? "Saving..."
                  : newVendor.id
                    ? "Save Changes"
                    : "Add Vendor"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {vendorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Delete Vendor
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>

              <button
                onClick={() => setVendorToDelete(null)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* BODY */}
            <div className="px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {vendorToDelete.name}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Deleting this vendor will also remove:
                  </p>

                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    <li>• Vendor menu items</li>
                    <li>• Connected flight orders</li>
                    <li>• Vendor references</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setVendorToDelete(null)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
