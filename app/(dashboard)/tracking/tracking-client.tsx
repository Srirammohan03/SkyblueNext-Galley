// app\(dashboard)\tracking\tracking-client.tsx
"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Eye,
  FileText,
  Filter,
  Loader2,
  Mail,
  Minus,
  Package,
  Plane,
  Plus,
  RefreshCcw,
  Send,
  Upload,
  X,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DownloadPDFButton from "@/components/download-pdf-button";
import { toast } from "@/components/ui/use-toast";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  category?: string | null;
  unit?: string | null;
  vendorName?: string | null;
  vendor?: {
    id: string;
    name: string;
    email: string;
    contactPerson?: string;
  } | null;
}

interface Order {
  id: string;
  flightNumber: string;
  tailNumber: string;
  departure: string;
  arrival: string;
  date: string;
  status: string;
  billUrl?: string | null;
  billAmount?: number | null;
  billNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: string;
    name: string;
    email: string;
    contactPerson?: string;
  } | null;
  creator?: { name: string };
  approver?: { name: string; role: string } | null;
  rejector?: { name: string; role: string } | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  items: OrderItem[];
  restoredItems?: Array<{
    id: string;
    itemId: string;
    returnedQty: number;
    restoredBy: string;
    restoredAt: string;
    item?: {
      name: string;
      unit?: string;
      category?: string;
    };
  }> | null;
}

interface Props {
  orders: Order[];
}

const statusFlow = [
  "Submitted",
  "Approved",
  "SentToVendor",
  "Confirmed",
  "Delivered",
  "Completed",
];

const statusLabels: Record<string, string> = {
  Submitted: "Submitted",
  Approved: "Approved",
  SentToVendor: "Sent to Vendor",
  Confirmed: "Confirmed",
  Delivered: "Delivered",
  Completed: "Completed",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
};

