// "use client";
// // app/(dashboard)/reports/inventory/page.tsx

// import React, { useCallback, useEffect, useState } from "react";
// import {
//   BarChart3,
//   RefreshCw,
//   Warehouse,
//   Plane,
//   TrendingDown,
//   ArrowRightLeft,
//   CalendarDays,
// } from "lucide-react";
// import ExportCsvButton from "@/components/reports/ExportCsvButton";
// import {
//   displayWarehouseStock,
//   type CatalogItemConfig,
// } from "@/lib/inventory/conversion";

// type ReportType = "stock" | "received" | "onboarded" | "consumed" | "annual";

// interface Aircraft {
//   id: string;
//   tailNumber: string;
//   label: string;
// }

// const REPORT_TABS: { key: ReportType; label: string; icon: React.ElementType }[] = [
//   { key: "stock", label: "Stock on Hand", icon: Warehouse },
//   { key: "received", label: "Received", icon: BarChart3 },
//   { key: "onboarded", label: "Onboarded", icon: ArrowRightLeft },
//   { key: "consumed", label: "Consumed", icon: TrendingDown },
//   { key: "annual", label: "Annual Summary", icon: CalendarDays },
// ];

// const CATEGORIES = ["", "Alcohol", "Bakery", "Beverages", "Dairy", "Snacks", "Supplies"];

// export default function InventoryReportsPage() {
//   const [activeTab, setActiveTab] = useState<ReportType>("stock");
//   const [aircraft, setAircraft] = useState<Aircraft[]>([]);
//   const [rows, setRows] = useState<any[]>([]);
//   const [annualSummary, setAnnualSummary] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);

//   // Filters
//   const [from, setFrom] = useState("");
//   const [to, setTo] = useState("");
//   const [selectedAircraft, setSelectedAircraft] = useState("");
//   const [category, setCategory] = useState("");
//   const [year, setYear] = useState(String(new Date().getFullYear()));

//   useEffect(() => {
//     fetch("/api/inventory/aircraft")
//       .then((r) => r.json())
//       .then(setAircraft)
//       .catch(console.error);
//   }, []);

//   const loadReport = useCallback(async () => {
//     setLoading(true);
//     try {
//       const params = new URLSearchParams({ reportType: activeTab });
//       if (from) params.set("from", from);
//       if (to) params.set("to", to);
//       if (selectedAircraft) params.set("aircraft", selectedAircraft);
//       if (category) params.set("category", category);
//       if (activeTab === "annual") params.set("year", year);

//       const res = await fetch(`/api/reports/inventory?${params}`);
//       const data = await res.json();

//       if (activeTab === "annual") {
//         setAnnualSummary(data.summary ?? []);
//         setRows([]);
//       } else {
//         setRows(data.rows ?? []);
//         setAnnualSummary([]);
//       }
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [activeTab, from, to, selectedAircraft, category, year]);

//   useEffect(() => {
//     loadReport();
//   }, [loadReport]);

//   // Build CSV data based on active tab
//   const buildCsvData = (): Record<string, unknown>[] => {
//     if (activeTab === "stock") {
//       return rows.map((r) => ({
//         Item: r.name,
//         Category: r.category,
//         "Base Unit": r.baseUnit,
//         "Warehouse (display)": r.warehouseDisplay,
//         "Warehouse (units)": r.warehouseBaseUnits,
//         ...Object.entries(r.onboard ?? {}).reduce(
//           (acc, [tail, disp]) => ({ ...acc, [`Onboard ${tail}`]: disp }),
//           {},
//         ),
//       }));
//     }
//     if (activeTab === "received") {
//       return rows.map((r) => ({
//         Date: new Date(r.createdAt).toLocaleDateString(),
//         Item: r.item?.name,
//         Category: r.item?.category,
//         "Base Units": r.baseUnits,
//         Packs: r.packs ?? "—",
//         Location: r.toLocation?.name,
//         "Created By": r.creator?.name,
//       }));
//     }
//     if (activeTab === "onboarded") {
//       return rows.map((r) => ({
//         Date: new Date(r.createdAt).toLocaleDateString(),
//         Item: r.item?.name,
//         Category: r.item?.category,
//         "Units Transferred": r.baseUnits,
//         Aircraft: r.toLocation?.aircraft?.tailNumber ?? "—",
//         "Created By": r.creator?.name,
//       }));
//     }
//     if (activeTab === "consumed") {
//       return rows.map((r) => ({
//         Date: new Date(r.createdAt).toLocaleDateString(),
//         Item: r.item?.name,
//         Category: r.item?.category,
//         "Units Consumed": r.baseUnits,
//         Aircraft: r.fromLocation?.aircraft?.tailNumber ?? "—",
//         "Flight ID": r.flightId ?? "—",
//         "Created By": r.creator?.name,
//       }));
//     }
//     if (activeTab === "annual") {
//       const monthNames = [
//         "Jan", "Feb", "Mar", "Apr", "May", "Jun",
//         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
//       ];
//       return annualSummary.map((m) => ({
//         Month: monthNames[m.month - 1],
//         "Received (units)": m.received,
//         "Onboarded (units)": m.onboarded,
//         "Consumed (units)": m.consumed,
//       }));
//     }
//     return [];
//   };

