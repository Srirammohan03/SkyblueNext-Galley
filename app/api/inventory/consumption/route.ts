// app/api/inventory/consumption/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** GET ?flightId=xxx  — return existing consumption record for a flight */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const flightId = searchParams.get("flightId");
  if (!flightId)
    return NextResponse.json({ error: "flightId required" }, { status: 400 });

  const record = await prisma.flightConsumption.findFirst({
    where: { flightId },
    include: {
      location: { select: { id: true, name: true, aircraft: { select: { tailNumber: true } } } },
    },
  });

  return NextResponse.json(record ?? null);
}

/**
 * POST — save flight consumption and create CONSUME transactions atomically.
 * Body: { flightId, locationId, items: [{itemId, baseUnitsConsumed}] }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const { flightId, locationId, items } = body;

  if (!flightId || !locationId || !Array.isArray(items)) {
    return NextResponse.json(
      { error: "flightId, locationId and items[] required" },
      { status: 400 },
    );
  }

  const filtered = items.filter(
    (i: any) => i.itemId && Number(i.baseUnitsConsumed) > 0,
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      for (const entry of filtered) {
        const qty = Math.round(Number(entry.baseUnitsConsumed));
        const balId = `${locationId}_${entry.itemId}`;
        const bal = await tx.inventoryBalance.findUnique({ where: { id: balId } });
        const current = bal?.onHandBaseUnits ?? 0;
        const deduct = Math.min(qty, current); // never go negative

        if (deduct > 0) {
          await tx.inventoryBalance.upsert({
            where: { id: balId },
            update: { onHandBaseUnits: { decrement: deduct } },
            create: { id: balId, locationId, itemId: entry.itemId, onHandBaseUnits: 0 },
          });

          await tx.inventoryTransaction.create({
            data: {
              createdBy: userId,
              type: "CONSUME",
              itemId: entry.itemId,
              fromLocationId: locationId,
              baseUnits: deduct,
              flightId,
              note: "Flight completion consumption",
            },
          });
        }
      }

      // Upsert FlightConsumption summary
      const existing = await tx.flightConsumption.findFirst({
        where: { flightId },
      });
      if (existing) {
        return tx.flightConsumption.update({
          where: { id: existing.id },
          data: {
            recordedBy: userId,
            recordedAt: new Date(),
            items: filtered,
          },
        });
      }
      return tx.flightConsumption.create({
        data: {
          flightId,
          locationId,
          recordedBy: userId,
          items: filtered,
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("CONSUMPTION ERROR:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to save consumption" },
      { status: 500 },
    );
  }
}