const stepShortLabel: Record<string, string> = {
  Submitted: "Submitted",
  Approved: "Approved",
  SentToVendor: "Sent to Vendor",
  Confirmed: "Confirmed",
  Delivered: "Delivered",
  Completed: "Completed",
};

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  Submitted: {
    label: "Submitted",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  Approved: {
    label: "Approved",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  SentToVendor: {
    label: "Sent to Vendor",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  Confirmed: {
    label: "Confirmed",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
  },
  Delivered: {
    label: "Delivered",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  Completed: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  Rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  Cancelled: {
    label: "Cancelled",
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

type ConfirmDialogState = { order: Order; targetStatus: string } | null;
type RestoreItem = {
  id: string;
  name: string;
  quantity: number;
  returnedQty: number;
  unit?: string | null;
  category?: string | null;
};

export default function TrackingClient({ orders }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [billAmount, setBillAmount] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [billFile, setBillFile] = useState<File | null>(null);

  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);

  const [restoreOrder, setRestoreOrder] = useState<Order | null>(null);
  const [restoreItems, setRestoreItems] = useState<RestoreItem[]>([]);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [vendorDialog, setVendorDialog] = useState<Order | null>(null);
  const [sendingVendorMail, setSendingVendorMail] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const getVendorMessage = (
    vendorName: string,
    contactPerson: string,
    flightNumber?: string,
    departure?: string,
    arrival?: string,
    deliveryDate?: string,
    deliveryTime?: string,
  ) => {
    return `
  <div style="
    font-size:15px;
    line-height:1.6;
    color:#1e293b;
  ">

    <div style="margin-bottom:12px;">
      Dear ${contactPerson} Team,
    </div>

    <div style="margin-bottom:12px;">
      Greetings from SkyBlue Galley Operations.
    </div>

    <div style="margin-bottom:12px;">
      Please find attached the catering order details for
      Flight <strong>${flightNumber}</strong>
      operating from <strong>${departure}</strong>
      to <strong>${arrival}</strong>.
    </div>

    <div style="margin-bottom:12px;">
      Kindly prepare and arrange the requested catering items
      as per the attached PDF document.
    </div>

    <div style="margin-bottom:12px;">
      <strong>Delivery Required Before:</strong><br/>
      ${
        deliveryDate
          ? format(
              new Date(`${deliveryDate} ${deliveryTime}`),
              "dd-MMM-yyyy hh:mma",
            )
          : "-"
      }
    </div>

    <div style="margin-bottom:12px;">
      Please ensure timely delivery and confirm receipt of this order.
    </div>

    <div style="margin-bottom:12px;">
      If you have any questions or require clarification,
      please feel free to contact us.
    </div>

    <div style="margin-bottom:18px;">
      Thank you for your support and cooperation.
    </div>

    <div>
      Best Regards,<br/>
      <strong>SkyBlue Galley Operations Team</strong>
    </div>

  </div>
  `;
  };

  const [vendorMessages, setVendorMessages] = useState<Record<string, string>>(
    {},
  );
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const query = search.toLowerCase();
        return (
          order.flightNumber.toLowerCase().includes(query) ||
          order.departure.toLowerCase().includes(query) ||
          order.arrival.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [orders, search]);

  const confirmStatusChange = (order: Order, status: string) => {
    if (status === "Rejected") {
      setRejectingOrder(order);
      return;
    }
    setConfirmDialog({ order, targetStatus: status });
  };

  const handleStatusChange = async (order: Order, status: string) => {
    try {
      const flightDate = new Date(order.date);
      if (
        flightDate < new Date() &&
        !["Cancelled", "Rejected"].includes(status)
      ) {
        toast({
          title: "Flight Expired",
          description: "This flight departure time has already passed.",
          variant: "destructive",
        });
        setConfirmDialog(null);
        return;
      }
      setLoadingId(order.id);
      await axios.patch(`/api/flights/${order.id}/status`, { status });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
      setConfirmDialog(null);
    }
  };

  const openUploadModal = (order: Order) => {
    setSelectedOrder(order);
    setBillAmount(order.billAmount?.toString() || "");
    setBillNotes(order.billNotes || "");
  };

  const handleReject = async () => {
    try {
      if (!rejectingOrder) return;
      setLoadingId(rejectingOrder.id);
      await axios.patch(`/api/flights/${rejectingOrder.id}/status`, {
        status: "Rejected",
        rejectionReason,
      });
      setRejectingOrder(null);
      setRejectionReason("");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };
  const handleCancel = async () => {
    try {
      if (!cancellingOrder) return;

      setLoadingId(cancellingOrder.id);

      await axios.patch(`/api/flights/${cancellingOrder.id}/status`, {
        status: "Cancelled",
        cancelReason,
      });

      setCancellingOrder(null);
      setCancelReason("");

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };
  const handleUploadBill = async () => {
    try {
      if (!selectedOrder) return;
      setLoadingId(selectedOrder.id);
      let uploadedUrl = selectedOrder.billUrl;
      if (billFile) {
        const formData = new FormData();
        formData.append("file", billFile);
        const uploadRes = await axios.post("/api/upload", formData);
        uploadedUrl = uploadRes.data.url;
      }
      await axios.patch(`/api/flights/${selectedOrder.id}/status`, {
        status: "Completed",
        billAmount,
        billNotes,
        billUrl: uploadedUrl,
      });
      setSelectedOrder(null);
      setBillAmount("");
      setBillNotes("");
      setBillFile(null);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  const openRestoreModal = (order: Order) => {
    setRestoreOrder(order);

    setRestoreItems(
      order?.items
        ?.filter((item: any) => {
          return (
            item?.type?.toLowerCase() === "grocery" ||
            item?.category?.toLowerCase() === "grocery"
          );
        })
        .map((item: any) => {
          const alreadyRestored = (order.restoredItems || [])
            .filter((restore: any) => restore.itemId === item.id)
            .reduce(
              (sum: number, restore: any) => sum + restore.returnedQty,
              0,
            );

          const remainingQty = item.quantity - alreadyRestored;

          return {
            id: item.id,
            name: item.name,
            quantity: remainingQty,
            returnedQty: 0,
            unit: item.unit,
            category: item.category,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRestoreQtyChange = (id: string, delta: number) => {
    setRestoreItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = Math.min(
          item.quantity,
          Math.max(0, item.returnedQty + delta),
        );
        return { ...item, returnedQty: next };
      }),
    );
  };

  const handleRestoreSubmit = async () => {
    try {
      if (!restoreOrder) return;
      setRestoreLoading(true);
      await axios.post(`/api/flights/${restoreOrder.id}/restore`, {
        items: restoreItems.map(({ id, returnedQty }) => ({ id, returnedQty })),
      });
      setRestoreOrder(null);
      setRestoreItems([]);
      toast({
        title: "Items restored",
        description: "Returned quantities have been saved.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to restore items.",
        variant: "destructive",
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  const getStepIndex = (status: string) => statusFlow.indexOf(status);

  return (
    <>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#1868A5] mb-1">
                Operations
              </p>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Order Tracking
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Monitor and manage catering workflow in real time.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
              <Filter className="w-4 h-4 text-[#1868A5]" />
              <span className="text-sm text-slate-500">
                <span className="font-bold text-slate-900">
                  {filteredOrders.length}
                </span>{" "}
                flights
              </span>
            </div>
          </div>

          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <Input
              placeholder="Search by flight number or route…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-10 rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-[#1868A5] focus-visible:border-[#1868A5] text-sm"
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">
                No orders found
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Orders will appear here once submitted.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredOrders.map((order) => {
                const flightDate = new Date(order.date);
                const now = new Date();
                const hoursUntilFlight =
                  (flightDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                const isUrgent =
                  hoursUntilFlight > 0 &&
                  hoursUntilFlight < 24 &&
                  !["Completed", "Cancelled", "Rejected"].includes(
                    order.status,
                  );
                const isOverdue =
                  hoursUntilFlight < 0 &&
                  !["Completed", "Cancelled", "Rejected"].includes(
                    order.status,
                  );
                const cfg =
                  statusConfig[order.status] || statusConfig.Submitted;
                const currentStep = getStepIndex(order.status);
                const isTerminal =
                  order.status === "Rejected" || order.status === "Cancelled";
                const isSentToVendor = order.status === "SentToVendor";
                const isDelivered = order.status === "Delivered";

                return (
                  <Card
                    key={order.id}
                    className={cn(
                      "rounded-3xl border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md",
                      isUrgent
                        ? "border-orange-300"
                        : isOverdue
                          ? "border-red-300"
                          : "border-slate-200",
                    )}
                  >
                    <CardContent className="p-0">
                      <div
                        className={cn(
                          "h-1 w-full",
                          isUrgent
                            ? "bg-orange-400"
                            : isOverdue
                              ? "bg-red-400"
                              : order.status === "Completed"
                                ? "bg-emerald-400"
                                : order.status === "Rejected"
                                  ? "bg-red-400"
                                  : "bg-[#1868A5]",
                        )}
                      />

                      <div className="p-6 lg:p-8">
                        {(isUrgent || isOverdue) && (
                          <div
                            className={cn(
                              "flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6 border",
                              isUrgent
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-red-50 text-red-700 border-red-200",
                            )}
                          >
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                              {isUrgent
                                ? "Urgent: Flight departs within 24 hours."
                                : "Overdue: Flight departure time has already passed."}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col xl:flex-row xl:items-start gap-8">
                          <div className="flex-1 min-w-0 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-[#1868A5]/10 flex items-center justify-center shrink-0">
                                <Plane className="w-6 h-6 text-[#1868A5]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {order.flightNumber}
                                  </h2>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
                                      cfg.bg,
                                      cfg.color,
                                      cfg.border,
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        cfg.dot,
                                      )}
                                    />
                                    {cfg.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 text-slate-500 text-sm font-medium">
                                  <span>{order.departure}</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                  <span>{order.arrival}</span>
                                  <span className="text-slate-300">·</span>
                                  <span>
                                    {format(
                                      new Date(order.date),
                                      "MMM dd, yyyy",
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {!isTerminal && (
                              <div className="space-y-4">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                                  Workflow Progress
                                </p>

                                <div className="flex items-start overflow-x-auto scrollbar-hide pb-2">
                                  {statusFlow.map((status, idx) => {
                                    const isStepCompleted = currentStep > idx;
                                    const isStepActive = currentStep === idx;
                                    return (
                                      <div
                                        key={status}
                                        className="flex items-center min-w-[88px] sm:flex-1 last:flex-none"
                                      >
                                        <button
                                          onClick={() => {
                                            const targetIndex =
                                              statusFlow.indexOf(status);
                                            const currentIndex =
                                              statusFlow.indexOf(order.status);

                                            // BLOCK BACKWARD STATUS
                                            if (targetIndex < currentIndex) {
                                              toast({
                                                title: "Invalid Status Update",
                                                description:
                                                  "You cannot move workflow backwards once progressed.",
                                                variant: "destructive",
                                              });

                                              return;
                                            }

                                            // BLOCK SAME STATUS
                                            if (targetIndex === currentIndex) {
                                              toast({
                                                title: "Already Active",
                                                description:
                                                  "This workflow step is already active.",
                                              });

                                              return;
                                            }

                                            // BLOCK COMPLETED
                                            if (
                                              order.status === "Completed" ||
                                              order.status === "Cancelled" ||
                                              order.status === "Rejected"
                                            ) {
                                              toast({
                                                title: "Workflow Locked",
                                                description:
                                                  "This order can no longer be modified.",
                                                variant: "destructive",
                                              });

                                              return;
                                            }

                                            confirmStatusChange(order, status);
                                          }}
                                          disabled={loadingId === order.id}
                                          className="relative flex flex-col items-center gap-1.5 group transition-all focus:outline-none"
                                        >
                                          <div
                                            className={cn(
                                              "w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                              isStepCompleted
                                                ? "bg-[#1868A5] border-[#1868A5]"
                                                : isStepActive
                                                  ? "bg-white border-[#1868A5] ring-4 ring-[#1868A5]/15"
                                                  : "bg-white border-slate-200 group-hover:border-[#1868A5]/40",
                                            )}
                                          >
                                            {isStepCompleted ? (
                                              <CheckCircle2 className="w-4 h-4 text-white" />
                                            ) : isStepActive ? (
                                              <div className="w-2.5 h-2.5 rounded-full bg-[#1868A5]" />
                                            ) : (
                                              <Circle className="w-3 h-3 text-slate-300 group-hover:text-[#1868A5]/40" />
                                            )}
                                          </div>
                                          <span
                                            className={cn(
                                              "text-[9px] sm:text-[10px] font-semibold whitespace-normal hidden sm:block text-center leading-tight w-[60px]",
                                              isStepCompleted || isStepActive
                                                ? "text-[#1868A5]"
                                                : "text-slate-400",
                                            )}
                                          >
                                            {stepShortLabel[status] ?? status}
                                          </span>
                                        </button>
                                        {idx < statusFlow.length - 1 && (
                                          <div
                                            className={cn(
                                              "flex-1 h-0.5 mx-1 rounded-full transition-colors mb-5",
                                              currentStep > idx
                                                ? "bg-[#1868A5]"
                                                : "bg-slate-200",
                                            )}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {isSentToVendor && (
                                  <div className="pt-3 border-t border-slate-100">
                                    <Button
                                      onClick={() => {
                                        setVendorDialog(order);

                                        const messages: Record<string, string> =
                                          {};

                                        order.items?.forEach((item: any) => {
                                          if (item.vendor?.id) {
                                            messages[item.vendor.id] =
                                              getVendorMessage(
                                                item.vendor.name,
                                                item.vendor.contactPerson ||
                                                  "Vendor",
                                                order.flightNumber,
                                                order.departure,
                                                order.arrival,
                                                (order as any).deliveryDate,
                                                (order as any).deliveryTime,
                                              );
                                          }
                                        });

                                        setVendorMessages(messages);
                                      }}
                                      variant="outline"
                                      className="h-9 px-4 rounded-xl border border-violet-200 text-violet-600 text-xs font-semibold hover:bg-violet-50 transition-all"
                                    >
                                      <Send className="w-3.5 h-3.5 mr-2" />
                                      Send to Vendor
                                    </Button>
                                  </div>
                                )}

                                {isDelivered && (
                                  <div className="pt-3 border-t border-slate-100">
                                    <Button
                                      onClick={() => openRestoreModal(order)}
                                      variant="outline"
                                      className="h-9 px-4 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 transition-all"
                                    >
                                      <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                                      Restore Items
                                    </Button>
                                  </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => setRejectingOrder(order)}
                                    disabled={loadingId === order.id}
                                    className="h-9 px-4 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-all"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => setCancellingOrder(order)}
                                    disabled={loadingId === order.id}
                                    className="h-9 px-4 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            <div
                              className={cn(
                                "grid gap-5 border-t border-slate-100 pt-6",
                                isTerminal
                                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                  : "grid-cols-2 lg:grid-cols-4",
                              )}
                            >
                              {/* ITEMS */}
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">
                                  Items
                                </p>

                                <p className="text-lg font-bold text-slate-900">
                                  {order.items?.length ?? 0}
                                </p>
                              </div>

                              {/* NORMAL FLOW */}
                              {!isTerminal && (
                                <>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">
                                      Vendor
                                    </p>

                                    <div className="flex flex-wrap gap-1.5">
                                      {Array.from(
                                        new Set(
                                          order.items
                                            ?.map(
                                              (item: any) =>
                                                item.vendor?.name ||
                                                item.vendorName,
                                            )
                                            .filter(Boolean),
                                        ),
                                      ).map((vendor: any) => (
                                        <span
                                          key={vendor}
                                          className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600"
                                        >
                                          {vendor}
                                        </span>
                                      ))}

                                      {!order.items?.some(
                                        (item: any) =>
                                          item.vendor?.name || item.vendorName,
                                      ) && (
                                        <span className="text-sm font-semibold text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">
                                      Submitted
                                    </p>

                                    <p className="text-sm font-bold text-slate-900">
                                      {format(
                                        new Date(order.createdAt),
                                        "MMM dd, yyyy",
                                      )}
                                    </p>
                                  </div>
                                </>
                              )}

                              {/* REJECTED */}
                              {order.status === "Rejected" && (
                                <div className="sm:col-span-1 lg:col-span-2">
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-red-400 mb-1">
                                    Rejected By
                                  </p>

                                  <p className="text-sm font-bold text-slate-900 mb-1">
                                    {order.rejector?.name || "—"}
                                  </p>

                                  {order.rejectionReason && (
                                    <p className="text-sm text-red-600 leading-relaxed break-words">
                                      {order.rejectionReason}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* CANCELLED */}
                              {order.status === "Cancelled" && (
                                <div className="sm:col-span-1 lg:col-span-2">
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                                    Cancelled By
                                  </p>

                                  <p className="text-sm font-bold text-slate-900 mb-1">
                                    {order.rejector?.name || "—"}
                                  </p>

                                  {order.cancelReason && (
                                    <p className="text-sm text-slate-600 leading-relaxed break-words">
                                      {order.cancelReason}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* APPROVED FLOW */}
                              {!isTerminal && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">
                                    Approved By
                                  </p>

                                  {order.approver ? (
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">
                                        {order.approver.name}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-semibold text-slate-400">
                                      Pending
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {order.status !== "Rejected" && (
                            <div className="xl:w-[220px] shrink-0 flex flex-col gap-2.5">
                              {order.vendor?.email && (
                                <a
                                  href={`mailto:${order.vendor.email}`}
                                  className="block"
                                >
                                  <Button
                                    variant="outline"
                                    className="w-full h-10 rounded-xl text-sm border-slate-200 hover:border-[#1868A5]/30 hover:bg-[#1868A5]/5"
                                  >
                                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                    Email Vendor
                                  </Button>
                                </a>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => openUploadModal(order)}
                                  className="h-10 rounded-xl text-sm border-slate-200 hover:border-[#1868A5]/30 hover:bg-[#1868A5]/5"
                                >
                                  <Upload className="w-4 h-4 mr-1.5 text-slate-400" />
                                  Invoice
                                </Button>
                                <Link href={`/flights/${order.id}`}>
                                  <Button
                                    variant="outline"
                                    className="w-full h-10 rounded-xl text-sm border-slate-200 hover:border-[#1868A5]/30 hover:bg-[#1868A5]/5"
                                  >
                                    <Eye className="w-4 h-4 mr-1.5 text-slate-400" />
                                    View
                                  </Button>
                                </Link>
                              </div>

                              <DownloadPDFButton order={order} />

                              {order.billUrl && (
                                <a
                                  href={order.billUrl}
                                  target="_blank"
                                  className="block"
                                >
                                  <Button
                                    variant="outline"
                                    className="w-full h-10 rounded-xl text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Invoice
                                  </Button>
                                </a>
                              )}

                              {order.billAmount && (
                                <div className="mt-1 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-center">
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                                    Bill Amount
                                  </p>
                                  <p className="text-lg font-bold text-slate-900">
                                    ${Number(order.billAmount).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-7 pt-7 pb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Confirm Status Change
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  Flight {confirmDialog.order.flightNumber}
                </p>
              </div>
              <button
                onClick={() => setConfirmDialog(null)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors mt-0.5"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="px-7 pb-7 space-y-5">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
                      (
                        statusConfig[confirmDialog.order.status] ||
                        statusConfig.Submitted
                      ).bg,
                      (
                        statusConfig[confirmDialog.order.status] ||
                        statusConfig.Submitted
                      ).color,
                      (
                        statusConfig[confirmDialog.order.status] ||
                        statusConfig.Submitted
                      ).border,
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        (
                          statusConfig[confirmDialog.order.status] ||
                          statusConfig.Submitted
                        ).dot,
                      )}
                    />
                    {statusLabels[confirmDialog.order.status] ??
                      confirmDialog.order.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
                      (
                        statusConfig[confirmDialog.targetStatus] ||
                        statusConfig.Submitted
                      ).bg,
                      (
                        statusConfig[confirmDialog.targetStatus] ||
                        statusConfig.Submitted
                      ).color,
                      (
                        statusConfig[confirmDialog.targetStatus] ||
                        statusConfig.Submitted
                      ).border,
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        (
                          statusConfig[confirmDialog.targetStatus] ||
                          statusConfig.Submitted
                        ).dot,
                      )}
                    />
                    {statusLabels[confirmDialog.targetStatus] ??
                      confirmDialog.targetStatus}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Are you sure you want to move this order to{" "}
                  <span className="font-semibold text-slate-900">
                    {statusLabels[confirmDialog.targetStatus] ??
                      confirmDialog.targetStatus}
                  </span>
                  ?
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 h-11 rounded-xl border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleStatusChange(
                      confirmDialog.order,
                      confirmDialog.targetStatus,
                    )
                  }
                  disabled={loadingId === confirmDialog.order.id}
                  className="flex-1 h-11 rounded-xl bg-[#1868A5] hover:bg-[#1868A5]/90"
                >
                  {loadingId === confirmDialog.order.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-7 pt-7 pb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Upload Invoice
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  Flight {selectedOrder.flightNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors mt-0.5"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="px-7 pb-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Invoice File
                </label>
                <label
                  className={cn(
                    "flex items-center justify-center gap-2.5 w-full h-28 rounded-2xl border-2 border-dashed cursor-pointer transition-colors",
                    billFile
                      ? "border-[#1868A5]/40 bg-[#1868A5]/5"
                      : "border-slate-200 bg-slate-50 hover:border-[#1868A5]/30 hover:bg-[#1868A5]/5",
                  )}
                >
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <Upload
                      className={cn(
                        "w-5 h-5 mx-auto mb-1.5",
                        billFile ? "text-[#1868A5]" : "text-slate-400",
                      )}
                    />
                    <p className="text-sm font-medium text-slate-600">
                      {billFile
                        ? billFile.name
                        : "Click to upload PDF or image"}
                    </p>
                    {!billFile && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        PDF, PNG, JPG up to 10MB
                      </p>
                    )}
                  </div>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bill Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11 pl-8 rounded-xl border-slate-200 focus-visible:ring-[#1868A5] focus-visible:border-[#1868A5]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Notes
                </label>
                <Textarea
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  placeholder="Add vendor remarks or billing notes…"
                  className="min-h-[100px] rounded-xl border-slate-200 focus-visible:ring-[#1868A5] focus-visible:border-[#1868A5] resize-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 h-11 rounded-xl border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadBill}
                  disabled={loadingId === selectedOrder.id}
                  className="flex-1 h-11 rounded-xl bg-[#1868A5] hover:bg-[#1868A5]/90"
                >
                  {loadingId === selectedOrder.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-7 pt-7 pb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Reject Order
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  Flight {rejectingOrder.flightNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setRejectingOrder(null);
                  setRejectionReason("");
                }}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors mt-0.5"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="px-7 pb-7 space-y-5">
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-relaxed">
                  Please provide a reason for rejecting this order. This will be
                  visible to the submitter.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Rejection Reason
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Incorrect quantities, missing details, dietary issue…"
                  className="min-h-[130px] rounded-xl border-slate-200 focus-visible:ring-red-400 focus-visible:border-red-300 resize-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingOrder(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 h-11 rounded-xl border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={
                    !rejectionReason.trim() || loadingId === rejectingOrder.id
                  }
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                >
                  {loadingId === rejectingOrder.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  Confirm Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-7 pt-7 pb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Cancel Order
                </h2>

                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  Flight {cancellingOrder.flightNumber}
                </p>
              </div>

              <button
                onClick={() => {
                  setCancellingOrder(null);
                  setCancelReason("");
                }}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors mt-0.5"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="px-7 pb-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cancel Message
                </label>

                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  className="min-h-[130px] rounded-xl border-slate-200 resize-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancelReason("");
                  }}
                  className="flex-1 h-11 rounded-xl border-slate-200"
                >
                  Back
                </Button>

                <Button
                  onClick={handleCancel}
                  disabled={
                    !cancelReason.trim() || loadingId === cancellingOrder.id
                  }
                  className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {loadingId === cancellingOrder.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  Confirm Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {restoreOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-7 pt-7 pb-5 flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Restore Items
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  Flight {restoreOrder.flightNumber} — enter quantities returned
                  after the trip
                </p>
              </div>
              <button
                onClick={() => {
                  setRestoreOrder(null);
                  setRestoreItems([]);
                }}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors mt-0.5"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="px-7 pb-4 shrink-0">
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <RefreshCcw className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 leading-relaxed">
                  Enter how many units of each item were returned unused after
                  the flight. Leave at 0 if fully consumed.
                </p>
              </div>
            </div>

            <div className="px-7 py-2 overflow-y-auto flex-1 space-y-2.5">
              {restoreItems?.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                  <Package className="w-8 h-8 mb-2" />
                  <p className="text-sm">No items found for this order.</p>
                </div>
              ) : (
                restoreItems?.map((item) => (
                  <div
                    key={item?.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ordered:{" "}
                        <span className="font-semibold text-slate-600">
                          {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </span>
                        {item.category && (
                          <span className="ml-2 text-slate-400">
                            · {item.category}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onMouseDown={() => {
                          handleRestoreQtyChange(item.id, -1);

                          const interval = setInterval(() => {
                            handleRestoreQtyChange(item.id, -1);
                          }, 120);

                          const stop = () => {
                            clearInterval(interval);

                            window.removeEventListener("mouseup", stop);
                          };

                          window.addEventListener("mouseup", stop);
                        }}
                        disabled={item.returnedQty === 0}
                        className="
      w-9
      h-9
      rounded-xl
      border
      border-slate-200
      bg-white
      flex
      items-center
      justify-center
      hover:bg-slate-100
      disabled:opacity-40
      transition-colors
    "
                      >
                        <Minus className="w-4 h-4 text-slate-600" />
                      </button>

                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={item.returnedQty}
                        onChange={(e) => {
                          const value = Number(e.target.value);

                          setRestoreItems((prev) =>
                            prev.map((restoreItem) =>
                              restoreItem.id === item.id
                                ? {
                                    ...restoreItem,
                                    returnedQty: Math.min(
                                      item.quantity,
                                      Math.max(0, value || 0),
                                    ),
                                  }
                                : restoreItem,
                            ),
                          );
                        }}
                        className="
      w-20
      h-10
      rounded-xl
      border-slate-200
      text-center
      font-bold
      text-sm
      focus-visible:ring-emerald-500
      focus-visible:border-emerald-500
    "
                      />

                      <button
                        onMouseDown={() => {
                          handleRestoreQtyChange(item.id, 1);

                          const interval = setInterval(() => {
                            handleRestoreQtyChange(item.id, 1);
                          }, 120);

                          const stop = () => {
                            clearInterval(interval);

                            window.removeEventListener("mouseup", stop);
                          };

                          window.addEventListener("mouseup", stop);
                        }}
                        disabled={item.returnedQty >= item.quantity}
                        className="
      w-9
      h-9
      rounded-xl
      border
      border-slate-200
      bg-white
      flex
      items-center
      justify-center
      hover:bg-slate-100
      disabled:opacity-40
      transition-colors
    "
                      >
                        <Plus className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-7 py-5 border-t border-slate-100 shrink-0 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRestoreOrder(null);
                  setRestoreItems([]);
                }}
                className="flex-1 h-11 rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestoreSubmit}
                disabled={restoreLoading}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {restoreLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4 mr-2" />
                )}
                Save Restored Items
              </Button>
            </div>
          </div>
        </div>
      )}
      {vendorDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 max-h-[95vh] overflow-y-auto">
            <div className="border-b border-slate-100 px-5 sm:px-8 py-5 sm:py-6 flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-violet-700" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                      Send Vendor Order
                    </h2>

                    <p className="text-sm text-slate-500 mt-0.5 truncate">
                      Flight {vendorDialog.flightNumber} •{" "}
                      {vendorDialog.departure} → {vendorDialog.arrival}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setVendorDialog(null)}
                className="w-10 h-10 rounded-2xl hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">
                      From
                    </p>
                  </div>

                  <div className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1868A5]/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-[#1868A5]" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          SkyBlue Galley Operations
                        </p>

                        <p className="text-sm text-slate-500 truncate">
                          {process.env.NEXT_PUBLIC_FROM_EMAIL}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">
                      To
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Map(
                          vendorDialog.items
                            ?.filter((item) => item.vendor?.email)
                            .map((item) => [
                              item.vendor?.email,
                              {
                                name: item.vendor?.name || item.vendorName,

                                email: item.vendor?.email,
                              },
                            ]),
                        ).values(),
                      ).map((vendor: any) => (
                        <div
                          key={vendor.email}
                          className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2"
                        >
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-xs font-bold">
                            {vendor.name?.charAt(0)}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-violet-900 truncate">
                              {vendor.name}
                            </p>

                            <p className="text-xs text-violet-600 truncate">
                              {vendor.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">
                      Subject
                    </p>
                  </div>

                  <div className="p-4">
                    <Input
                      value={`Catering Order - Flight ${vendorDialog.flightNumber}`}
                      readOnly
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">
                      Message
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="space-y-5">
                      {Array.from(
                        new Map(
                          vendorDialog.items
                            ?.filter((item) => item.vendor?.email)
                            .map((item) => [
                              item.vendor?.id,
                              {
                                id: item.vendor?.id,
                                name: item.vendor?.name || item.vendorName,
                                email: item.vendor?.email,
                              },
                            ]),
                        ).values(),
                      ).map((vendor: any) => (
                        <div
                          key={vendor.id}
                          className="rounded-2xl border border-slate-200 overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-violet-50 border-b border-violet-100">
                            <p className="text-sm font-semibold text-violet-900">
                              {vendor.name}
                            </p>

                            <p className="text-xs text-violet-600">
                              {vendor.email}
                            </p>
                          </div>
                          <div className="p-4">
                            <div
                              className="
      min-h-[220px]
      rounded-2xl
      border
      border-slate-200
      bg-white
      p-4
      text-sm
      leading-7
      text-slate-700
      overflow-y-auto
    "
                              dangerouslySetInnerHTML={{
                                __html: vendorMessages[vendor.id] || "",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-emerald-700" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-emerald-900">
                        PDF Attachments
                      </h3>

                      <p className="text-sm text-emerald-700 mt-1 leading-relaxed">
                        Each vendor will receive only their own catering PDF
                        with no access to other vendor items.
                      </p>

                      <div className="mt-4 space-y-2">
                        {Array.from(
                          new Map(
                            vendorDialog.items
                              ?.filter((item) => item.vendor?.email)
                              .map((item) => [
                                item.vendor?.email,
                                {
                                  name: item.vendor?.name || item.vendorName,
                                },
                              ]),
                          ).values(),
                        ).map((vendor: any) => (
                          <div
                            key={vendor.name}
                            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />

                              <p className="text-sm font-medium text-slate-700 truncate">
                                {vendor.name}-order.pdf
                              </p>
                            </div>

                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                              Attached
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setVendorDialog(null)}
                  className="flex-1 h-12 rounded-2xl border-slate-200"
                >
                  Cancel
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      setSendingVendorMail(true);

                      const vendorGroups = vendorDialog.items.reduce(
                        (acc: any, item: any) => {
                          const vendorId = item.vendor?.id;

                          if (!vendorId) return acc;

                          if (!acc[vendorId]) {
                            acc[vendorId] = {
                              vendorId,

                              vendorName: item.vendor?.name,

                              vendorEmail: item.vendor?.email,

                              items: [],
                            };
                          }

                          acc[vendorId].items.push(item);

                          return acc;
                        },
                        {},
                      );

                      const vendorList = Object.values(vendorGroups);

                      await Promise.all(
                        vendorList.map(async (vendor: any) => {
                          const pdfResponse = await fetch(
                            `/api/vendors/${vendor.vendorId}/pdf?flightId=${vendorDialog.id}`,
                          );

                          const pdfBlob = await pdfResponse.blob();

                          const arrayBuffer = await pdfBlob.arrayBuffer();

                          const base64 = btoa(
                            new Uint8Array(arrayBuffer).reduce(
                              (data, byte) => data + String.fromCharCode(byte),
                              "",
                            ),
                          );

                          await axios.post("/api/vendors/send-order", {
                            vendorId: vendor.vendorId,

                            vendorName: vendor.vendorName,

                            email: vendor.vendorEmail,

                            flightId: vendorDialog.id,

                            flightNumber: vendorDialog.flightNumber,

                            departure: vendorDialog.departure,

                            arrival: vendorDialog.arrival,

                            flightDate: vendorDialog.date,

                            message: vendorMessages[vendor.vendorId] || "",

                            filename: `${vendor.vendorName}-order.pdf`,

                            pdfBuffer: base64,

                            items: vendor.items,
                          });
                        }),
                      );

                      toast({
                        title: "Vendor mails sent successfully",
                      });

                      setVendorDialog(null);

                      router.refresh();
                    } catch (error) {
                      console.log(error);

                      toast({
                        title: "Failed to send vendor mail",

                        variant: "destructive",
                      });
                    } finally {
                      setSendingVendorMail(false);
                    }
                  }}
                  disabled={sendingVendorMail}
                  className="flex-1 h-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {sendingVendorMail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Vendor Mail
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
