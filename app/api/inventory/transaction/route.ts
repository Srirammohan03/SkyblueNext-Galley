// app/api/inventory/transaction/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  canReceive,
  canTransfer,
  canConsume,
  canAdjust,
} from "@/lib/inventory/permissions";
import { isLowStock } from "@/lib/inventory/threshold";

// ── helpers ────────────────────────────────────────────────────────────────────

type PrismaTx = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

async function upsertBalance(
  tx: PrismaTx,
  locationId: string,
  itemId: string,
  delta: number,
): Promise<number> {
  const id = `${locationId}_${itemId}`;
  const existing = await tx.inventoryBalance.findUnique({ where: { id } });
  const newQty = (existing?.onHandBaseUnits ?? 0) + delta;
  await tx.inventoryBalance.upsert({
    where: { id },
    update: { onHandBaseUnits: newQty },
    create: { id, locationId, itemId, onHandBaseUnits: Math.max(0, newQty) },
  });
  return Math.max(0, newQty);
}

async function refreshAlerts(
  tx: PrismaTx,
  itemId: string,
  locationId: string,
  onHandBaseUnits: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
) {
  if (item.type !== "grocery") return;
  const low = isLowStock(onHandBaseUnits, item);
  const existing = await tx.inventoryAlert.findFirst({
    where: { itemId, locationId, acknowledgedAt: null },
  });
  if (low && !existing) {
    await tx.inventoryAlert.create({
      data: {
        itemId,
        locationId,
        severity: "LOW_STOCK",
        thresholdType: item.reorderThresholdType,
        thresholdValue: item.reorderThresholdValue,
        currentBaseUnits: onHandBaseUnits,
      },
    });
  } else if (!low && existing) {
    await tx.inventoryAlert.update({
      where: { id: existing.id },
      data: { acknowledgedAt: new Date(), acknowledgedBy: "SYSTEM_AUTO" },
    });
  } else if (low && existing) {
    await tx.inventoryAlert.update({
      where: { id: existing.id },
      data: { currentBaseUnits: onHandBaseUnits },
    });
  }
}

