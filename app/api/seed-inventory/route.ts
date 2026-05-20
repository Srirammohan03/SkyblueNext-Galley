// app/api/seed-inventory/route.ts
// ONE-TIME USE: Call GET /api/seed-inventory?secret=skyblue-seed-2026 to populate inventory data
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const SEED_SECRET = "skyblue-seed-2026";
const TAIL = "N123AB";

const GROCERY_ITEMS = [
  { name: "Sparkling Water", category: "Beverages", baseUnit: "can", packEnabled: true, packSize: 24, packLabel: "24-can case", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Still Water 500ml", category: "Beverages", baseUnit: "bottle", packEnabled: true, packSize: 24, packLabel: "24-pack", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Orange Juice", category: "Beverages", baseUnit: "bottle", packEnabled: true, packSize: 12, packLabel: "12-pack", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Coca-Cola", category: "Beverages", baseUnit: "can", packEnabled: true, packSize: 24, packLabel: "24-can case", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Red Bull", category: "Beverages", baseUnit: "can", packEnabled: true, packSize: 24, packLabel: "24-can case", reorderThresholdType: "PACK", reorderThresholdValue: 3 },
  { name: "Prosecco 200ml", category: "Alcohol", baseUnit: "bottle", packEnabled: true, packSize: 12, packLabel: "12-pack", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "White Wine (Sauvignon Blanc)", category: "Alcohol", baseUnit: "bottle", packEnabled: true, packSize: 6, packLabel: "6-pack", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Red Wine (Merlot)", category: "Alcohol", baseUnit: "bottle", packEnabled: true, packSize: 6, packLabel: "6-pack", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Beer (Heineken)", category: "Alcohol", baseUnit: "can", packEnabled: true, packSize: 24, packLabel: "24-can case", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Croissants", category: "Bakery", baseUnit: "piece", packEnabled: true, packSize: 12, packLabel: "dozen", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Mixed Nuts (30g)", category: "Snacks", baseUnit: "pack", packEnabled: true, packSize: 24, packLabel: "24-pack box", reorderThresholdType: "PACK", reorderThresholdValue: 5 },
  { name: "Butter Portions", category: "Dairy", baseUnit: "piece", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 20 },
  { name: "Cheese Slices", category: "Dairy", baseUnit: "slice", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 30 },
  { name: "Yogurt Cup", category: "Dairy", baseUnit: "cup", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 10 },
  { name: "Milk (200ml carton)", category: "Dairy", baseUnit: "carton", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 15 },
  { name: "Dark Chocolate Bar", category: "Snacks", baseUnit: "bar", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 10 },
  { name: "Pretzels Bag (35g)", category: "Snacks", baseUnit: "bag", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 10 },
  { name: "Potato Chips (45g)", category: "Snacks", baseUnit: "bag", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 10 },
  { name: "Muesli Bar", category: "Snacks", baseUnit: "bar", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 10 },
  { name: "Baguette", category: "Bakery", baseUnit: "piece", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 5 },
  { name: "Muffin", category: "Bakery", baseUnit: "piece", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 8 },
  { name: "Bread Rolls", category: "Bakery", baseUnit: "piece", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 10 },
  { name: "Herbal Tea Bags", category: "Beverages", baseUnit: "sachet", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 20 },
  { name: "Coffee Pods", category: "Beverages", baseUnit: "pod", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 20 },
  { name: "Champagne Flutes (plastic)", category: "Supplies", baseUnit: "piece", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 20 },
  { name: "Cocktail Napkins", category: "Supplies", baseUnit: "piece", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 50 },
  { name: "Sugar Sachets", category: "Supplies", baseUnit: "sachet", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 30 },
  { name: "Stirring Sticks", category: "Supplies", baseUnit: "piece", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 50 },
  { name: "Lemon Slices", category: "Supplies", baseUnit: "slice", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 20 },
  { name: "Whiskey (50ml miniature)", category: "Alcohol", baseUnit: "bottle", packEnabled: false, packSize: null, packLabel: null, reorderThresholdType: "UNIT", reorderThresholdValue: 10 },
] as const;

