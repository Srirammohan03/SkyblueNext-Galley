// app/(dashboard)/dashboard/page.tsx

import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

import {
  Plane,
  Users,
  Utensils,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  Clock3,
  IndianRupee,
  AlertTriangle,
  ShoppingBasket,
  PlaneTakeoff,
  Plus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardActions from "./dashboard-actions";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const now = new Date();

  const [
    totalFlights,
    pendingApprovals,
    totalVendors,
    totalUsers,
    completedFlights,
    rejectedFlights,
    recentFlights,
    latestOrders,
    activeOrders,
    upcomingFlights,
  ] = await Promise.all([
    prisma.flightOrder.count(),

    prisma.flightOrder.count({
      where: {
        status: "Submitted",
      },
    }),

    prisma.vendor.count(),

    prisma.user.count(),

    prisma.flightOrder.count({
      where: {
        status: "Completed",
      },
    }),

    prisma.flightOrder.count({
      where: {
        status: "Rejected",
      },
    }),

    prisma.flightOrder.findMany({
      take: 5,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        flightNumber: true,
        departure: true,
        arrival: true,
        date: true,
        status: true,

        creator: {
          select: {
            name: true,
          },
        },
      },
    }),

    prisma.flightOrder.findMany({
      take: 5,
      orderBy: {
        updatedAt: "desc",
      },
    }),

    prisma.flightOrder.count({
      where: {
        NOT: {
          status: {
            in: ["Completed", "Rejected", "Cancelled"],
          },
        },
      },
    }),

    prisma.flightOrder.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },

      take: 5,

      orderBy: {
        date: "asc",
      },

      select: {
        id: true,
        flightNumber: true,
        departure: true,
        arrival: true,
        date: true,
        status: true,
      },
    }),
  ]);

  // const totalRevenue = await prisma.flightOrder.aggregate({
  //   _sum: {
  //     billAmount: true,
  //   },
  // });

  const urgentOrders = upcomingFlights.filter((flight) => {
    const flightDate = new Date(flight.date);

    const hoursUntilFlight =
      (flightDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return (
      hoursUntilFlight < 24 &&
      !["Completed", "Rejected", "Cancelled"].includes(flight.status)
    );
  });

  const stats = [
    {
      title: "Upcoming Flights",
      value: upcomingFlights.length,
      icon: Plane,
      trend: "up",
      change: `${completedFlights} completed`,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },

    {
      title: "Active Orders",
      value: activeOrders,
      icon: ShoppingBasket,
      trend: "up",
      change: "Orders in progress",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },

    {
      title: "Pending Approvals",
      value: pendingApprovals,
      icon: CheckSquare,
      trend: pendingApprovals > 0 ? "down" : "up",
      change:
        pendingApprovals > 0 ? `${pendingApprovals} waiting` : "All cleared",

      color: "text-orange-600",
      bg: "bg-orange-100",
    },

    // {
    //   title: "Active Vendors",
    //   value: totalVendors,
    //   icon: Utensils,
    //   trend: "up",
    //   change: "Vendor network",
    //   color: "text-violet-600",
    //   bg: "bg-violet-100",
    // },

    {
      title: "Team Members",
      value: totalUsers,
      icon: Users,
      trend: "up",
      change: "System users",
      color: "text-pink-600",
      bg: "bg-pink-100",
    },

    // {
    //   title: "Revenue",
    //   value: `₹${Number(totalRevenue._sum.billAmount || 0).toLocaleString()}`,
    //   icon: IndianRupee,
    //   trend: "up",
    //   change: "Total billing",
    //   color: "text-cyan-600",
    //   bg: "bg-cyan-100",
    // },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";

      case "Rejected":
      case "Cancelled":
        return "bg-red-100 text-red-700 border-red-200";

      case "Submitted":
        return "bg-amber-100 text-amber-700 border-amber-200";

      case "Approved":
        return "bg-blue-100 text-blue-700 border-blue-200";

      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Welcome back, {session.user?.name}
          </h1>

          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Monitor flights, catering operations, vendors, and approvals.
          </p>
        </div>

        <DashboardActions />
      </div>

      {/* URGENT ALERTS */}

      {urgentOrders.length > 0 && (
        <Card className="border-red-200 bg-red-50 rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="border-b border-red-100">
            <CardTitle className="flex items-center gap-3 text-red-700 text-xl">
              <AlertTriangle className="w-6 h-6" />
              Action Required ({urgentOrders.length})
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {urgentOrders.map((flight) => {
                const flightDate = new Date(flight.date);

                const hoursUntilFlight =
                  (flightDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                const isOverdue = hoursUntilFlight < 0;

                return (
                  <Link
                    key={flight.id}
                    href={`/flights/${flight.id}`}
                    className="
                      bg-white
                      border
                      border-red-100
                      rounded-2xl
                      p-5
                      hover:border-red-300
                      transition-all
                      hover:shadow-md
                    "
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-900">
                          {flight.flightNumber}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          {flight.departure} → {flight.arrival}
                        </p>
                      </div>

                      <Badge className={getStatusColor(flight.status)}>
                        {flight.status}
                      </Badge>
                    </div>

                    <div className="mt-4">
                      <p
                        className={`text-sm font-bold ${
                          isOverdue ? "text-red-600" : "text-orange-600"
                        }`}
                      >
                        {isOverdue
                          ? "Flight departed"
                          : `Departs in ${Math.floor(hoursUntilFlight)}h`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="
              rounded-3xl
              border-none
              shadow-sm
              hover:shadow-xl
              transition-all
              duration-300
              overflow-hidden
              group
            "
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
                    {stat.title}
                  </p>

                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 break-words">
                    {stat.value}
                  </h2>

                  <div className="flex items-center mt-4">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500 mr-1 shrink-0" />
                    )}

                    <span className="text-sm font-semibold text-slate-500">
                      {stat.change}
                    </span>
                  </div>
                </div>

                <div
                  className={`
                    w-14
                    h-14
                    rounded-2xl
                    flex
                    items-center
                    justify-center
                    shrink-0
                    ${stat.bg}
                    ${stat.color}
                    group-hover:scale-110
                    transition-transform
                  `}
                >
                  <stat.icon className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MAIN CONTENT */}

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-8">
        {/* RECENT FLIGHTS */}

        <Card className="2xl:col-span-2 rounded-3xl border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-2xl">Recent Flight Orders</CardTitle>

              <Link href="/flights">
                <Button variant="outline" size="sm" className="rounded-xl">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentFlights.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  No recent flights found.
                </div>
              ) : (
                recentFlights.map((flight) => {
                  return (
                    <Link
                      key={flight.id}
                      href={`/flights/${flight.id}`}
                      className="
                        block
                        p-6
                        hover:bg-slate-50/70
                        transition-colors
                      "
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                        <div className="flex items-start gap-5 min-w-0">
                          <div
                            className="
                              w-14
                              h-14
                              rounded-2xl
                              bg-blue-100
                              text-blue-600
                              flex
                              items-center
                              justify-center
                              shrink-0
                            "
                          >
                            <Plane className="w-7 h-7" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg sm:text-xl font-black text-slate-900 break-words">
                                {flight.flightNumber}
                              </h3>

                              <Badge className={getStatusColor(flight.status)}>
                                {flight.status}
                              </Badge>
                            </div>

                            <p className="text-slate-500 mt-2 text-sm sm:text-base">
                              {flight.departure} → {flight.arrival}
                            </p>

                            <div className="flex flex-wrap items-center gap-6 mt-4">
                              <div>
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                  Items
                                </p>

                                {/* <p className="text-sm font-semibold text-slate-900 mt-1">
                                  {flight.items.length}
                                </p> */}
                              </div>

                              <div>
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                  Created By
                                </p>

                                <p className="text-sm font-semibold text-slate-900 mt-1">
                                  {flight.creator?.name || "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="xl:text-right">
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                            Flight Date
                          </p>

                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {new Date(flight.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* SYSTEM ACTIVITY */}

        <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-2xl">System Activity</CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {latestOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-6">
                No activity found.
              </div>
            ) : (
              latestOrders.map((order) => (
                <div key={order.id} className="flex gap-4">
                  <div
                    className="
                      w-10
                      h-10
                      rounded-2xl
                      bg-blue-100
                      text-blue-600
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <Clock3 className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 break-words">
                      Flight {order.flightNumber}
                    </p>

                    <p className="text-sm text-slate-500 mt-1">
                      Status changed to{" "}
                      <span className="font-semibold">{order.status}</span>
                    </p>

                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mt-2">
                      {new Date(order.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* UPCOMING FLIGHTS */}

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-2xl">Upcoming Flights</CardTitle>

            <Link href="/flights">
              <Button variant="outline" size="sm" className="rounded-xl">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {upcomingFlights.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No upcoming flights.
              </div>
            ) : (
              upcomingFlights.map((flight) => (
                <Link
                  key={flight.id}
                  href={`/flights/${flight.id}`}
                  className="
                    block
                    p-6
                    hover:bg-slate-50
                    transition-colors
                  "
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="text-center w-14 shrink-0">
                        <p className="text-xs uppercase text-slate-400 font-black">
                          {new Date(flight.date).toLocaleString("default", {
                            month: "short",
                          })}
                        </p>

                        <p className="text-2xl font-black text-slate-900">
                          {new Date(flight.date).getDate()}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-black text-slate-900 text-lg break-words">
                            {flight.departure} → {flight.arrival}
                          </h3>

                          <span className="text-sm text-slate-500">
                            {flight.flightNumber}
                          </span>
                        </div>

                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(flight.date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <Badge className={getStatusColor(flight.status)}>
                      {flight.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