// ── POST /api/inventory/transaction ───────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    type,
    itemId,
    fromLocationId,
    toLocationId,
    packs,
    extraUnits,
    baseUnits,
    flightId,
    reason,
    note,
  } = body;

  if (!type || !itemId) {
    return NextResponse.json(
      { error: "type and itemId are required" },
      { status: 400 },
    );
  }

  // RBAC
  const rbacMap: Record<string, () => boolean> = {
    RECEIVE: () => canReceive(role),
    TRANSFER: () => canTransfer(role),
    CONSUME: () => canConsume(role),
    ADJUST: () => canAdjust(role),
  };
  if (!rbacMap[type]?.()) {
    return NextResponse.json(
      { error: `Insufficient permissions for ${type}` },
      { status: 403 },
    );
  }
  if (type === "ADJUST" && !reason?.trim()) {
    return NextResponse.json(
      { error: "Reason is required for ADJUST" },
      { status: 400 },
    );
  }

  // Load item
  const item = await prisma.catalogItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Calculate base units from input
  let finalBaseUnits = 0;
  let txPacks: number | null = null;
  let packSizeAtTime: number | null = null;

  if (type === "RECEIVE") {
    if (!toLocationId) {
      return NextResponse.json(
        { error: "toLocationId required for RECEIVE" },
        { status: 400 },
      );
    }
    if (item.packEnabled && item.packSize) {
      const p = Math.max(0, Math.round(Number(packs) || 0));
      const extra = Math.max(0, Math.round(Number(extraUnits) || 0));
      finalBaseUnits = p * item.packSize + extra;
      txPacks = p;
      packSizeAtTime = item.packSize;
    } else {
      finalBaseUnits = Math.round(Number(baseUnits) || 0);
    }
    if (finalBaseUnits <= 0) {
      return NextResponse.json(
        { error: "Must receive at least 1 unit" },
        { status: 400 },
      );
    }
  } else if (type === "TRANSFER") {
    if (!fromLocationId || !toLocationId) {
      return NextResponse.json(
        { error: "fromLocationId and toLocationId required for TRANSFER" },
        { status: 400 },
      );
    }
    finalBaseUnits = Math.round(Number(baseUnits) || 0);
    if (finalBaseUnits <= 0) {
      return NextResponse.json(
        { error: "Must transfer at least 1 unit" },
        { status: 400 },
      );
    }
  } else if (type === "CONSUME") {
    if (!fromLocationId) {
      return NextResponse.json(
        { error: "fromLocationId required for CONSUME" },
        { status: 400 },
      );
    }
    finalBaseUnits = Math.round(Number(baseUnits) || 0);
    if (finalBaseUnits <= 0) {
      return NextResponse.json(
        { error: "Must consume at least 1 unit" },
        { status: 400 },
      );
    }
  } else if (type === "ADJUST") {
    // Signed: positive = add, negative = remove
    finalBaseUnits = Math.round(Number(baseUnits) || 0);
    if (finalBaseUnits === 0) {
      return NextResponse.json(
        { error: "Adjust quantity cannot be 0" },
        { status: 400 },
      );
    }
  }

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      if (type === "RECEIVE") {
        const newQty = await upsertBalance(
          tx,
          toLocationId,
          itemId,
          finalBaseUnits,
        );
        const warehouseLoc = await tx.inventoryLocation.findFirst({
          where: { type: "WAREHOUSE" },
        });
        if (warehouseLoc?.id === toLocationId) {
          await refreshAlerts(tx, itemId, toLocationId, newQty, item);
        }
      }

      if (type === "TRANSFER") {
        const fromBalId = `${fromLocationId}_${itemId}`;
        const fromBal = await tx.inventoryBalance.findUnique({
          where: { id: fromBalId },
        });
        if (!fromBal || fromBal.onHandBaseUnits < finalBaseUnits) {
          if (!canAdjust(role)) {
            throw new Error(
              `Insufficient stock: have ${fromBal?.onHandBaseUnits ?? 0}, need ${finalBaseUnits}`,
            );
          }
        }
        // Check eligibility
        const elig = await tx.onboardEligibility.findUnique({
          where: {
            locationId_itemId: { locationId: toLocationId, itemId },
          },
        });
        if (!elig?.eligible && !canAdjust(role)) {
          throw new Error("Item is not eligible for this onboard location");
        }

        const newFromQty = await upsertBalance(
          tx,
          fromLocationId,
          itemId,
          -finalBaseUnits,
        );
        await upsertBalance(tx, toLocationId, itemId, finalBaseUnits);
        await refreshAlerts(tx, itemId, fromLocationId, newFromQty, item);
      }

      if (type === "CONSUME") {
        const fromBalId = `${fromLocationId}_${itemId}`;
        const fromBal = await tx.inventoryBalance.findUnique({
          where: { id: fromBalId },
        });
        if (!fromBal || fromBal.onHandBaseUnits < finalBaseUnits) {
          throw new Error(
            `Insufficient onboard stock: have ${fromBal?.onHandBaseUnits ?? 0}, need ${finalBaseUnits}`,
          );
        }
        await upsertBalance(tx, fromLocationId, itemId, -finalBaseUnits);
      }

      if (type === "ADJUST") {
        const locId = fromLocationId || toLocationId;
        if (!locId) throw new Error("locationId required for ADJUST");
        const newQty = await upsertBalance(tx, locId, itemId, finalBaseUnits);
        // Ensure balance never goes negative
        if (newQty < 0) {
          await tx.inventoryBalance.update({
            where: { id: `${locId}_${itemId}` },
            data: { onHandBaseUnits: 0 },
          });
        }
        await refreshAlerts(tx, itemId, locId, Math.max(0, newQty), item);
      }

      return tx.inventoryTransaction.create({
        data: {
          createdBy: userId,
          type,
          itemId,
          fromLocationId: fromLocationId ?? null,
          toLocationId: toLocationId ?? null,
          baseUnits: Math.abs(finalBaseUnits),
          packs: txPacks,
          packSizeAtTime,
          flightId: flightId ?? null,
          reason: reason ?? null,
          note: note ?? null,
        },
      });
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (err: any) {
    console.error("INVENTORY TRANSACTION ERROR:", err);
    return NextResponse.json(
      { error: err.message ?? "Transaction failed" },
      { status: 500 },
    );
  }
}

// ── GET /api/inventory/transaction ───────────────────────────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  const locationId = searchParams.get("locationId");
  const flightId = searchParams.get("flightId");
  const type = searchParams.get("type");
  const take = Math.min(Number(searchParams.get("take") ?? 50), 200);

  const where: any = {};
  if (itemId) where.itemId = itemId;
  if (flightId) where.flightId = flightId;
  if (type) where.type = type;
  if (locationId) {
    where.OR = [
      { fromLocationId: locationId },
      { toLocationId: locationId },
    ];
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      item: { select: { id: true, name: true, baseUnit: true, packEnabled: true, packSize: true } },
      fromLocation: { select: { id: true, name: true, type: true } },
      toLocation: { select: { id: true, name: true, type: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json(transactions);
}
