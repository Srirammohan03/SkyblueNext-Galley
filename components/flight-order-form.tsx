// components\flight-order-form.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Plus,
  Search,
  Trash2,
  Save,
  Send,
  Plane,
  ArrowLeft,
  Utensils,
  Store,
  ChevronDown,
} from "lucide-react";

import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Label } from "@/components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/components/ui/use-toast";
import DownloadPDFButton from "./download-pdf-button";
import VendorPDFButton from "./vendor-pdf-button";

interface FlightOrderFormProps {
  id?: string;
  initialData?: any;
  isReviewMode?: boolean;
}

interface Vendor {
  id: string;
  name: string;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  type: string;
  unit: string;
  defaultQty: number;
}

interface VendorMenuItem {
  id: string;
  vendorId: string;
  catalogItemId?: string;
  name: string;
  category?: string;
  unit?: string;
  currency?: string;
  price?: number;
}

export default function FlightOrderForm({
  id,
  initialData,
  isReviewMode = false,
}: FlightOrderFormProps) {
  const router = useRouter();

  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [vendorItems, setVendorItems] = useState<VendorMenuItem[]>([]);

  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  const [catalogSearch, setCatalogSearch] = useState("");

  const [catalogFilter, setCatalogFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  useEffect(() => {
    setCategoryFilter("All");
  }, [catalogFilter, selectedVendorIds]);
  const [flightOpen, setFlightOpen] = useState(false);
  const now = new Date();

  const localDateTime =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0") +
    "T" +
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: initialData || {
      flightNumber: "",
      tailNumber: "",
      departure: "",
      arrival: "",
      date: localDateTime,
      paxCount: 1,
      crewCount: 1,
      timezone: "IST (UTC+5:30)",
      pickupLocation: "",
      dietaryNotes: "",
      serviceStyleNotes: "",
      specialInstructions: "",
      status: "Draft",
      items: [],
      deliveryDate: "",
      deliveryTime: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const [restoredItems, setRestoredItems] = useState<any[]>([]);
  const tailNumber = watch("tailNumber");

  useEffect(() => {
    const fetchRestored = async () => {
      if (
        !tailNumber ||
        tailNumber.trim() === "" ||
        tailNumber.trim().toUpperCase() === "TBD"
      ) {
        setRestoredItems([]);
        return;
      }
      try {
        const res = await axios.get(
          `/api/restored-items?tailNumber=${tailNumber}`,
        );
        setRestoredItems(res.data);
      } catch (err) {
        console.error("Failed to fetch restored items", err);
      }
    };
    fetchRestored();
  }, [tailNumber]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsRes, catalogRes] = await Promise.all([
          axios.get("/api/vendors"),
          axios.get("/api/catalog?type=food"),
        ]);

        setVendors(vendorsRes.data);

        setCatalog(catalogRes.data);

        if (initialData) {
          reset({
            ...initialData,
            date:
              initialData.date && initialData.departureTime
                ? (() => {
                    const d = new Date(initialData.date);

                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");

                    return `${year}-${month}-${day}T${initialData.departureTime}`;
                  })()
                : "",
            items:
              initialData.items?.map((item: any) => ({
                ...item,

                vendorId: item.vendorId || "",

                vendorName: item.vendorName || item.vendor?.name || "",

                vendor: item.vendor || null,
              })) || [],
            deliveryDate: initialData.deliveryDate || "",
            deliveryTime: initialData.deliveryTime || "",
          });
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadData();
  }, [initialData, reset]);

  useEffect(() => {
    const loadVendorMenus = async () => {
      if (!selectedVendorIds.length) {
        setVendorItems([]);
        return;
      }

      try {
        const responses = await Promise.all(
          selectedVendorIds.map((id) => axios.get(`/api/vendors/${id}/menu`)),
        );

        const merged = responses.flatMap((r) => r.data);
        console.log("VENDOR MENU RESPONSE", merged);
        setVendorItems(merged);
      } catch (error) {
        console.error(error);
      }
    };

    loadVendorMenus();
  }, [selectedVendorIds]);

  const displayedItems = useMemo(() => {
    if (catalogFilter === "Restored") {
      return restoredItems.filter((item: any) => {
        return item.name?.toLowerCase().includes(catalogSearch.toLowerCase());
      });
    }

    const source = selectedVendorIds.length > 0 ? vendorItems : catalog;

    return source.filter((item: any) => {
      if (item.isAvailable === false) {
        return false;
      }
      const itemType = item.type?.toLowerCase()?.trim() || "food";

      const itemCategory = item.category || "";
      const matchesSearch = item.name
        ?.toLowerCase()
        .includes(catalogSearch.toLowerCase());

      const matchesType =
        catalogFilter === "All"
          ? true
          : itemType === catalogFilter.toLowerCase().trim();

      const matchesCategory =
        categoryFilter === "All" || itemCategory === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [
    vendorItems,
    catalog,
    restoredItems,
    catalogSearch,
    catalogFilter,
    categoryFilter,
    selectedVendorIds,
  ]);

  const availableCategories = useMemo(() => {
    if (catalogFilter === "Restored") {
      return Array.from(
        new Set(
          restoredItems.map((item: any) => item.category).filter(Boolean),
        ),
      );
    }

    const source = selectedVendorIds.length > 0 ? vendorItems : catalog;

    const filteredByType =
      catalogFilter === "All"
        ? source
        : source.filter((item: any) => {
            // FALLBACK TYPE
            const itemType = item.type?.toLowerCase()?.trim() || "food";

            return itemType === catalogFilter.toLowerCase().trim();
          });

    const uniqueCategories = Array.from(
      new Set(filteredByType.map((item: any) => item.category).filter(Boolean)),
    );

    return uniqueCategories;
  }, [catalog, vendorItems, restoredItems, selectedVendorIds, catalogFilter]);
  const addItemToOrder = (item: any) => {
    const existingIndex = watchItems.findIndex(
      (orderItem: any) =>
        orderItem.itemId === (item.catalogItemId || item.id) &&
        orderItem.vendorId === (item.vendorId || null),
    );

    // If it's a restored item, make sure we don't exceed returnedQty
    if (item.isRestored) {
      const currentQty =
        existingIndex !== -1 ? Number(watchItems[existingIndex]?.quantity) : 0;
      if (currentQty >= item.returnedQty) {
        toast({
          title: "Insufficient restored quantity",
          description: `Only ${item.returnedQty} items are available from restored stock.`,
          variant: "destructive",
        });
        return;
      }
    }

    // IF ITEM ALREADY EXISTS → INCREASE QTY
    if (existingIndex !== -1) {
      const currentQty = Number(watchItems[existingIndex]?.quantity) || 1;

      setValue(`items.${existingIndex}.quantity`, currentQty + 1);

      return;
    }

    // OTHERWISE ADD NEW ITEM
    const vendor = vendors.find((v) => v.id === item.vendorId);

    append({
      itemId: item.catalogItemId || item.id,

      vendorId: item.vendorId || null,

      vendorName: vendor?.name || null,

      vendor: item.vendor || null,

      name: item.name,

      quantity: 1,

      type: item.type || "custom",

      category: item.category || "",

      unit: item.unit || "",

      currency: item.currency || "INR",

      price: Number(item.price) || 0,

      notes: "",

      dietaryTags: item.dietaryTags || [],

      isRestored: item.isRestored || false,
    });
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        deliveryDate: data.deliveryDate || null,
        deliveryTime: data.deliveryTime || null,
        items: data.items.map((item: any) => ({
          ...item,

          quantity: Number(item.quantity),

          price: Number(item.price) || 0,

          vendorId: item.vendorId || null,

          vendorName: item.vendorName || item.vendor?.name || null,
        })),
      };

      if (id) {
        await axios.put(`/api/flights/${id}`, payload);

        toast({
          title: "Flight updated",
        });
      } else {
        await axios.post("/api/flights", payload);

        toast({
          title: "Flight created",
        });
      }

      router.push("/flights");

      router.refresh();
    } catch (error) {
      console.error(error);

      toast({
        title: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const watchItems = watch("items", fields);

  const getAddedRestoredQty = (item: any) => {
    const orderItem = watchItems?.find(
      (oi: any) => oi.itemId === (item.catalogItemId || item.id),
    );
    return orderItem ? Number(orderItem.quantity) : 0;
  };

  const getMaxQty = (orderItem: any) => {
    if (
      orderItem.isRestored ||
      orderItem.notes === "Restored from previous flight"
    ) {
      const restored = restoredItems.find(
        (r) => r.catalogItemId === orderItem.itemId,
      );
      return restored ? restored.returnedQty : 99999;
    }
    return 99999;
  };

  const vendorTotals = watchItems.reduce((acc: any, item: any) => {
    const key = item.vendorName || item.vendor?.name || "Flight Menu";

    const total = (Number(item.price) || 0) * (Number(item.quantity) || 0);

    acc[key] = (acc[key] || 0) + total;

    return acc;
  }, {});

  const grandTotal = Object.values(vendorTotals).reduce(
    (sum: any, total: any) => sum + Number(total),
    0,
  );
  const usedVendors = Array.from(
    new Map(
      watchItems
        ?.filter((item: any) => item.vendorId)
        .map((item: any) => [
          item.vendorId,
          {
            vendorId: item.vendorId,
            vendorName: item.vendorName || item.vendor?.name || "Vendor",
          },
        ]),
    ).values(),
  );
  const lockedStatuses = [
    "Rejected",
    "Cancelled",
    "Completed",
    "Confirmed",
    "Delivered",
  ];

  const isLocked =
    initialData?.status && lockedStatuses.includes(initialData.status);
  return (
    <div className="space-y-8">
      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="rounded-2xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {id ? "Edit Flight Order" : "New Flight Order"}
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Build catering order with vendor-based menus
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {isReviewMode && !isLocked && (
            <div className="flex flex-wrap gap-3">
              {/* OVERALL PDF */}
              <DownloadPDFButton order={initialData} />

              {/* VENDOR PDFs */}
              {usedVendors.map((vendor: any) => (
                <VendorPDFButton
                  key={vendor.vendorId}
                  order={initialData}
                  vendorId={vendor.vendorId}
                  vendorName={vendor.vendorName}
                />
              ))}

              {/* SUBMIT */}
              <Button
                onClick={handleSubmit((data) =>
                  onSubmit({
                    ...data,
                    status: "Submitted",
                  }),
                )}
                disabled={loading}
                className="rounded-2xl bg-[#1868A5] text-white hover:bg-[#145588]"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit Changes
              </Button>
            </div>
          )}

          {!isReviewMode && !isLocked && (
            <>
              <Button
                variant="outline"
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
                className="rounded-2xl"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>

              <Button
                onClick={handleSubmit((data) =>
                  onSubmit({
                    ...data,
                    status: "Submitted",
                  }),
                )}
                disabled={loading}
                className="rounded-2xl bg-[#1868A5] text-white hover:bg-[#1868A5] hover:text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LEFT */}

        <div className="xl:col-span-2 space-y-8">
          {/* FLIGHT DETAILS */}

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader
              onClick={() => setFlightOpen((prev) => !prev)}
              className="
      border-b
      bg-slate-50/60
      cursor-pointer
      select-none
    "
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Flight Details
                  </CardTitle>

                  <CardDescription>
                    Operational flight information
                  </CardDescription>
                </div>

                <ChevronDown
                  className={`
          h-5
          w-5
          transition-transform
          duration-300
          ${flightOpen ? "rotate-180" : ""}
        `}
                />
              </div>
            </CardHeader>

            {flightOpen && (
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Flight Number</Label>

                    <Input
                      {...register("flightNumber")}
                      placeholder="PJ-101"
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tail Number</Label>

                    <Input
                      {...register("tailNumber")}
                      placeholder="VP-BDJ"
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Departure</Label>

                    <Input
                      {...register("departure")}
                      placeholder="DXB"
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arrival</Label>

                    <Input
                      {...register("arrival")}
                      placeholder="LHR"
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date & Time</Label>

                    <Input
                      type="datetime-local"
                      {...register("date")}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pax</Label>

                      <Input
                        type="number"
                        {...register("paxCount")}
                        className="rounded-xl h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Crew</Label>

                      <Input
                        type="number"
                        {...register("crewCount")}
                        className="rounded-xl h-11"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* VENDOR SELECT */}
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50/60">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Vendor Selection
              </CardTitle>

              <CardDescription>Select one or multiple vendors</CardDescription>
            </CardHeader>

            <CardContent className="p-8">
              <div className="flex flex-wrap gap-3">
                {vendors.map((vendor) => {
                  const active = selectedVendorIds.includes(vendor.id);

                  return (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setSelectedVendorIds((prev) =>
                            prev.filter((id) => id !== vendor.id),
                          );
                        } else {
                          setSelectedVendorIds((prev) => [...prev, vendor.id]);
                        }
                      }}
                      className={`
                          rounded-2xl
                          border
                          px-4
                          py-2.5
                          text-sm
                          font-semibold
                          transition-all
                          ${
                            active
                              ? "bg-[#1868A5] text-white border-[#1868A5]"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }
                        `}
                    >
                      {vendor.name}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {/* ORDER ITEMS */}
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Order Items
                </CardTitle>
                <CardDescription>Add vendor or catalog items</CardDescription>
              </div>
              {/* 
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  append({
                    itemId: "custom",
                    name: "",
                    quantity: 1,
                    notes: "",
                    type: "custom",
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Custom
              </Button> */}
            </CardHeader>

            <CardContent className="p-0">
              {/* Mobile: Card Layout | Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-8">Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-14"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {fields.map((field: any, index: number) => {
                      const itemTotal =
                        (Number(watchItems[index]?.price) || 0) *
                        (Number(watchItems[index]?.quantity) || 0);

                      return (
                        <TableRow key={field.id}>
                          <TableCell className="pl-8">
                            <div
                              className="
    min-w-[180px]
    rounded-xl
    border
    border-slate-200
    bg-slate-50
    px-4
    py-2.5
    text-sm
    font-semibold
    text-slate-800
  "
                            >
                              {field.name}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={watchItems[index]?.quantity || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const max = getMaxQty(watchItems[index]);
                                if (val > max) {
                                  toast({
                                    title: "Insufficient restored quantity",
                                    description: `Only ${max} items are available from restored stock.`,
                                    variant: "destructive",
                                  });
                                  setValue(`items.${index}.quantity`, max);
                                } else {
                                  setValue(`items.${index}.quantity`, val);
                                }
                              }}
                              className="w-20 rounded-xl"
                            />
                          </TableCell>

                          <TableCell>
                            {field.vendorId ? (
                              <div
                                className="
        inline-flex
        items-center
        rounded-xl
        border
        border-emerald-200
        bg-emerald-50
        px-3
        py-2
        text-xs
        font-semibold
        text-emerald-700
      "
                              >
                                {field.vendor?.name ||
                                  field.vendorName ||
                                  vendors.find((v) => v.id === field.vendorId)
                                    ?.name ||
                                  "Vendor"}
                              </div>
                            ) : (
                              <div
                                className="
        inline-flex
        items-center
        rounded-xl
        border
        border-slate-200
        bg-slate-100
        px-3
        py-2
        text-xs
        font-semibold
        text-slate-600
      "
                              >
                                Global Catalog
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            <Input
                              value={watchItems[index]?.notes || ""}
                              onChange={(e) =>
                                setValue(`items.${index}.notes`, e.target.value)
                              }
                              className="rounded-xl"
                            />
                          </TableCell>

                          <TableCell className="font-semibold text-slate-700">
                            ₹{itemTotal.toLocaleString()}
                          </TableCell>

                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!fields.length && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-slate-400"
                        >
                          No items added yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y">
                {fields.map((field: any, index: number) => {
                  const itemTotal =
                    (Number(watchItems[index]?.price) || 0) *
                    (Number(watchItems[index]?.quantity) || 0);

                  return (
                    <div
                      key={field.id}
                      className="p-5 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div
                            className="
    min-w-[180px]
    rounded-xl
    border
    border-slate-200
    bg-slate-50
    px-4
    py-2.5
    text-sm
    font-semibold
    text-slate-800
  "
                          >
                            {field.name}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20">
                              <Input
                                type="number"
                                min={1}
                                value={watchItems[index]?.quantity || ""}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const max = getMaxQty(watchItems[index]);
                                  if (val > max) {
                                    toast({
                                      title: "Insufficient restored quantity",
                                      description: `Only ${max} items are available from restored stock.`,
                                      variant: "destructive",
                                    });
                                    setValue(`items.${index}.quantity`, max);
                                  } else {
                                    setValue(`items.${index}.quantity`, val);
                                  }
                                }}
                                className="w-20 rounded-xl"
                              />
                            </div>
                            <span className="text-slate-400 text-sm">×</span>
                            <div className="font-semibold text-lg text-slate-800">
                              ₹{itemTotal.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-500 -mt-1 -mr-1"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Vendor & Notes */}
                      <div className="space-y-3">
                        <div>
                          {field.vendorId ? (
                            <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                              {field.vendor?.name ||
                                field.vendorName ||
                                "Vendor"}
                            </div>
                          ) : (
                            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                              Global Catalog
                            </div>
                          )}
                        </div>

                        <Input
                          value={watchItems[index]?.notes || ""}
                          onChange={(e) =>
                            setValue(`items.${index}.notes`, e.target.value)
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  );
                })}

                {!fields.length && (
                  <div className="p-12 text-center text-slate-400">
                    No items added yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {watchItems.length > 0 && (
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-slate-50/60">
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Delivery Schedule
                </CardTitle>

                <CardDescription>
                  Set delivery date & time for vendors
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DELIVERY DATE */}
                  <div className="space-y-2">
                    <Label>Delivery Date</Label>

                    <Input
                      type="date"
                      {...register("deliveryDate", {
                        required:
                          watchItems.length > 0
                            ? "Delivery date is required"
                            : false,
                      })}
                      className="h-12 rounded-xl"
                    />

                    {errors.deliveryDate && (
                      <p className="text-sm font-medium text-red-500">
                        {String(errors.deliveryDate.message)}
                      </p>
                    )}
                  </div>

                  {/* DELIVERY TIME */}
                  <div className="space-y-2">
                    <Label>Delivery Time</Label>

                    <Input
                      type="time"
                      {...register("deliveryTime", {
                        required:
                          watchItems.length > 0
                            ? "Delivery time is required"
                            : false,
                      })}
                      className="h-12 rounded-xl"
                    />

                    {errors.deliveryTime && (
                      <p className="text-sm font-medium text-red-500">
                        {String(errors.deliveryTime.message)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* MOBILE VENDOR MENU */}
          <div className="xl:hidden">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/60 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-[#1868A5] text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight">
                      {selectedVendorIds.length
                        ? "Vendor Menu"
                        : "Global Catalog"}
                    </CardTitle>

                    <CardDescription className="mt-1 text-slate-300">
                      Click any item to add into the order
                    </CardDescription>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {displayedItems?.length} Items
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-5">
                {/* SEARCH */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    placeholder={
                      selectedVendorIds.length
                        ? "Search vendor menu..."
                        : "Search catalog..."
                    }
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="h-11 rounded-2xl border-slate-200 pl-10 shadow-none"
                  />
                </div>
                {/* TYPE FILTERS */}
                <div className="flex flex-wrap gap-2">
                  {["All", "food"].map((type) => {
                    const active = catalogFilter === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCatalogFilter(type)}
                        className={`
          rounded-full
          px-4
          py-2
          text-xs
          font-semibold
          capitalize
          transition-all
          duration-200
          ${
            active
              ? "bg-slate-900 text-white shadow-md"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }
        `}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>

                {/* CATEGORY FILTERS */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("All")}
                    className={`
      rounded-full
      px-3
      py-1.5
      text-[11px]
      font-semibold
      transition-all
      ${
        categoryFilter === "All"
          ? "bg-[#1868A5] text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
      }
    `}
                  >
                    All
                  </button>

                  {availableCategories.map((category) => {
                    const active = categoryFilter === category;

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setCategoryFilter(category)}
                        className={`
          rounded-full
          px-3
          py-1.5
          text-[11px]
          font-semibold
          transition-all
          ${
            active
              ? "bg-[#1868A5] text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }
        `}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
                {/* ITEMS */}
                <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                  {displayedItems?.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItemToOrder(item)}
                      className="
              group
              w-full
              rounded-2xl
              border
              border-slate-100
              bg-white
              p-4
              text-left
              transition-all
              duration-200
              hover:border-slate-300
              hover:shadow-md
            "
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {item.name}
                          </p>
                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                          <Plus className="h-4 w-4 text-slate-700" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50/60">
              <CardTitle>Cost Summary</CardTitle>

              <CardDescription>Vendor-wise and overall totals</CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.entries(vendorTotals).map(([vendorName, total]) => (
                  <div
                    key={vendorName}
                    className="
              flex
              items-center
              justify-between
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              px-5
              py-4
            "
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {vendorName}
                      </p>

                      <p className="text-xs text-slate-500">Vendor subtotal</p>
                    </div>

                    <div className="text-lg font-bold text-slate-900">
                      ₹{Number(total).toLocaleString()}
                    </div>
                  </div>
                ))}

                <div
                  className="
          flex
          items-center
          justify-between
          rounded-2xl
          bg-[#1868A5]
          text-white
          px-5
          py-5
        "
                >
                  <div>
                    <p className="text-lg font-bold text-white">Grand Total</p>

                    <p className="text-xs text-slate-300">
                      All vendors + global items
                    </p>
                  </div>

                  <div className="text-2xl font-bold">
                    ₹{grandTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR */}

        <div className="hidden xl:block w-full xl:w-[380px] shrink-0">
          <Card className="sticky top-6 overflow-hidden rounded-[28px] border border-slate-200/60 bg-white shadow-sm">
            {/* HEADER */}

            <CardHeader className="border-b border-slate-100 bg-[#1868A5] text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">
                    {selectedVendorIds.length
                      ? "Vendor Menu"
                      : "Global Catalog"}
                  </CardTitle>

                  <CardDescription className="mt-1 text-slate-300">
                    Click any item to add into the order
                  </CardDescription>
                </div>

                <div className="rounded-2xl bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {displayedItems?.length} Items
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              {/* SEARCH */}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <Input
                  placeholder={
                    selectedVendorIds.length
                      ? "Search vendor menu..."
                      : "Search catalog..."
                  }
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="
              h-11
              rounded-2xl
              border-slate-200
              pl-10
              shadow-none
              focus-visible:ring-slate-900/10
            "
                />
              </div>

              {/* TYPE FILTERS */}
              <div className="flex flex-wrap gap-2">
                {[
                  "All",
                  "food",
                  // ...(restoredItems.length > 0 ? ["Restored"] : []),
                ].map((type) => {
                  const active = catalogFilter === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCatalogFilter(type)}
                      className={`
          rounded-full
          px-4
          py-2
          text-xs
          font-semibold
          capitalize
          transition-all
          duration-200
          ${
            active
              ? "bg-slate-900 text-white shadow-md"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }
        `}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              {/* CATEGORY FILTERS */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("All")}
                  className={`
      rounded-full
      px-3
      py-1.5
      text-[11px]
      font-semibold
      transition-all
      ${
        categoryFilter === "All"
          ? "bg-[#1868A5] text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
      }
    `}
                >
                  All
                </button>

                {availableCategories.map((category) => {
                  const active = categoryFilter === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setCategoryFilter(category)}
                      className={`
          rounded-full
          px-3
          py-1.5
          text-[11px]
          font-semibold
          transition-all
          ${
            active
              ? "bg-[#1868A5] text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }
        `}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {/* ITEMS */}

              <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
                {displayedItems.map((item: any) => {
                  const remainingRestored = item.isRestored
                    ? item.returnedQty - getAddedRestoredQty(item)
                    : 999;
                  const isFullyUsed = item.isRestored && remainingRestored <= 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isFullyUsed}
                      onClick={() => addItemToOrder(item)}
                      className={`
                        group
                        w-full
                        rounded-2xl
                        border
                        border-slate-100
                        bg-white
                        p-4
                        text-left
                        transition-all
                        duration-200
                        ${
                          isFullyUsed
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:border-slate-300 hover:shadow-md"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-slate-700">
                            {item.name}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {item.isRestored ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                {remainingRestored} of {item.returnedQty}{" "}
                                restored available
                              </span>
                            ) : (
                              item.category && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                  {item.category}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div
                          className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      bg-slate-100
                      transition-all
                      group-hover:bg-slate-900
                    "
                        >
                          <Plus className="h-4 w-4 text-slate-700 group-hover:text-white" />
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!displayedItems.length && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
                      <Search className="h-7 w-7 text-slate-400" />
                    </div>

                    <h3 className="mt-4 text-base font-bold text-slate-900">
                      No items found
                    </h3>

                    <p className="mt-1 max-w-[220px] text-sm text-slate-500">
                      Try adjusting search or filters to find items.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