const WAREHOUSE_BALANCES: Record<string, number> = {
  "Sparkling Water": 96,       // 4×24 = LOW (threshold 5 packs=120)
  "Orange Juice": 36,           // 3×12 = LOW (threshold 5 packs=60)
  "Beer (Heineken)": 72,        // 3×24 = LOW (threshold 5 packs=120)
  "Still Water 500ml": 240,
  "Coca-Cola": 288,
  "Red Bull": 96,
  "Prosecco 200ml": 72,
  "White Wine (Sauvignon Blanc)": 48,
  "Red Wine (Merlot)": 36,
  "Croissants": 84,
  "Mixed Nuts (30g)": 144,
  "Butter Portions": 40,
  "Cheese Slices": 60,
  "Yogurt Cup": 25,
  "Milk (200ml carton)": 30,
  "Dark Chocolate Bar": 20,
  "Pretzels Bag (35g)": 30,
  "Potato Chips (45g)": 25,
  "Muesli Bar": 20,
  "Coffee Pods": 50,
  "Herbal Tea Bags": 60,
  "Cocktail Napkins": 200,
  "Sugar Sachets": 100,
  "Stirring Sticks": 150,
  "Champagne Flutes (plastic)": 48,
  "Whiskey (50ml miniature)": 24,
};

const ONBOARD_BALANCES: Record<string, number> = {
  "Sparkling Water": 14,
  "Still Water 500ml": 24,
  "Coca-Cola": 12,
  "Prosecco 200ml": 6,
  "White Wine (Sauvignon Blanc)": 3,
  "Croissants": 8,
  "Mixed Nuts (30g)": 10,
  "Coffee Pods": 15,
};

