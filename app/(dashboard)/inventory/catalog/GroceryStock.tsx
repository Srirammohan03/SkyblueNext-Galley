// app\(dashboard)\inventory\catalog\GroceryStock.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus,
  Star,
  Trash2,
  Edit2,
  X,
  Upload,
  Search,
  Package,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Papa, { ParseResult } from "papaparse";
import { useSearchParams } from "next/navigation";
// import ReceiveDrawer from "@/components/inventory/ReceiveDrawer";

import {
  displayWarehouseStock,
  type CatalogItemConfig,
} from "@/lib/inventory/conversion";

import { isLowStock } from "@/lib/inventory/threshold";
import ReceiveDrawer from "@/components/inventory/ReceiveDrawer";

interface CatalogItem {
  id: string;
  type: string;
  name: string;
  category: string;
  subcategory?: string;
  unit: string;
  defaultQty?: number | null;
  price?: number;
  currency?: string;
  isAvailable?: boolean;
  isFavorite?: boolean;
  dietaryTags?: string[];
  allergens?: string[];
  notes?: string;

  baseUnit?: string;
  packEnabled?: boolean;
  packSize?: number | null;
  packLabel?: string | null;

  reorderThresholdType?: string;
  reorderThresholdValue?: number;
}

interface Balance {
  id: string;
  itemId: string;
  onHandBaseUnits: number;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

export default function GroceryStock() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [warehouseLocation, setWarehouseLocation] = useState<Location | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  const initialFormState: Partial<CatalogItem> = {
    type: "grocery",
    name: "",
    category: "",
    subcategory: "",
    unit: "bottle",
    defaultQty: undefined,
    price: 0,
    currency: "INR",
    isAvailable: true,
    isFavorite: false,
    dietaryTags: [],
    allergens: [],
    notes: "",

    baseUnit: "unit",
    packEnabled: false,
    packSize: null,
    packLabel: "",
    reorderThresholdType: "PACK",
    reorderThresholdValue: 10,
  };

  const [newItem, setNewItem] =
    useState<Partial<CatalogItem>>(initialFormState);

  const categories = [
    "All",
    "Alcohol",
    "Bakery",
    "Beverages",
    "Dairy",
    "Snacks",
    "Supplies",
  ];

  const dietaryOptions = [
    "Vegan",
    "Vegetarian",
    "Halal",
    "Kosher",
    "Gluten-Free",
    "Dairy-Free",
    "Nut-Free",
  ];

  const allergenOptions = [
    "Dairy",
    "Gluten",
    "Nuts",
    "Eggs",
    "Fish",
    "Shellfish",
    "Soy",
    "Sesame",
    "Sulfites",
  ];

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [catalogRes, locRes] = await Promise.all([
        fetch("/api/catalog?type=grocery"),
        fetch("/api/inventory/locations?type=WAREHOUSE"),
      ]);

      const catalogData = await catalogRes.json();
      const locations: Location[] = await locRes.json();

      setItems(catalogData);

      const warehouse =
        locations.find((loc) => loc.type === "WAREHOUSE") ?? null;

