// app\(dashboard)\reports\reports-client.tsx
"use client";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Download,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReportPdfButton from "@/components/report-pdf-button";

type ReportType = "flights" | "inventory" | "vendors";

export default function ReportsClient() {
  const [mainTab, setMainTab] = useState<ReportType>("flights");
  const [flightStatus, setFlightStatus] = useState("Completed");
  const [inventoryType, setInventoryType] = useState("grocery");

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState("");

  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);
  const [expandedVendorName, setExpandedVendorName] = useState<string | null>(
    null,
  );

  const toggleFlight = (id: string) => {
    setExpandedFlightId((prev) => (prev === id ? null : id));
  };
  const toggleVendor = (name: string) => {
    setExpandedVendorName((prev) => (prev === name ? null : name));
  };

  const fetchReport = async () => {
    const params = new URLSearchParams({
      reportType: mainTab,
      search,
    });

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    if (mainTab === "flights") {
      params.append("status", flightStatus);
    }
    if (mainTab === "inventory") {
      params.append("type", inventoryType);
    }

    const res = await fetch(`/api/reports?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch report");
    return res.json();
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      "reports",
      mainTab,
      flightStatus,
      inventoryType,
      startDate,
      endDate,
      search,
    ],
    queryFn: fetchReport,
  });

  const handleDownloadCsv = (dataToExport: any[], filename: string) => {
    if (!dataToExport || dataToExport.length === 0) return;

    const cols = getExportColumns();

    const formattedData = dataToExport.map((row, index) => {
      const formatted: any = {
        "S.No": index + 1,
      };

      cols.forEach((col) => {
        let value = row[col.accessorKey];

        // FORMAT CURRENCY
        if (
          col.accessorKey === "unitPrice" ||
          col.accessorKey === "totalValue"
        ) {
          value =
            value && value !== "-"
              ? `₹${Number(value).toLocaleString("en-IN")}`
              : "-";
        }

        formatted[col.header] = value ?? "-";
      });

      return formatted;
    });

    // CREATE WORKBOOK
    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // COLUMN WIDTHS
    worksheet["!cols"] = [
      { wch: 8 }, // S.No
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 24 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 30 },
    ];

    // HEADER STYLING
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({
        r: 0,
        c: C,
      });

      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = {
        font: {
          bold: true,
          color: { rgb: "FFFFFF" },
        },
        fill: {
          fgColor: { rgb: "1868A5" },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }

    // APPEND SHEET
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      getReportTitle().slice(0, 30),
    );

    // EXPORT
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(fileData, `${filename}-${new Date().getTime()}.xlsx`);
  };

  const getExportData = () => {
    if (!Array.isArray(data)) return [];

    let exportData: any[] = [];

    // ================= FLIGHT REPORTS =================
    if (mainTab === "flights") {
      data.forEach((flight: any) => {
        const flightDate = flight.date
          ? (() => {
              try {
                return format(new Date(flight.date), "dd MMM yyyy");
              } catch {
                return "-";
              }
            })()
          : "-";

        // Ordered Items
        flight?.items?.forEach((item: any) => {
          exportData.push({
            status: flightStatus,
            flightNumber: flight.flightNumber || "TBD",
            date: flightDate,
            route: `${flight.departure || "-"} → ${flight.arrival || "-"}`,
            vendorName: item.vendorName || "Catalog",
            itemName: item.name || "-",
            orderedQty: item.quantity || 0,
            restoredQty: "-",
            unitPrice: item.price || 0,
            totalValue: (item.quantity || 0) * (item.price || 0),
            reason:
              flightStatus === "Rejected"
                ? flight.rejectionReason || "-"
                : flightStatus === "Cancelled"
                  ? flight.cancelReason || "-"
                  : "-",
          });
        });

        // Restored Items
        flight?.restoredItems?.forEach((ri: any) => {
          const relatedItem = flight?.items?.find(
            (i: any) => i.id === ri.itemId,
          );

          exportData.push({
            status: flightStatus,
            flightNumber: flight.flightNumber || "TBD",
            date: flightDate,
            route: `${flight.departure || "-"} → ${flight.arrival || "-"}`,
            vendorName: relatedItem?.vendorName || "Catalog",
            itemName: `${relatedItem?.name || "Unknown"} (RESTORED)`,
            orderedQty: "-",
            restoredQty: ri.returnedQty || 0,
            unitPrice: relatedItem?.price || 0,
            totalValue: 0,
            reason:
              flightStatus === "Rejected"
                ? flight.rejectionReason || "-"
                : flightStatus === "Cancelled"
                  ? flight.cancelReason || "-"
                  : "-",
          });
        });
      });
    }

    // ================= VENDOR REPORTS =================
    else if (mainTab === "vendors") {
      data.forEach((vendor: any) => {
        vendor?.flights?.forEach((flight: any) => {
          const flightDate = flight.date
            ? (() => {
                try {
                  return format(new Date(flight.date), "dd MMM yyyy");
                } catch {
                  return "-";
                }
              })()
            : "-";

          flight?.items?.forEach((item: any) => {
            exportData.push({
              vendorName: vendor.vendorName,
              flightNumber: flight.flightNumber || "TBD",
              date: flightDate,
              route: flight.route || "-",
              itemName: item.name || "-",
              quantity: item.quantity || 0,
              unitPrice: item.price || 0,
              totalValue: (item.quantity || 0) * (item.price || 0),
            });
          });
        });
      });
    }

    // ================= INVENTORY REPORTS =================
    else if (mainTab === "inventory") {
      data.forEach((item: any) => {
        exportData.push({
          itemName: item.name || "-",
          totalLoaded: item.totalLoaded || 0,
          totalRestored: item.totalRestored || 0,
          totalConsumed: item.totalConsumed || 0,
          flightsUsed: item.flightsUsed || 0,
        });
      });
    }

    return exportData;
  };

  const getExportColumns = () => {
    if (mainTab === "flights") {
      return [
        { header: "Status", accessorKey: "status" },
        { header: "Flight Number", accessorKey: "flightNumber" },
        { header: "Date", accessorKey: "date" },
        { header: "Route", accessorKey: "route" },
        { header: "Vendor", accessorKey: "vendorName" },
        { header: "Item Name", accessorKey: "itemName" },
        { header: "Ordered Qty", accessorKey: "orderedQty" },
        { header: "Restored Qty", accessorKey: "restoredQty" },
        { header: "Unit Price", accessorKey: "unitPrice" },
        { header: "Total Value", accessorKey: "totalValue" },
        { header: "Reason", accessorKey: "reason" },
      ];
    }

    if (mainTab === "vendors") {
      return [
        { header: "Vendor Name", accessorKey: "vendorName" },
        { header: "Flight Number", accessorKey: "flightNumber" },
        { header: "Date", accessorKey: "date" },
        { header: "Route", accessorKey: "route" },
        { header: "Item Name", accessorKey: "itemName" },
        { header: "Quantity", accessorKey: "quantity" },
        { header: "Unit Price", accessorKey: "unitPrice" },
        { header: "Total Value", accessorKey: "totalValue" },
      ];
    }

    return [
      { header: "Item Name", accessorKey: "itemName" },
      { header: "Total Loaded", accessorKey: "totalLoaded" },
      { header: "Total Restored", accessorKey: "totalRestored" },
      { header: "Total Consumed", accessorKey: "totalConsumed" },
      { header: "Flights Used", accessorKey: "flightsUsed" },
    ];
  };

  const getReportTitle = () => {
    if (mainTab === "flights") return `${flightStatus} Flights Report`;
    if (mainTab === "inventory")
      return `Global ${inventoryType} Inventory Report`;
    if (mainTab === "vendors") return `Vendor Items Usage Report`;
    return "Report";
  };

  const pdfData = getExportData();
  const pdfColumns = getExportColumns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Reports Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Generate, view and export comprehensive reports across flights,
          inventory and vendors.
        </p>
      </div>

      <Card className="bg-white/50 backdrop-blur-sm border-gray-100 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Tabs
            value={mainTab}
            onValueChange={(val) => setMainTab(val as ReportType)}
            className="w-full"
          >
            <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
              {/* TABS: Added w-full and flex-wrap so they stack perfectly on narrow screens */}
              <TabsList className="flex h-auto w-full flex-wrap justify-start rounded-xl bg-gray-100 p-1 sm:w-auto">
                <TabsTrigger
                  value="flights"
                  className="flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm sm:flex-none sm:px-4 sm:text-sm"
                >
                  Flight Reports
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm sm:flex-none sm:px-4 sm:text-sm"
                >
                  Global Inventory
                </TabsTrigger>
                <TabsTrigger
                  value="vendors"
                  className="flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm sm:flex-none sm:px-4 sm:text-sm"
                >
                  Vendor Reports
                </TabsTrigger>
              </TabsList>

              {/* ACTIONS: Set to flex-row w-full so buttons share screen width on mobile */}
              <div className="flex w-full flex-row items-center gap-3 sm:w-auto">
                {data && data.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleDownloadCsv(
                          pdfData,
                          getReportTitle().toLowerCase().replace(/\s+/g, "-"),
                        )
                      }
                      className="flex h-10 flex-1 items-center justify-center rounded-xl border-green-200 bg-green-50 px-3 text-xs font-semibold text-green-700 transition-all hover:bg-green-100 hover:text-green-800 sm:flex-none sm:px-4 sm:text-sm"
                    >
                      <FileSpreadsheet className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
                      Export Excel
                    </Button>

                    <div className="flex flex-1 sm:flex-none [&>*]:w-full">
                      <ReportPdfButton
                        title={getReportTitle()}
                        columns={pdfColumns}
                        data={data}
                        reportType={mainTab}
                        inventoryType={inventoryType}
                        flatData={pdfData}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="sm:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-blue-500 rounded-xl"
                />
              </div>
              <div className="sm:col-span-4 relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 border-gray-200 focus-visible:ring-blue-500 rounded-xl"
                />
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-gray-500 uppercase">
                  From Date
                </span>
              </div>
              <div className="sm:col-span-4 relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-50 border-gray-200 focus-visible:ring-blue-500 rounded-xl"
                />
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-gray-500 uppercase">
                  To Date
                </span>
              </div>
            </div>

            <TabsContent value="flights" className="m-0">
              <Tabs
                value={flightStatus}
                onValueChange={setFlightStatus}
                className="w-full"
              >
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-x-6 border-b border-gray-200 bg-transparent p-0 mb-6">
                  {["Completed", "Rejected", "Cancelled"].map((status) => (
                    <TabsTrigger
                      key={status}
                      value={status}
                      onClick={() => setFlightStatus(status)}
                      className="rounded-none border-b-2 border-transparent px-1 py-3 text-xs font-medium text-gray-500 transition-all data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none sm:text-sm"
                    >
                      {status} Flights
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="space-y-4">
                  {isLoading ? (
                    <div className="py-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      Loading flights...
                    </div>
                  ) : data?.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      No {flightStatus.toLowerCase()} flights found for the
                      selected period.
                    </div>
                  ) : (
                    data?.map((flight: any) => {
                      const isExpanded = expandedFlightId === flight.id;
                      let flightDate: Date | null = null;
                      try {
                        flightDate = flight.date ? new Date(flight.date) : null;
                      } catch (e) {}

                      const totalValue =
                        flight.items?.reduce(
                          (sum: number, item: any) =>
                            sum + (item.price || 0) * (item.quantity || 0),
                          0,
                        ) || 0;

                      return (
                        <div
                          key={flight.id}
                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all"
                        >
                          {/* Accordion Header */}
                          <div
                            className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:bg-gray-50/50"
                            onClick={() => toggleFlight(flight.id)}
                          >
                            <div className="flex items-center gap-4 sm:gap-6">
                              {flightDate && (
                                <div className="text-center min-w-[3rem]">
                                  <div className="text-xs font-bold text-gray-500 uppercase">
                                    {format(flightDate, "MMM")}
                                  </div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {format(flightDate, "dd")}
                                  </div>
                                </div>
                              )}

                              <div>
                                <div className="flex items-center gap-3">
                                  <h3 className="text-base font-bold text-gray-900">
                                    {flight.departure} → {flight.arrival}
                                  </h3>
                                  <span className="text-xs font-medium text-gray-500">
                                    {flight.flightNumber}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  <span className="flex items-center">
                                    <CalendarIcon className="w-3 h-3 mr-1" />{" "}
                                    {flightDate
                                      ? format(flightDate, "M/d/yyyy")
                                      : "-"}
                                  </span>
                                  <span>
                                    {flight.paxCount} pax - {flight.crewCount}{" "}
                                    crew
                                  </span>
                                  <span>{flight.tailNumber}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      flightStatus === "Completed"
                                        ? "bg-blue-50 text-blue-600 border border-blue-200"
                                        : flightStatus === "Rejected"
                                          ? "bg-red-50 text-red-600 border border-red-200"
                                          : "bg-orange-50 text-orange-600 border border-orange-200"
                                    }`}
                                  >
                                    {flightStatus}
                                  </span>
                                  {flightStatus === "Rejected" &&
                                    flight.rejectionReason && (
                                      <span className="text-xs text-red-600 truncate max-w-[200px]">
                                        {flight.rejectionReason}
                                      </span>
                                    )}
                                  {flightStatus === "Cancelled" &&
                                    flight.cancelReason && (
                                      <span className="text-xs text-orange-600 truncate max-w-[200px]">
                                        {flight.cancelReason}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                              <div className="text-center px-4">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">
                                  Items
                                </div>
                                <div className="text-sm font-bold text-gray-900">
                                  {flight.items?.length || 0}
                                </div>
                              </div>
                              <div className="text-center px-4 bg-gray-50 rounded-lg py-1 border border-gray-100">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">
                                  Total
                                </div>
                                <div className="text-sm font-bold text-blue-700">
                                  ₹{totalValue.toLocaleString()}
                                </div>
                              </div>
                              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-gray-50/30 p-4 sm:p-6 space-y-8">
                              {/* Onboard Items Section */}
                              <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">
                                  Onboard Items
                                </h4>
                                <p className="text-xs text-gray-500 mb-4">
                                  All items ordered for this flight
                                </p>

                                {/* WRAPPER: Added 'w-full' and 'overflow-x-auto' to contain the table */}
                                <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                                  <table className="w-full min-w-[500px] text-left text-xs">
                                    <thead className="bg-gray-50 font-semibold uppercase text-gray-500">
                                      <tr>
                                        <th className="px-4 py-3 text-center w-12">
                                          S.No
                                        </th>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Vendor</th>
                                        <th className="px-4 py-3 text-right">
                                          Qty
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                          Price
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {flight.items?.length > 0 ? (
                                        flight.items.map(
                                          (item: any, idx: number) => (
                                            <tr
                                              key={idx}
                                              className="hover:bg-gray-50/50"
                                            >
                                              <td className="px-4 py-3 text-center text-gray-500">
                                                {idx + 1}
                                              </td>
                                              <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                                {item.name}
                                              </td>
                                              <td className="px-4 py-3 text-gray-600">
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px]">
                                                  {item.category || "General"}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-green-700 whitespace-nowrap">
                                                {item.vendorName || "Catalog"}
                                              </td>
                                              <td className="px-4 py-3 text-right font-bold">
                                                {item.quantity}
                                              </td>
                                              <td className="px-4 py-3 text-right text-gray-600">
                                                ₹
                                                {Number(
                                                  item.price,
                                                ).toLocaleString()}
                                              </td>
                                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                ₹
                                                {(
                                                  item.price * item.quantity
                                                ).toLocaleString()}
                                              </td>
                                            </tr>
                                          ),
                                        )
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={7}
                                            className="px-4 py-6 text-center text-gray-500"
                                          >
                                            No items found
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                {/* Footer Total Bar */}
                                <div className="flex items-center justify-between rounded-b-xl bg-[#1868A5] px-4 py-3 text-sm text-white">
                                  <div className="font-bold">
                                    Total Ordered Value
                                  </div>
                                  <div className="font-bold text-lg">
                                    ₹{totalValue.toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              {/* Restored Items */}
                              {flight.restoredItems &&
                                flight.restoredItems.length > 0 && (
                                  <div>
                                    <div className="border-t border-dashed border-gray-300 mb-6"></div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-1">
                                      Restored Items
                                    </h4>
                                    <p className="text-xs text-gray-500 mb-4">
                                      Returned / restored onboard items
                                    </p>

                                    {/* WRAPPER: Added 'w-full overflow-x-auto' to prevent layout break */}
                                    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                                      <table className="w-full min-w-[500px] text-left text-xs">
                                        <thead className="bg-gray-50 font-semibold uppercase text-gray-500">
                                          <tr>
                                            <th className="px-4 py-3 text-center w-12">
                                              S.No
                                            </th>
                                            <th className="px-4 py-3">Item</th>
                                            <th className="px-4 py-3 text-right">
                                              Restored Qty
                                            </th>
                                            {/* <th className="px-4 py-3">
                                              Restored By
                                            </th> */}
                                            <th className="px-4 py-3 text-right">
                                              Date
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {flight.restoredItems.map(
                                            (ri: any, idx: number) => {
                                              const relatedItem =
                                                flight?.items?.find(
                                                  (i: any) =>
                                                    i.id === ri.itemId,
                                                ) || { name: "Unknown Item" };
                                              return (
                                                <tr
                                                  key={idx}
                                                  className="hover:bg-gray-50/50"
                                                >
                                                  <td className="px-4 py-3 text-center text-gray-500">
                                                    {idx + 1}
                                                  </td>
                                                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                                    {relatedItem.name}
                                                  </td>
                                                  <td className="px-4 py-3 text-right font-bold text-green-600">
                                                    {ri.returnedQty}
                                                  </td>
                                                  {/* <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                    {ri.restoredBy?.name || "-"}
                                                  </td> */}
                                                  <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                                                    {ri.restoredAt
                                                      ? format(
                                                          new Date(
                                                            ri.restoredAt,
                                                          ),
                                                          "dd MMM yy, HH:mm",
                                                        )
                                                      : "-"}
                                                  </td>
                                                </tr>
                                              );
                                            },
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Tabs>
            </TabsContent>

            <TabsContent value="inventory" className="m-0">
              <Tabs
                value={inventoryType}
                onValueChange={setInventoryType}
                className="w-full"
              >
                <TabsList className="bg-transparent border-b border-gray-200 rounded-none w-full justify-start h-auto p-0 mb-6 space-x-6">
                  {["grocery", "food"].map((type) => (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-3 text-sm font-medium text-gray-500 data-[state=active]:text-blue-700 capitalize"
                    >
                      {type} Inventory
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Item Name</th>
                          <th className="px-6 py-4 font-semibold text-right">
                            Total Loaded
                          </th>
                          {inventoryType === "grocery" && (
                            <th className="px-6 py-4 font-semibold text-right">
                              Total Restored
                            </th>
                          )}
                          <th className="px-6 py-4 font-semibold text-right text-blue-600">
                            Total Consumed
                          </th>
                          <th className="px-6 py-4 font-semibold text-right">
                            Flights Used In
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                          <tr>
                            <td
                              colSpan={inventoryType === "grocery" ? 5 : 4}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              Loading inventory data...
                            </td>
                          </tr>
                        ) : data?.length === 0 ? (
                          <tr>
                            <td
                              colSpan={inventoryType === "grocery" ? 5 : 4}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              No {inventoryType} items found for the selected
                              period.
                            </td>
                          </tr>
                        ) : (
                          data?.map((item: any, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {item.totalLoaded}
                              </td>
                              {inventoryType === "grocery" && (
                                <td className="px-6 py-4 text-right text-gray-600">
                                  {item.totalRestored}
                                </td>
                              )}
                              <td className="px-6 py-4 text-right font-bold text-blue-600">
                                {item.totalConsumed}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-500">
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                                  {item.flightsUsed} flights
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Tabs>
            </TabsContent>

            <TabsContent value="vendors" className="m-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-900">
                    Vendor Item Usage
                  </h3>
                  <p className="text-xs text-gray-500">
                    Items supplied per vendor over the selected period
                  </p>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  {isLoading ? (
                    <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                      Loading vendor data...
                    </div>
                  ) : data?.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                      No vendor data found for the selected period.
                    </div>
                  ) : (
                    data?.map((vendor: any, idx: number) => {
                      const isExpanded =
                        expandedVendorName === vendor.vendorName;

                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all"
                        >
                          {/* Accordion Header */}
                          <div
                            className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:bg-gray-50/50"
                            onClick={() => toggleVendor(vendor.vendorName)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                                {vendor?.vendorName?.charAt(0)?.toUpperCase() ||
                                  "V"}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-gray-900">
                                  {vendor?.vendorName || "Unknown Vendor"}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Total {vendor?.totalQty || 0} items delivered
                                  across {vendor?.flightsCount || 0} flights
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                              <div className="text-center px-4">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">
                                  Flights
                                </div>
                                <div className="text-sm font-bold text-gray-900">
                                  {vendor.flightsCount}
                                </div>
                              </div>
                              <div className="text-center px-4 bg-gray-50 rounded-lg py-1 border border-gray-100">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">
                                  Items
                                </div>
                                <div className="text-sm font-bold text-indigo-700">
                                  {vendor.totalQty}
                                </div>
                              </div>
                              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-colors">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-gray-50/30 p-4 sm:p-6 space-y-6">
                              <h4 className="text-sm font-bold text-gray-900">
                                Flight-wise Deliveries
                              </h4>

                              <div className="grid grid-cols-1 gap-4">
                                {vendor?.flights?.map((flight: any) => (
                                  <div
                                    key={flight.flightId}
                                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                                  >
                                    <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                                      <div className="flex items-center gap-3">
                                        <div className="font-bold text-gray-900">
                                          {flight.flightNumber}
                                        </div>
                                        <div className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                          {flight.route}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center">
                                          <CalendarIcon className="w-3 h-3 mr-1" />
                                          {(() => {
                                            try {
                                              return flight.date
                                                ? format(
                                                    new Date(flight.date),
                                                    "dd MMM yyyy",
                                                  )
                                                : "-";
                                            } catch (e) {
                                              return "-";
                                            }
                                          })()}
                                        </div>
                                      </div>
                                      <div className="text-sm font-bold text-blue-700">
                                        ₹{flight.totalAmount.toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="p-0">
                                      <table className="w-full text-xs text-left">
                                        <thead className="text-gray-500 uppercase bg-white border-b border-gray-100 font-semibold">
                                          <tr>
                                            <th className="px-4 py-2">
                                              Item Name
                                            </th>
                                            <th className="px-4 py-2 text-right">
                                              Quantity
                                            </th>
                                            <th className="px-4 py-2 text-right">
                                              Unit Price
                                            </th>
                                            <th className="px-4 py-2 text-right">
                                              Total
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                          {flight?.items?.map(
                                            (item: any, i: number) => (
                                              <tr
                                                key={i}
                                                className="hover:bg-slate-50"
                                              >
                                                <td className="px-4 py-2 font-medium text-gray-900">
                                                  {item.name}
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold">
                                                  {item.quantity}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-600">
                                                  ₹
                                                  {(
                                                    item.price || 0
                                                  ).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                                  ₹
                                                  {(
                                                    (item.price || 0) *
                                                    (item.quantity || 0)
                                                  ).toLocaleString()}
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
