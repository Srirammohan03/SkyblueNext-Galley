// app/api/flights/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const flights = await prisma.flightOrder.findMany({
      include: {
        creator: {
          select: {
            name: true,
            role: true,
          },
        },

        approver: {
          select: {
            name: true,
            role: true,
          },
        },

        rejector: {
          select: {
            name: true,
            role: true,
          },
        },

        vendor: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(flights);
  } catch (error) {
    console.error("GET FLIGHTS ERROR:", error);
    return NextResponse.json([], {
      status: 200,
    });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      items = [],
      flightNumber,
      tailNumber,
      departure,
      arrival,
      date,
      paxCount,
      crewCount,
      departureTime,
      timezone,
      pickupLocation,
      dietaryNotes,
      serviceStyleNotes,
      specialInstructions,
      deliveryDate,
      deliveryTime
    } = body;

    // VALIDATIONS

    if (!departure?.trim()) {
      return NextResponse.json(
        { error: "Departure airport required" },
        { status: 400 },
      );
    }
    if (!arrival?.trim()) {
      return NextResponse.json(
        { error: "Arrival airport required" },
        { status: 400 },
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "Flight date required" },
        { status: 400 },
      );
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid flight date" },
        { status: 400 },
      );
    }

    const finalItems = Array.isArray(items) ? items : [];

    // Fetch valid CatalogItem and Vendor IDs to prevent database constraint violations
    const itemIds = finalItems.map((item: any) => item.itemId).filter(Boolean);
    const vendorIds = finalItems.map((item: any) => item.vendorId).filter(Boolean);

    const [validCatalogItems, validVendors] = await Promise.all([
      prisma.catalogItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true },
      }),
      prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true },
      }),
    ]);

    const validCatalogItemIds = new Set(validCatalogItems.map((c) => c.id));
    const validVendorIds = new Set(validVendors.map((v) => v.id));

    const flight = await prisma.flightOrder.create({
      data: {
        flightNumber: flightNumber?.trim() || "TBD",

        tailNumber: tailNumber?.trim() || "TBD",

        departure: departure.trim().toUpperCase(),

        arrival: arrival.trim().toUpperCase(),

        date: parsedDate,

        paxCount: Number(paxCount) || 1,

        crewCount: Number(crewCount) || 1,

        departureTime: departureTime || null,

        timezone: timezone || "IST",

        pickupLocation: pickupLocation || "",

        dietaryNotes: dietaryNotes || "",

        serviceStyleNotes: serviceStyleNotes || "",

        specialInstructions: specialInstructions || "",

        deliveryDate: body.deliveryDate || null,
        deliveryTime: body.deliveryTime || null,

        status: "Draft",

        createdBy: (session.user as any).id,

        items: {
          create: finalItems.map((item: any) => ({
              itemId:
                item.itemId && validCatalogItemIds.has(item.itemId)
                  ? item.itemId
                  : null,

              vendorId:
                item.vendorId && validVendorIds.has(item.vendorId)
                  ? item.vendorId
                  : null,

              name: item.name || "Custom Item",

              type: item.type || "custom",

              quantity: Number(item.quantity) || 1,

              notes: item.notes || "",

              unit: item.unit || "",

              category: item.category || "",

              price:
                item.price !== undefined && item.price !== null
                  ? Number(item.price)
                  : null,

              dietaryTags: Array.isArray(item.dietaryTags)
                ? item.dietaryTags
                : [],
            })),
        },
      },

      include: {
        items: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        creator: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });
    // DYNAMIC STOCK DECREMENT
    const warehouseLoc = await prisma.inventoryLocation.findFirst({
      where: { type: "WAREHOUSE" }
    });

    for (const item of finalItems) {
      if (item.isRestored) {
        let deductFromWarehouse = 0;
        if (tailNumber && tailNumber.trim() !== "" && tailNumber.trim().toUpperCase() !== "TBD") {
          const restoredPool = await prisma.restoredItem.findMany({
            where: {
              flightOrder: {
                tailNumber: tailNumber.trim().toUpperCase(),
                status: "Completed"
              },
              returnedQty: { gt: 0 }
            },
            orderBy: { restoredAt: "asc" },
            include: { flightOrder: { include: { items: true } } }
          });

          let remainingRequested = Number(item.quantity);

          for (const ri of restoredPool) {
             if (remainingRequested <= 0) break;
             const orderItem = ri.flightOrder.items.find((i: any) => i.id === ri.itemId);
             if (orderItem && orderItem.itemId === item.itemId) {
                const deduct = Math.min(ri.returnedQty, remainingRequested);
                await prisma.restoredItem.update({
                  where: { id: ri.id },
                  data: { returnedQty: ri.returnedQty - deduct }
                });
                remainingRequested -= deduct;
             }
          }
          deductFromWarehouse = remainingRequested;
        } else {
          deductFromWarehouse = Number(item.quantity);
        }

        if (deductFromWarehouse > 0 && warehouseLoc && item.itemId && validCatalogItemIds.has(item.itemId) && !item.vendorId) {
          const balanceId = `${warehouseLoc.id}_${item.itemId}`;
          const existing = await prisma.inventoryBalance.findUnique({ where: { id: balanceId } });
          const newQty = Math.max(0, (existing?.onHandBaseUnits ?? 0) - deductFromWarehouse);
          
          await prisma.inventoryBalance.upsert({
            where: { id: balanceId },
            update: { onHandBaseUnits: newQty },
            create: { id: balanceId, locationId: warehouseLoc.id, itemId: item.itemId, onHandBaseUnits: newQty }
          });

          await prisma.catalogItem.update({
            where: { id: item.itemId },
            data: { stock: newQty }
          });
        }

      } else if (item.itemId && validCatalogItemIds.has(item.itemId) && !item.vendorId) {
        if (warehouseLoc) {
          const balanceId = `${warehouseLoc.id}_${item.itemId}`;
          const existing = await prisma.inventoryBalance.findUnique({ where: { id: balanceId } });
          const newQty = Math.max(0, (existing?.onHandBaseUnits ?? 0) - Number(item.quantity));
          
          await prisma.inventoryBalance.upsert({
            where: { id: balanceId },
            update: { onHandBaseUnits: newQty },
            create: { id: balanceId, locationId: warehouseLoc.id, itemId: item.itemId, onHandBaseUnits: newQty }
          });

          const catalogItem = await prisma.catalogItem.update({
            where: { id: item.itemId },
            data: { stock: newQty }
          });

          if (catalogItem.type === "grocery") {
            const thresholdType = catalogItem.reorderThresholdType;
            const thresholdValue = catalogItem.reorderThresholdValue;
            const packSize = catalogItem.packSize || 1;
            const thresholdBaseUnits = (thresholdType === "PACK" && catalogItem.packEnabled) 
              ? thresholdValue * packSize 
              : thresholdValue;

            const isLow = newQty < Math.max(thresholdBaseUnits, 10);
            const existingAlert = await prisma.inventoryAlert.findFirst({
              where: { itemId: item.itemId, locationId: warehouseLoc.id, acknowledgedAt: null }
            });

            if (isLow && !existingAlert) {
              await prisma.inventoryAlert.create({
                data: {
                  itemId: item.itemId,
                  locationId: warehouseLoc.id,
                  severity: "LOW_STOCK",
                  thresholdType,
                  thresholdValue,
                  currentBaseUnits: newQty
                }
              });
            } else if (!isLow && existingAlert) {
              await prisma.inventoryAlert.update({
                where: { id: existingAlert.id },
                data: { acknowledgedAt: new Date(), acknowledgedBy: "SYSTEM_AUTO" }
              });
            } else if (isLow && existingAlert) {
              await prisma.inventoryAlert.update({
                where: { id: existingAlert.id },
                data: { currentBaseUnits: newQty }
              });
            }
          }
        }
      }
    }

    return NextResponse.json(flight);
  } catch (error: any) {
    console.error("CREATE FLIGHT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to create flight",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