const ELIGIBLE_NAMES = new Set([
  "Sparkling Water", "Still Water 500ml", "Orange Juice", "Coca-Cola",
  "Red Bull", "Prosecco 200ml", "White Wine (Sauvignon Blanc)", "Red Wine (Merlot)",
  "Beer (Heineken)", "Croissants", "Mixed Nuts (30g)", "Butter Portions",
  "Cheese Slices", "Yogurt Cup", "Dark Chocolate Bar", "Pretzels Bag (35g)",
  "Coffee Pods", "Herbal Tea Bags", "Muesli Bar", "Whiskey (50ml miniature)",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden — wrong secret" }, { status: 403 });
  }

  const log: string[] = [];

  try {
    // 1. Catalog items
    const catalogMap: Record<string, string> = {};
    for (const g of GROCERY_ITEMS) {
      const existing = await prisma.catalogItem.findFirst({
        where: { name: g.name, type: "grocery" },
      });
      const item = existing
        ? await prisma.catalogItem.update({
            where: { id: existing.id },
            data: {
              baseUnit: g.baseUnit,
              packEnabled: g.packEnabled,
              packSize: g.packSize ?? null,
              packLabel: g.packLabel ?? null,
              reorderThresholdType: g.reorderThresholdType,
              reorderThresholdValue: g.reorderThresholdValue,
            },
          })
        : await prisma.catalogItem.create({
            data: {
              name: g.name,
              type: "grocery",
              category: g.category,
              unit: g.baseUnit,
              baseUnit: g.baseUnit,
              packEnabled: g.packEnabled,
              packSize: g.packSize ?? null,
              packLabel: g.packLabel ?? null,
              reorderThresholdType: g.reorderThresholdType,
              reorderThresholdValue: g.reorderThresholdValue,
              dietaryTags: [],
              allergens: [],
              isAvailable: true,
            },
          });
      catalogMap[g.name] = item.id;
    }
    log.push(`✓ ${Object.keys(catalogMap).length} catalog items`);

    // 2. Aircraft
    let aircraft = await prisma.aircraft.findFirst({ where: { tailNumber: TAIL } });
    if (!aircraft) {
      aircraft = await prisma.aircraft.create({
        data: { tailNumber: TAIL, label: "Gulfstream G650" },
      });
    }
    log.push(`✓ Aircraft ${TAIL}`);

    // 3. Locations
    let warehouseLoc = await prisma.inventoryLocation.findFirst({ where: { type: "WAREHOUSE" } });
    if (!warehouseLoc) {
      warehouseLoc = await prisma.inventoryLocation.create({
        data: { type: "WAREHOUSE", name: "Main Warehouse" },
      });
    }
    let onboardLoc = await prisma.inventoryLocation.findFirst({
      where: { type: "ONBOARD", aircraftId: aircraft.id },
    });
    if (!onboardLoc) {
      onboardLoc = await prisma.inventoryLocation.create({
        data: { type: "ONBOARD", name: `Onboard ${TAIL}`, aircraftId: aircraft.id },
      });
    }
    log.push(`✓ Locations: warehouse=${warehouseLoc.id}, onboard=${onboardLoc.id}`);

    // 4. Warehouse balances
    for (const [name, qty] of Object.entries(WAREHOUSE_BALANCES)) {
      const itemId = catalogMap[name];
      if (!itemId) continue;
      const balId = `${warehouseLoc.id}_${itemId}`;
      await prisma.inventoryBalance.upsert({
        where: { id: balId },
        update: { onHandBaseUnits: qty },
        create: { id: balId, locationId: warehouseLoc.id, itemId, onHandBaseUnits: qty },
      });
    }
    log.push(`✓ ${Object.keys(WAREHOUSE_BALANCES).length} warehouse balances`);

    // 5. Onboard balances
    for (const [name, qty] of Object.entries(ONBOARD_BALANCES)) {
      const itemId = catalogMap[name];
      if (!itemId) continue;
      const balId = `${onboardLoc.id}_${itemId}`;
      await prisma.inventoryBalance.upsert({
        where: { id: balId },
        update: { onHandBaseUnits: qty },
        create: { id: balId, locationId: onboardLoc.id, itemId, onHandBaseUnits: qty },
      });
    }
    log.push(`✓ ${Object.keys(ONBOARD_BALANCES).length} onboard balances`);

    // 6. Eligibility
    for (const [name, itemId] of Object.entries(catalogMap)) {
      await prisma.onboardEligibility.upsert({
        where: { locationId_itemId: { locationId: onboardLoc.id, itemId } },
        update: { eligible: ELIGIBLE_NAMES.has(name) },
        create: { locationId: onboardLoc.id, itemId, eligible: ELIGIBLE_NAMES.has(name) },
      });
    }
    log.push(`✓ ${ELIGIBLE_NAMES.size} eligible items set`);

    // 7. Low-stock alerts
    const lowStockItems = [
      { name: "Sparkling Water", currentBaseUnits: 96, thresholdType: "PACK", thresholdValue: 5 },
      { name: "Orange Juice", currentBaseUnits: 36, thresholdType: "PACK", thresholdValue: 5 },
      { name: "Beer (Heineken)", currentBaseUnits: 72, thresholdType: "PACK", thresholdValue: 5 },
    ];
    for (const li of lowStockItems) {
      const itemId = catalogMap[li.name];
      if (!itemId) continue;
      const existing = await prisma.inventoryAlert.findFirst({
        where: { itemId, locationId: warehouseLoc.id, acknowledgedAt: null },
      });
      if (!existing) {
        await prisma.inventoryAlert.create({
          data: {
            itemId,
            locationId: warehouseLoc.id,
            severity: "LOW_STOCK",
            thresholdType: li.thresholdType,
            thresholdValue: li.thresholdValue,
            currentBaseUnits: li.currentBaseUnits,
          },
        });
      }
    }
    log.push(`✓ 3 low-stock alerts created`);

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    console.error("SEED ERROR:", err);
    return NextResponse.json({ error: err.message, log }, { status: 500 });
  }
}
