// app/api/inventory/balances/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const itemId = searchParams.get("itemId");

  const where: any = {};
  if (locationId) where.locationId = locationId;
  if (itemId) where.itemId = itemId;

  const balances = await prisma.inventoryBalance.findMany({
    where,
    include: {
      item: {
        select: {
          id: true,
          name: true,
          category: true,
          subcategory: true,
          baseUnit: true,
          packEnabled: true,
          packSize: true,
          packLabel: true,
          reorderThresholdType: true,
          reorderThresholdValue: true,
          isAvailable: true,
          type: true,
        },
      },
      location: {
        select: { id: true, name: true, type: true },
      },
    },
    orderBy: { item: { name: "asc" } },
  });

  return NextResponse.json(balances);
}
