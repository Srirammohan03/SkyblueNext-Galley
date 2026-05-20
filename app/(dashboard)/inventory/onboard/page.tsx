"use client";
// app/(dashboard)/inventory/onboard/page.tsx

import React, { useCallback, useEffect, useState } from "react";
import { Search, ArrowRightLeft, RefreshCw, Plane } from "lucide-react";
import RestockDrawer from "@/components/inventory/RestockDrawer";
import { displayWarehouseStock } from "@/lib/inventory/conversion";

interface Aircraft {
    id: string;
    tailNumber: string;
    label: string;
    locations: { id: string; name: string }[];
}

interface Balance {
    itemId: string;
    onHandBaseUnits: number;
    item: {
        id: string;
        name: string;
        category: string;
        baseUnit: string;
        packEnabled: boolean;
        packSize: number | null;
        packLabel: string | null;
        reorderThresholdType: string;
        reorderThresholdValue: number;
    };
}

interface EligItem {
    id: string;
    name: string;
    category: string;
    baseUnit: string;
    packEnabled: boolean;
    packSize: number | null;
    packLabel: string | null;
    reorderThresholdType: string;
    reorderThresholdValue: number;
}

export default function OnboardPage() {
    const [aircraft, setAircraft] = useState<Aircraft[]>([]);
    const [selectedTail, setSelectedTail] = useState<string>("");
    const [onboardBalances, setOnboardBalances] = useState<Balance[]>([]);
    const [warehouseBalances, setWarehouseBalances] = useState<Balance[]>([]);
    const [eligibleItems, setEligibleItems] = useState<EligItem[]>([]);
    const [warehouseLocId, setWarehouseLocId] = useState<string>("");
    const [onboardLocId, setOnboardLocId] = useState<string>("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [showRestock, setShowRestock] = useState(false);

    // Load aircraft list once
    useEffect(() => {
        fetch("/api/inventory/aircraft")
            .then((r) => r.json())
            .then((data: Aircraft[]) => {
                setAircraft(data);
                if (data.length > 0) setSelectedTail(data[0].tailNumber);
            })
            .catch(console.error);

        fetch("/api/inventory/locations?type=WAREHOUSE")
            .then((r) => r.json())
            .then((locs: any[]) => {
                if (locs[0]) setWarehouseLocId(locs[0].id);
            })
            .catch(console.error);
    }, []);

    const load = useCallback(async () => {
        if (!selectedTail) return;
        setLoading(true);
        try {
            const ac = aircraft.find((a) => a.tailNumber === selectedTail);
            const obLocId = ac?.locations[0]?.id;
            if (!obLocId) {
                setOnboardBalances([]);
                setEligibleItems([]);
                setLoading(false);
                return;
            }
            setOnboardLocId(obLocId);

            const [obRes, eligRes, wbRes] = await Promise.all([
                fetch(`/api/inventory/balances?locationId=${obLocId}`),
                fetch(`/api/inventory/eligibility?locationId=${obLocId}`),
                warehouseLocId
                    ? fetch(`/api/inventory/balances?locationId=${warehouseLocId}`)
                    : Promise.resolve({ json: async () => [] }),
            ]);

            const obBals: Balance[] = await obRes.json();
            const eligRows: any[] = await eligRes.json();
            const wBals: Balance[] = await (wbRes as Response).json();

            setOnboardBalances(obBals);
            setWarehouseBalances(wBals);

            // Eligible items: those marked eligible=true
            const eligibleItemList = eligRows
                .filter((e) => e.eligible)
                .map((e) => e.item)
                .filter(Boolean);
            setEligibleItems(eligibleItemList);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedTail, aircraft, warehouseLocId]);

    useEffect(() => {
        load();
    }, [load]);

    // Combine: items with onboard stock OR eligible items
    const allDisplayItems = React.useMemo(() => {
        const map = new Map<string, any>();
        for (const b of onboardBalances) {
            map.set(b.itemId, { ...b.item, onHandBaseUnits: b.onHandBaseUnits });
        }
        for (const it of eligibleItems) {
            if (!map.has(it.id)) {
                map.set(it.id, { ...it, onHandBaseUnits: 0 });
            }
        }
        return Array.from(map.values());
    }, [onboardBalances, eligibleItems]);

    const wbMap = Object.fromEntries(
        warehouseBalances.map((b) => [b.itemId, b.onHandBaseUnits]),
    );

    const filtered = allDisplayItems.filter(
        (it) =>
            !search ||
            it.name.toLowerCase().includes(search.toLowerCase()) ||
            it.category?.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Onboard Inventory
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Per-aircraft grocery tracking
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Aircraft selector */}
                    <div className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                        <Plane className="w-4 h-4 text-[#1868A5]" />
                        <select
                            value={selectedTail}
                            onChange={(e) => setSelectedTail(e.target.value)}
                            className="text-sm font-semibold text-slate-900 bg-transparent outline-none pr-1"
                        >
                            {aircraft.map((a) => (
                                <option key={a.id} value={a.tailNumber}>
                                    {a.tailNumber} – {a.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={load}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {onboardLocId && warehouseLocId && (
                        <button
                            onClick={() => setShowRestock(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                            Restock
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search items…"
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-400/20"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">Loading…</div>
                ) : aircraft.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No aircraft registered. Add one via Settings.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Item
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Onboard
                                    </th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Warehouse
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((it) => {
                                    const onQty = it.onHandBaseUnits ?? 0;
                                    const whQty = wbMap[it.id] ?? 0;
                                    return (
                                        <tr
                                            key={it.id}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-5 py-4 font-medium text-slate-900">
                                                {it.name}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                    {it.category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span
                                                    className={`font-semibold ${onQty === 0 ? "text-slate-400" : "text-slate-900"}`}
                                                >
                                                    {onQty} {it.baseUnit}s
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right text-sm text-slate-500">
                                                {displayWarehouseStock(whQty, it)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-5 py-12 text-center text-slate-400"
                                        >
                                            No eligible items for {selectedTail}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Restock Drawer */}
            {showRestock && onboardLocId && warehouseLocId && (
                <RestockDrawer
                    warehouseLocationId={warehouseLocId}
                    onboardLocationId={onboardLocId}
                    tailNumber={selectedTail}
                    eligibleItems={eligibleItems}
                    warehouseBalances={warehouseBalances.map((b) => ({
                        itemId: b.itemId,
                        onHandBaseUnits: b.onHandBaseUnits,
                    }))}
                    onboardBalances={onboardBalances.map((b) => ({
                        itemId: b.itemId,
                        onHandBaseUnits: b.onHandBaseUnits,
                    }))}
                    onClose={() => setShowRestock(false)}
                    onSuccess={() => {
                        setShowRestock(false);
                        load();
                    }}
                />
            )}
        </div>
    );
}