//   const MONTH_NAMES = [
//     "Jan", "Feb", "Mar", "Apr", "May", "Jun",
//     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
//   ];

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">
//             Inventory Reports
//           </h1>
//           <p className="text-sm text-slate-500 mt-0.5">
//             Stock, movements, consumption & annual summaries
//           </p>
//         </div>
//         <button
//           onClick={loadReport}
//           className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
//         >
//           <RefreshCw className="w-4 h-4" />
//         </button>
//       </div>

//       {/* Tab bar */}
//       <div className="flex flex-wrap gap-2">
//         {REPORT_TABS.map(({ key, label, icon: Icon }) => (
//           <button
//             key={key}
//             onClick={() => setActiveTab(key)}
//             className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
//               activeTab === key
//                 ? "bg-[#1868A5] text-white shadow-sm"
//                 : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
//             }`}
//           >
//             <Icon className="w-4 h-4" />
//             {label}
//           </button>
//         ))}
//       </div>

//       {/* Filters */}
//       <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end shadow-sm">
//         {activeTab !== "annual" && activeTab !== "stock" && (
//           <>
//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">From</label>
//               <input
//                 type="date"
//                 value={from}
//                 onChange={(e) => setFrom(e.target.value)}
//                 className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
//               />
//             </div>
//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">To</label>
//               <input
//                 type="date"
//                 value={to}
//                 onChange={(e) => setTo(e.target.value)}
//                 className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
//               />
//             </div>
//           </>
//         )}

//         {activeTab === "annual" && (
//           <div className="flex flex-col gap-1">
//             <label className="text-xs font-medium text-slate-500">Year</label>
//             <select
//               value={year}
//               onChange={(e) => setYear(e.target.value)}
//               className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
//             >
//               {[2024, 2025, 2026, 2027].map((y) => (
//                 <option key={y} value={y}>
//                   {y}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         {["onboarded", "consumed", "stock"].includes(activeTab) && aircraft.length > 0 && (
//           <div className="flex flex-col gap-1">
//             <label className="text-xs font-medium text-slate-500">Aircraft</label>
//             <select
//               value={selectedAircraft}
//               onChange={(e) => setSelectedAircraft(e.target.value)}
//               className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
//             >
//               <option value="">All Aircraft</option>
//               {aircraft.map((a) => (
//                 <option key={a.id} value={a.tailNumber}>
//                   {a.tailNumber}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         <div className="flex flex-col gap-1">
//           <label className="text-xs font-medium text-slate-500">Category</label>
//           <select
//             value={category}
//             onChange={(e) => setCategory(e.target.value)}
//             className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
//           >
//             {CATEGORIES.map((c) => (
//               <option key={c} value={c}>
//                 {c || "All Categories"}
//               </option>
//             ))}
//           </select>
//         </div>

//         <ExportCsvButton
//           data={buildCsvData()}
//           filename={`inventory-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`}
//           label="Export CSV"
//         />
//       </div>

