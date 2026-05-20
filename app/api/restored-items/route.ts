// app/api/restored-items/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tailNumber = searchParams.get("tailNumber");
    const flightOrderId = searchParams.get("flightOrderId");
    const itemId = searchParams.get("itemId");

    if (tailNumber) {
      const restoredItems = await prisma.restoredItem.findMany({
        where: {
          flightOrder: {
            tailNumber: tailNumber.trim().toUpperCase(),
            status: "Completed",
          },
          returnedQty: { gt: 0 },
        },
        include: {
          flightOrder: {
            include: {
              items: true,
            }
          }
        }
      });

      if (!restoredItems.length) {
        return NextResponse.json([]);
      }

      // Aggregate by catalogItemId
      const aggregated = new Map<string, any>();

      for (const ri of restoredItems) {
        const orderItem = ri.flightOrder.items.find(i => i.id === ri.itemId);
        if (!orderItem) continue;

        const catId = orderItem.itemId;
        if (!catId) continue;

        if (aggregated.has(catId)) {
          aggregated.get(catId).returnedQty += ri.returnedQty;
        } else {
          aggregated.set(catId, {
            id: ri.id, // Just use the first one's ID for tracking
            name: orderItem.name || "Unknown Item",
            returnedQty: ri.returnedQty,
            catalogItemId: catId,
            price: orderItem.price || 0,
            category: orderItem.category || "",
            type: orderItem.type || "custom",
            unit: orderItem.unit || "",
            vendorId: orderItem.vendorId || null,
            vendorName: orderItem.vendorName || null,
            isRestored: true,
          });
        }
      }

      return NextResponse.json(Array.from(aggregated.values()));
    }

    const restoredItems = await prisma.restoredItem.findMany({
      where: {
        ...(flightOrderId && {
          flightOrderId,
        }),
        ...(itemId && {
          itemId,
        }),
      },
      include: {
        flightOrder: {
          select: {
            id: true,
            flightNumber: true,
            departure: true,
            arrival: true,
            date: true,
            status: true,
          },
        },
      },
      orderBy: {
        restoredAt: "desc",
      },
    });

    return NextResponse.json(restoredItems);
  } catch (error) {
    console.error("GET RESTORED ITEMS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch restored items" },
      { status: 500 }
    );
  }
}
