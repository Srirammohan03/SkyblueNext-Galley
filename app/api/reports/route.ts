// app\api\reports\route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get("reportType");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const search = searchParams.get("search") || "";

  // parse dates
  let dateFilter: any = {};
  if (startDateStr && endDateStr && startDateStr !== 'undefined' && endDateStr !== 'undefined') {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    dateFilter = {
      gte: start,
      lte: end,
    };
  }

  try {
    if (reportType === "flights") {
      const status = searchParams.get("status") || "Completed";

      const flights = await prisma.flightOrder.findMany({
        where: {
          status: status as any,
          flightNumber: { contains: search, mode: "insensitive" },
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
        include: {
          items: true,
          restoredItems: true,
        },
        orderBy: { date: "desc" },
      });

      return NextResponse.json(flights);
    }

    if (reportType === "inventory") {

      const type =
        searchParams.get("type") || "grocery";

      // =====================================================
      // GROCERY / WAREHOUSE INVENTORY
      // =====================================================

      if (type === "grocery") {

        const warehouse =
          await prisma.inventoryLocation.findFirst({
            where: {
              type: "WAREHOUSE",
            },
          });

        const items =
          await prisma.catalogItem.findMany({
            where: {
              type: "grocery",
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          });

        const transactions =
          await prisma.inventoryTransaction.findMany({
            where: {
              ...(Object.keys(dateFilter).length > 0
                ? {
                  createdAt: dateFilter,
                }
                : {}),
            },
          });

        const flightIds = [
          ...new Set(
            transactions
              .map((tx) => tx.flightId)
              .filter(Boolean)
          ),
        ];

        const flights =
          await prisma.flightOrder.findMany({
            where: {
              id: {
                in: flightIds as string[],
              },
            },

            select: {
              id: true,
              flightNumber: true,
              departure: true,
              arrival: true,
              date: true,
            },
          });

        const flightsMap =
          Object.fromEntries(
            flights.map((f) => [f.id, f])
          );
        const restoredItems =
          await prisma.restoredItem.findMany({

            where: {
              ...(Object.keys(dateFilter).length > 0
                ? {
                  restoredAt: dateFilter,
                }
                : {}),
            },

            include: {

              flightOrder: {

                include: {

                  items: true,

                },

              },

            },

          });
        const balances =
          warehouse
            ? await prisma.inventoryBalance.findMany({
              where: {
                locationId: warehouse.id,
              },
            })
            : [];

        const grouped = items.map((item) => {

          // TOTAL LOADED
          const totalLoaded =
            transactions
              .filter(
                (tx) =>
                  tx.itemId === item.id &&
                  tx.type === "TRANSFER"
              )
              .reduce(
                (sum, tx) =>
                  sum + tx.baseUnits,
                0
              );

          // TOTAL RESTORED
          const relatedRestored = restoredItems.filter((ri) => {

            const relatedOrderItem =
              ri.flightOrder?.items?.find(
                (i) => i.id === ri.itemId
              );

            if (!relatedOrderItem) {
              return false;
            }

            return relatedOrderItem.itemId === item.id;
          });

          const totalRestored =
            relatedRestored.reduce(
              (sum, ri) =>
                sum + Number(ri.returnedQty || 0),
              0
            );

          // TOTAL CONSUMED
          const totalConsumed =
            totalLoaded - totalRestored;

          // FLIGHTS USED
          const flightsUsed =
            new Set(
              transactions.filter(
                (tx) =>
                  tx.itemId === item.id &&
                  tx.flightId &&
                  tx.type === "TRANSFER"
              )
                .map(
                  (tx) => tx.flightId
                )
            ).size;

          // CURRENT WAREHOUSE STOCK
          const stock =
            balances.find(
              (b) =>
                b.itemId === item.id
            )?.onHandBaseUnits || 0;
          const flightMap: Record<string, any> = {};

          transactions
            .filter(
              (tx) =>
                tx.itemId === item.id &&
                tx.flightId
            )
            .forEach((tx) => {

              if (!flightMap[tx.flightId!]) {
                flightMap[tx.flightId!] = {
                  flightId: tx.flightId,

                  flightNumber:
                    flightsMap[tx.flightId!]
                      ?.flightNumber || "N/A",

                  route:
                    flightsMap[tx.flightId!]
                      ? `${flightsMap[tx.flightId!].departure} → ${flightsMap[tx.flightId!].arrival}`
                      : "N/A",

                  date:
                    flightsMap[tx.flightId!]
                      ?.date || null,
                  onboarded: 0,
                  restored: 0,
                  consumed: 0,
                };
              }

              if (tx.type === "TRANSFER") {
                flightMap[tx.flightId!].onboarded += tx.baseUnits;
              }
            });

          relatedRestored.forEach((ri) => {

            if (!flightMap[ri.flightOrderId]) {

              flightMap[ri.flightOrderId] = {

                flightId: ri.flightOrderId,

                flightNumber:
                  ri.flightOrder?.flightNumber || "N/A",

                route:
                  ri.flightOrder
                    ? `${ri.flightOrder.departure} → ${ri.flightOrder.arrival}`
                    : "N/A",

                date:
                  ri.flightOrder?.date || null,

                onboarded: 0,

                restored: 0,

                consumed: 0,
              };
            }
            flightMap[ri.flightOrderId].restored +=
              Number(ri.returnedQty || 0);
          });

          Object.values(flightMap).forEach((f: any) => {
            f.consumed =
              Math.max(f.onboarded - f.restored, 0);
          });

          return {
            name: item.name,

            totalLoaded,

            totalRestored,

            totalConsumed,

            flightsUsed,

            currentWarehouseStock: stock,

            flights: Object.values(flightMap),
          };
        });

        return NextResponse.json(grouped);
      }

      // =====================================================
      // FOOD INVENTORY
      // =====================================================

      if (type === "food") {

        const items =
          await prisma.orderItem.findMany({
            where: {
              type: "food",

              itemId: {
                not: null,
              },

              name: {
                contains: search,
                mode: "insensitive",
              },

              order: {
                status: {
                  in: [
                    "Completed",
                    "Delivered",
                  ],
                },

                ...(Object.keys(dateFilter).length > 0
                  ? {
                    date: dateFilter,
                  }
                  : {}),
              },
            },

            include: {
              order: true,
            },
          });

        const grouped =
          items.reduce((acc, item) => {

            if (!acc[item.name]) {

              acc[item.name] = {
                name: item.name,

                totalLoaded: 0,

                totalConsumed: 0,

                flightIds: new Set(),
              };
            }

            acc[item.name].totalLoaded +=
              item.quantity;

            acc[item.name].totalConsumed +=
              item.quantity;

            acc[item.name].flightIds.add(
              item.orderId
            );

            return acc;

          }, {} as Record<string, any>);

        const result =
          Object.values(grouped).map(
            (g: any) => ({
              name: g.name,

              totalLoaded:
                g.totalLoaded,

              totalConsumed:
                g.totalConsumed,

              flightsUsed:
                g.flightIds.size,
            })
          );

        return NextResponse.json(result);
      }
    }

    if (reportType === "vendors") {
      const items = await prisma.orderItem.findMany({
        where: {
          type: "food",

          vendorName: {
            not: null,
            contains: search,
            mode: "insensitive",
          },

          order: {
            status: {
              in: ["Completed", "Delivered"],
            },

            ...(Object.keys(dateFilter).length > 0
              ? { date: dateFilter }
              : {}),
          },
        },

        include: {
          order: true,
        },
      });

      // Group by vendorName
      const grouped = items.reduce((acc, item) => {
        const vendor = item.vendorName || "Unknown Vendor";
        if (!acc[vendor]) {
          acc[vendor] = {
            vendorName: vendor,
            totalItemsDelivered: 0,
            totalFlights: new Set(),
            flights: {}
          };
        }

        acc[vendor].totalItemsDelivered += item.quantity;
        acc[vendor].totalFlights.add(item.orderId);

        if (!acc[vendor].flights[item.orderId]) {
          acc[vendor].flights[item.orderId] = {
            order: item.order,
            items: []
          };
        }

        acc[vendor].flights[item.orderId].items.push({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        });

        return acc;
      }, {} as Record<string, any>);

      const result = Object.values(grouped).map((g: any) => ({
        vendorName: g.vendorName,
        totalQty: g.totalItemsDelivered,
        flightsCount: g.totalFlights.size,
        flights: Object.values(g.flights).map((f: any) => ({
          flightId: f.order.id,
          flightNumber: f.order.flightNumber,
          date: f.order.date,
          route: `${f.order.departure} → ${f.order.arrival}`,
          items: f.items,
          totalAmount: f.items.reduce((sum: number, i: any) => sum + ((i.price || 0) * (i.quantity || 0)), 0)
        })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));

      result.sort((a, b) => a.vendorName.localeCompare(b.vendorName));

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