//       {/* Results */}
//       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//         {loading ? (
//           <div className="p-12 text-center text-slate-400">Loading report…</div>
//         ) : activeTab === "stock" ? (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-slate-100">
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Onboard</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {rows.map((r) => (
//                   <tr key={r.itemId} className="hover:bg-slate-50">
//                     <td className="px-5 py-3.5 font-medium text-slate-900">{r.name}</td>
//                     <td className="px-5 py-3.5 text-sm text-slate-500">{r.category}</td>
//                     <td className="px-5 py-3.5 text-right text-sm text-slate-900 font-semibold">{r.warehouseDisplay}</td>
//                     <td className="px-5 py-3.5 text-right text-sm text-slate-600">
//                       {Object.entries(r.onboard ?? {}).map(([tail, disp]) => (
//                         <span key={tail} className="block">
//                           <span className="text-slate-400">{tail}:</span> {String(disp)}
//                         </span>
//                       ))}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : activeTab === "received" ? (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-slate-100">
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Packs</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Base Units</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">By</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {rows.map((r) => (
//                   <tr key={r.id} className="hover:bg-slate-50">
//                     <td className="px-5 py-3.5 text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
//                     <td className="px-5 py-3.5 font-medium text-slate-900">{r.item?.name}</td>
//                     <td className="px-5 py-3.5 text-sm text-slate-500">{r.item?.category}</td>
//                     <td className="px-5 py-3.5 text-right text-sm">{r.packs ?? "—"}</td>
//                     <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{r.baseUnits}</td>
//                     <td className="px-5 py-3.5 text-sm text-slate-500">{r.creator?.name}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : activeTab === "onboarded" ? (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-slate-100">
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Units</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Aircraft</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">By</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {rows.map((r) => (
//                   <tr key={r.id} className="hover:bg-slate-50">
//                     <td className="px-5 py-3.5 text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
//                     <td className="px-5 py-3.5 font-medium text-slate-900">{r.item?.name}</td>
//                     <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{r.baseUnits}</td>
//                     <td className="px-5 py-3.5 text-sm">
//                       <span className="flex items-center gap-1 text-slate-600">
//                         <Plane className="w-3.5 h-3.5" />
//                         {r.toLocation?.aircraft?.tailNumber ?? "—"}
//                       </span>
//                     </td>
//                     <td className="px-5 py-3.5 text-sm text-slate-500">{r.creator?.name}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : activeTab === "consumed" ? (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-slate-100">
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Consumed</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Aircraft</th>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Flight</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {rows.map((r) => (
//                   <tr key={r.id} className="hover:bg-slate-50">
//                     <td className="px-5 py-3.5 text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
//                     <td className="px-5 py-3.5 font-medium text-slate-900">{r.item?.name}</td>
//                     <td className="px-5 py-3.5 text-right font-semibold text-red-600">{r.baseUnits}</td>
//                     <td className="px-5 py-3.5 text-sm text-slate-600">
//                       {r.fromLocation?.aircraft?.tailNumber ?? "—"}
//                     </td>
//                     <td className="px-5 py-3.5 text-sm text-slate-400">
//                       {r.flightId ? r.flightId.slice(0, 8) + "…" : "—"}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           // Annual Summary
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-slate-100">
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Month</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Received</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Onboarded</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Consumed</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {annualSummary.map((m) => (
//                   <tr key={m.month} className="hover:bg-slate-50">
//                     <td className="px-5 py-3.5 font-semibold text-slate-900">
//                       {MONTH_NAMES[m.month - 1]}
//                     </td>
//                     <td className="px-5 py-3.5 text-right text-emerald-700 font-semibold">
//                       {m.received}
//                     </td>
//                     <td className="px-5 py-3.5 text-right text-blue-700 font-semibold">
//                       {m.onboarded}
//                     </td>
//                     <td className="px-5 py-3.5 text-right text-orange-600 font-semibold">
//                       {m.consumed}
//                     </td>
//                   </tr>
//                 ))}
//                 {annualSummary.length > 0 && (
//                   <tr className="bg-slate-50 font-bold">
//                     <td className="px-5 py-3.5 text-slate-900">Total {year}</td>
//                     <td className="px-5 py-3.5 text-right text-emerald-700">
//                       {annualSummary.reduce((s, m) => s + m.received, 0)}
//                     </td>
//                     <td className="px-5 py-3.5 text-right text-blue-700">
//                       {annualSummary.reduce((s, m) => s + m.onboarded, 0)}
//                     </td>
//                     <td className="px-5 py-3.5 text-right text-orange-600">
//                       {annualSummary.reduce((s, m) => s + m.consumed, 0)}
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {!loading && rows.length === 0 && activeTab !== "annual" && (
//           <div className="p-12 text-center text-slate-400">
//             No data for the selected filters.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