      setWarehouseLocation(warehouse);
      console.log("WAREHOUSE:", warehouse);
      if (warehouse) {
        const balanceRes = await fetch(
          `/api/inventory/balances?locationId=${warehouse.id}`,
        );
        console.log("FETCHING BALANCES FOR:", warehouse.id);
        const balanceData = await balanceRes.json();
        console.log("BALANCES:", balanceData);
        setBalances(balanceData);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const receive = searchParams.get("receive");

    if (receive === "true" && warehouseLocation) {
      setShowReceive(true);
    }
  }, [searchParams, warehouseLocation]);
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let result = [...items];

    if (activeCategory !== "All") {
      result = result.filter((item) => item.category === activeCategory);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();

      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          item.category.toLowerCase().includes(lower),
      );
    }

    setFilteredItems(result);
  }, [items, searchTerm, activeCategory]);

  const balanceMap: Record<string, Balance> = {};

  for (const bal of balances) {
    balanceMap[bal.itemId] = bal;
  }

  const alertCount = filteredItems.filter((item) => {
    const qty = balanceMap[item.id]?.onHandBaseUnits ?? 0;

    return isLowStock(qty, item as any);
  }).length;

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.category) {
      alert("Item Name and Category are required!");
      return;
    }

    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newItem),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewItem(initialFormState);

        await loadData();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save item.");
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete?.id) return;

    try {
      await fetch(`/api/catalog?id=${itemToDelete.id}`, {
        method: "DELETE",
      });

      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));

      setItemToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = async (item: CatalogItem) => {
    const updated = {
      ...item,
      isFavorite: !item.isFavorite,
    };

    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));

    await fetch("/api/catalog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updated),
    });
  };

  const toggleTag = (type: "dietaryTags" | "allergens", tag: string) => {
    const currentTags = (newItem[type] as string[]) || [];

    const updatedTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    setNewItem({
      ...newItem,
      [type]: updatedTags,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: async (results: ParseResult<any>) => {
        const itemsToSave = results.data.map((row) => ({
          type: "grocery",

          name: row.name || "Unnamed Item",

          category: row.category || "General",

          subcategory: row.subcategory || "",

          unit: row.unit || "bottle",

          defaultQty: row.defaultQty ? Number(row.defaultQty) : null,

          price: Number(row.price) || 0,

          currency: row.currency || "INR",

          isAvailable:
            String(row.isAvailable).toLowerCase() === "false" ? false : true,

          isFavorite: String(row.isFavorite).toLowerCase() === "true",

          dietaryTags: row.dietaryTags
            ? row.dietaryTags.split(",").map((t: string) => t.trim())
            : [],

          allergens: row.allergens
            ? row.allergens.split(",").map((t: string) => t.trim())
            : [],

          notes: row.notes || "",
        }));

        const res = await fetch("/api/catalog", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(itemsToSave),
        });

        if (res.ok) {
          alert("Upload successful!");

          await loadData();
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Inventory Catalog
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            {filteredItems.length} items
            {alertCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {alertCount} low stock
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>

          <button
            onClick={() => loadData()}
            className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* {warehouseLocation && (
            <button
              onClick={() => setShowReceive(true)}
              className="h-11 px-4 rounded-xl bg-[#1868A5] text-white text-sm font-semibold hover:bg-[#155a8a] flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Receive Stock
            </button>
          )} */}

          <button
            onClick={() => {
              setNewItem(initialFormState);
              setIsModalOpen(true);
            }}
            className="h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#1868A5]/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 h-11 rounded-xl text-xs font-semibold transition-colors ${
                  activeCategory === cat
                    ? "bg-[#1868A5] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            Loading inventory...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Item
                  </th>

                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Category
                  </th>

                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Warehouse
                  </th>

                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Price
                  </th>

                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>

                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((item) => {
                  const balance = balanceMap[item.id];
                  console.log("ITEM:", item.name);
                  console.log("BALANCE:", balance);
                  const qty = balance?.onHandBaseUnits ?? 0;

                  const low = isLowStock(qty, item as any);

                  const stock = displayWarehouseStock(
                    qty,
                    item as CatalogItemConfig,
                  );

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        low ? "bg-red-50/20" : ""
                      }`}
                    >
                      {/* Item */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleFavorite(item)}
                            className={`transition-colors ${
                              item.isFavorite
                                ? "text-orange-400"
                                : "text-slate-300 hover:text-slate-400"
                            }`}
                          >
                            <Star
                              className="w-5 h-5"
                              fill={item.isFavorite ? "currentColor" : "none"}
                            />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              {low && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}

                              <p className="font-semibold text-slate-900">
                                {item.name}
                              </p>
                            </div>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.subcategory || "General"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                          {item.category}
                        </span>
                      </td>

                      {/* Warehouse */}
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`font-semibold ${
                            low ? "text-red-600" : "text-slate-900"
                          }`}
                        >
                          {stock}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-slate-900 whitespace-nowrap">
                          {item.currency || "INR"} {item.price || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        {low ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : item.isAvailable !== false ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={async () => {
                              const updated = {
                                ...item,
                                isAvailable:
                                  item.isAvailable === false ? true : false,
                              };

                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? updated : i,
                                ),
                              );

                              await fetch("/api/catalog", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify(updated),
                              });
                            }}
                            className={`h-10 px-4 rounded-xl text-xs font-semibold transition-colors ${
                              item.isAvailable !== false
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {item.isAvailable !== false ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => {
                              setNewItem(item);
                              setIsModalOpen(true);
                            }}
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setItemToDelete(item)}
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center text-slate-400"
                    >
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receive Drawer */}
      {/* {showReceive && warehouseLocation && (
        <ReceiveDrawer
          warehouseLocationId={warehouseLocation.id}
          items={items.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            baseUnit: item.baseUnit || item.unit || "unit",
            packEnabled: item.packEnabled || false,
            packSize: item.packSize || null,
            packLabel: item.packLabel || null,
          }))}
          onClose={() => setShowReceive(false)}
          onSuccess={() => {
            setShowReceive(false);
            loadData();
          }}
        />
      )} */}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full max-w-xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {newItem.id ? "Edit Grocery Item" : "Add Grocery Item"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-black hover:text-white hover:bg-[#1868A5] hover:rotate-180 transition-all duration-300 p-2 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.name || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Sparkling Water"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newItem.category || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories
                      .filter((c) => c !== "All")
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={newItem.subcategory || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, subcategory: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newItem.unit || "bottle"}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none"
                  >
                    <option value="portion">portion</option>
                    <option value="piece">piece</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="pack">pack</option>
                    <option value="bottle">bottle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Default Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.defaultQty ?? ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        defaultQty: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={newItem.price || 0}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        price: Number(e.target.value),
                      })
                    }
                    className="
      w-full
      border
      border-slate-300
      rounded-md
      p-2
      text-sm
      outline-none
    "
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency
                  </label>

                  <select
                    value={newItem.currency || "INR"}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        currency: e.target.value,
                      })
                    }
                    className="
      w-full
      border
      border-slate-300
      rounded-md
      p-2
      text-sm
    "
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newItem.isFavorite}
                      onChange={(e) =>
                        setNewItem({ ...newItem, isFavorite: e.target.checked })
                      }
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Favorite
                    </span>
                  </label>
                </div>
              </div>

              {/* Tag Groups */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dietary Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag("dietaryTags", tag)}
                      className={`px-3 py-1 text-[10px] sm:text-xs rounded-full border transition-colors ${newItem.dietaryTags?.includes(tag) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Allergens
                </label>
                <div className="flex flex-wrap gap-2">
                  {allergenOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag("allergens", tag)}
                      className={`px-3 py-1 text-[10px] sm:text-xs rounded-full border transition-colors ${newItem.allergens?.includes(tag) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newItem.notes || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, notes: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-md p-2 text-sm h-24 outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3 bg-slate-50 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="w-full sm:w-auto px-4 py-2 bg-[#1868A5] text-white rounded-md  text-sm font-medium transition-colors"
              >
                {newItem.id ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-medium text-slate-900">Confirm Deletion</h2>
              <button
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600">
                Are you sure you want to delete{" "}
                <strong>{itemToDelete.name}</strong>?
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setItemToDelete(null)}
                className="w-full sm:w-auto px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
