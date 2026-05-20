// lib/inventory/queries.ts
import prisma from "@/lib/prisma";

/** Get the single WAREHOUSE location (create if missing) */
export async function getWarehouseLocation() {
  const loc = await prisma.inventoryLocation.findFirst({
    where: { type: "WAREHOUSE", isActive: true },
  });
  return loc;
}

/** Get ONBOARD location for a specific tail number */
export async function getOnboardLocationByTail(tailNumber: string) {
  const aircraft = await prisma.aircraft.findUnique({
    where: { tailNumber },
    include: { locations: { where: { type: "ONBOARD", isActive: true } } },
  });
  if (!aircraft) return null;
  return aircraft.locations[0] ?? null;
}

/** Get balance for a specific location+item combo */
export async function getBalance(locationId: string, itemId: string) {
  const id = `${locationId}_${itemId}`;
  return prisma.inventoryBalance.findUnique({ where: { id } });
}

/** Get all balances for a location (with item details) */
export async function getLocationBalances(locationId: string) {
  return prisma.inventoryBalance.findMany({
    where: { locationId },
    include: { item: true },
    orderBy: { item: { name: "asc" } },
  });
}

/** Get all active aircraft */
export async function getActiveAircraft() {
  return prisma.aircraft.findMany({
    where: { isActive: true },
    orderBy: { tailNumber: "asc" },
  });
}

/** Get all grocery catalog items */
export async function getGroceryCatalogItems() {
  return prisma.catalogItem.findMany({
    where: { type: "grocery" },
    orderBy: { name: "asc" },
  });
}

/** Get eligibility map for a location: itemId → boolean */
export async function getEligibilityMap(
  locationId: string,
): Promise<Record<string, boolean>> {
  const rows = await prisma.onboardEligibility.findMany({
    where: { locationId },
  });
  const map: Record<string, boolean> = {};
  for (const r of rows) {
    map[r.itemId] = r.eligible;
  }
  return map;
}

/** Get unacknowledged low-stock alerts with item + location */
export async function getLowStockAlerts() {
  return prisma.inventoryAlert.findMany({
    where: { acknowledgedAt: null },
    include: { item: true, location: true },
    orderBy: { currentBaseUnits: "asc" },
  });
}

/** Get recent transactions for an item (descending) */
export async function getItemTransactions(
  itemId: string,
  take = 20,
) {
  return prisma.inventoryTransaction.findMany({
    where: { itemId },
    include: {
      fromLocation: { select: { id: true, name: true, type: true } },
      toLocation: { select: { id: true, name: true, type: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}
