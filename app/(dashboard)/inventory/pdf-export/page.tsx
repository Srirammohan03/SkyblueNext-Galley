// app/(dashboard)/inventory/pdf-export/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import DownloadPDFButton from "@/components/download-pdf-button";

interface Order {
  id: string;
  flightNumber: string;
  tailNumber: string;
  date: string;
  // other fields as needed for PDF generation
}

export default function PdfExportPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Load orders on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/orders?type=flight")
      .then((r) => r.json())
      .then((data: Order[]) => {
        setOrders(data);
        if (data.length > 0) setSelectedOrderId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">PDF Export</h1>
        <button
          onClick={() => {
            setLoading(true);
            fetch("/api/orders?type=flight")
              .then((r) => r.json())
              .then((data: Order[]) => {
                setOrders(data);
                if (data.length > 0) setSelectedOrderId(data[0].id);
              })
              .catch(console.error)
              .finally(() => setLoading(false));
          }}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Order selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700">Select Flight Order:</label>
        <select
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value)}
          className="border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1868A5]/20"
        >
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.flightNumber} – {order.tailNumber} – {new Date(order.date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Download button */}
      {selectedOrder && (
        <div className="mt-4">
          <DownloadPDFButton order={selectedOrder} />
        </div>
      )}
    </div>
  );
}
