// app/api/reports/inventory/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  displayWarehouseStock,
  displayOnboardStock,
} from "@/lib/inventory/conversion";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reportType = searchParams.get("reportType") ?? "stock";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const aircraft = searchParams.get("aircraft"); // tail number
  const category = searchParams.get("category");
  const itemId = searchParams.get("itemId");
  const txType = searchParams.get("txType");
  const year = searchParams.get("year");

  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : undefined;

  // ── 1. STOCK ON HAND ──────────────────────────────────────────────────────
  if (reportType === "stock") {
    const warehouseLoc = await prisma.inventoryLocation.findFirst({
      where: { type: "WAREHOUSE", isActive: true },
    });

    const whereItem: any = { type: "grocery" };
    if (category) whereItem.category = category;
    if (itemId) whereItem.id = itemId;

    const items = await prisma.catalogItem.findMany({ where: whereItem });

    const warehouseBalances = warehouseLoc
      ? await prisma.inventoryBalance.findMany({
          where: { locationId: warehouseLoc.id },
        })
      : [];
    const wbMap = Object.fromEntries(
      warehouseBalances.map((b) => [b.itemId, b.onHandBaseUnits]),
    );

    const onboardLocs = await prisma.inventoryLocation.findMany({
      where: {
        type: "ONBOARD",
        isActive: true,
        ...(aircraft
          ? { aircraft: { tailNumber: aircraft } }
          : {}),
      },
      include: { aircraft: true },
    });
    const onboardBalanceRows = onboardLocs.length
      ? await prisma.inventoryBalance.findMany({
          where: { locationId: { in: onboardLocs.map((l) => l.id) } },
        })
      : [];

    const rows = items.map((item) => {
      const wQty = wbMap[item.id] ?? 0;
      const wDisplay = displayWarehouseStock(wQty, item as any);
      const onboardMap: Record<string, string> = {};
      for (const loc of onboardLocs) {
        const oQty =
          onboardBalanceRows.find(
            (b) => b.locationId === loc.id && b.itemId === item.id,
          )?.onHandBaseUnits ?? 0;
        onboardMap[loc.aircraft?.tailNumber ?? loc.id] =
          displayOnboardStock(oQty, item as any);
      }
      return {
        itemId: item.id,
        name: item.name,
        category: item.category,
        baseUnit: item.baseUnit,
        warehouseBaseUnits: wQty,
        warehouseDisplay: wDisplay,
        onboard: onboardMap,
      };
    });

    return NextResponse.json({ reportType: "stock", rows });
  }

  // ── shared date filter ─────────────────────────────────────────────────────
  const dateFilter: any = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;

  const txWhere: any = {};
  if (fromDate || toDate) txWhere.createdAt = dateFilter;
  if (itemId) txWhere.itemId = itemId;

  // ── 2. RECEIVED ────────────────────────────────────────────────────────────
  if (reportType === "received") {
    txWhere.type = "RECEIVE";
    const txs = await prisma.inventoryTransaction.findMany({
      where: txWhere,
      include: {
        item: { select: { id: true, name: true, category: true, baseUnit: true, packEnabled: true, packSize: true } },
        toLocation: { select: { id: true, name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (category) {
      return NextResponse.json({
        reportType: "received",
        rows: txs.filter((t) => t.item.category === category),
      });
    }
    return NextResponse.json({ reportType: "received", rows: txs });
  }

  // ── 3. ONBOARDED (TRANSFER) ───────────────────────────────────────────────
  if (reportType === "onboarded") {
    txWhere.type = "TRANSFER";
    if (aircraft) {
      const loc = await prisma.inventoryLocation.findFirst({
        where: { type: "ONBOARD", aircraft: { tailNumber: aircraft } },
      });
      if (loc) txWhere.toLocationId = loc.id;
    }
    const txs = await prisma.inventoryTransaction.findMany({
      where: txWhere,
      include: {
        item: { select: { id: true, name: true, category: true, baseUnit: true } },
        toLocation: {
          select: {
            id: true,
            name: true,
            aircraft: { select: { tailNumber: true } },
          },
        },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const filtered = category
      ? txs.filter((t) => t.item.category === category)
      : txs;
    return NextResponse.json({ reportType: "onboarded", rows: filtered });
  }

  // ── 4. CONSUMED ────────────────────────────────────────────────────────────
  if (reportType === "consumed") {
    txWhere.type = "CONSUME";
    if (aircraft) {
      const loc = await prisma.inventoryLocation.findFirst({
        where: { type: "ONBOARD", aircraft: { tailNumber: aircraft } },
      });
      if (loc) txWhere.fromLocationId = loc.id;
    }
    const txs = await prisma.inventoryTransaction.findMany({
      where: txWhere,
      include: {
        item: { select: { id: true, name: true, category: true, baseUnit: true } },
        fromLocation: {
          select: {
            id: true,
            name: true,
            aircraft: { select: { tailNumber: true } },
          },
        },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const filtered = category
      ? txs.filter((t) => t.item.category === category)
      : txs;
    return NextResponse.json({ reportType: "consumed", rows: filtered });
  }

  // ── 5. ANNUAL SUMMARY ──────────────────────────────────────────────────────
  if (reportType === "annual") {
    const y = Number(year ?? new Date().getFullYear());
    const start = new Date(`${y}-01-01T00:00:00Z`);
    const end = new Date(`${y}-12-31T23:59:59Z`);

    const txs = await prisma.inventoryTransaction.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        type: { in: ["RECEIVE", "TRANSFER", "CONSUME"] },
      },
      include: {
        item: { select: { id: true, name: true, category: true, baseUnit: true } },
      },
    });

    // Aggregate per month + category
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const summary = months.map((m) => {
      const monthTxs = txs.filter(
        (t) => new Date(t.createdAt).getMonth() + 1 === m,
      );
      const received = monthTxs
        .filter((t) => t.type === "RECEIVE")
        .reduce((s, t) => s + t.baseUnits, 0);
      const onboarded = monthTxs
        .filter((t) => t.type === "TRANSFER")
        .reduce((s, t) => s + t.baseUnits, 0);
      const consumed = monthTxs
        .filter((t) => t.type === "CONSUME")
        .reduce((s, t) => s + t.baseUnits, 0);
      return { month: m, received, onboarded, consumed };
    });

    return NextResponse.json({ reportType: "annual", year: y, summary });
  }

  return NextResponse.json({ error: "Unknown reportType" }, { status: 400 });
}
