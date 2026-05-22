// app/api/inventory/alerts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";



export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // GET LIVE INVENTORY BALANCES
  const balances = await prisma.inventoryBalance.findMany({
    include: {
      item: {
        select: {
          id: true,
          name: true,
          category: true,
          baseUnit: true,
          packEnabled: true,
          packSize: true,
          packLabel: true,
          reorderThresholdType: true,
          reorderThresholdValue: true,
          type: true,
        },
      },

      location: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },

    orderBy: {
      onHandBaseUnits: "asc",
    },
  });

  // GENERATE LOW STOCK ALERTS DYNAMICALLY
  const activeAlerts = balances.filter((balance) => {
    // only grocery
    if (balance.item.type !== "grocery") {
      return false;
    }

    // threshold
    const threshold = 10;

    return balance.onHandBaseUnits <= threshold;
  });

  return NextResponse.json(activeAlerts);
}

export async function PATCH() {
  return NextResponse.json({
    success: true,
  });
}
