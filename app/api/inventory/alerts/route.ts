// app/api/inventory/alerts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeAcknowledged = searchParams.get("includeAcknowledged") === "true";

  const where: any = {};
  if (!includeAcknowledged) where.acknowledgedAt = null;

  const alerts = await prisma.inventoryAlert.findMany({
    where,
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
        },
      },
      location: {
        select: { id: true, name: true, type: true },
      },
    },
    orderBy: { currentBaseUnits: "asc" },
  });

  return NextResponse.json(alerts);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const { alertId } = body;

  if (!alertId) {
    return NextResponse.json({ error: "alertId required" }, { status: 400 });
  }

  const updated = await prisma.inventoryAlert.update({
    where: { id: alertId },
    data: { acknowledgedAt: new Date(), acknowledgedBy: userId },
  });

  return NextResponse.json(updated);
}
