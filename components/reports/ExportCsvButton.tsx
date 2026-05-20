"use client";
// components/reports/ExportCsvButton.tsx

import React from "react";
import { Download } from "lucide-react";

interface ExportCsvButtonProps {
  data: Record<string, unknown>[];
  filename?: string;
  label?: string;
}

function toCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const keys = Object.keys(data[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = keys.map(escape).join(",");
  const rows = data.map((row) => keys.map((k) => escape(row[k])).join(","));
  return [header, ...rows].join("\n");
}

export default function ExportCsvButton({
  data,
  filename = "export.csv",
  label = "Export CSV",
}: ExportCsvButtonProps) {
  const handleExport = () => {
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!data.length}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition-colors"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
