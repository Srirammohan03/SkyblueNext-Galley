// app\api\flights\[id]\route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const flight = await prisma.flightOrder.findUnique({
      where: { id: params.id },
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
        creator: { select: { name: true, email: true } },
        vendor: true,
      },
    });
    if (!flight) return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    return NextResponse.json(flight, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch flight" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const oldFlight = await prisma.flightOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!oldFlight) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsedDepartureTime = body.date
      ? body.date.split("T")[1]?.slice(0, 5)
      : null;
    const newItemIds = Array.isArray(body.items)
      ? body.items.map((item: any) => item.itemId).filter(Boolean)
      : [];
    const oldItemIds = oldFlight.items.map(i => i.itemId).filter(Boolean);
    const itemIds = Array.from(new Set([...newItemIds, ...oldItemIds])) as string[];

    const vendorIds = Array.isArray(body.items)
      ? body.items.map((item: any) => item.vendorId).filter(Boolean)
      : [];

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

    const items = Array.isArray(body.items)
      ? body.items.map((item: any) => ({
        itemId:
          item.itemId && validCatalogItemIds.has(item.itemId)
            ? item.itemId
            : null,

        vendorId:
          item.vendorId && validVendorIds.has(item.vendorId)
            ? item.vendorId
            : null,

        vendorName:
          item.vendorName || null,

        name:
          item.name || "Custom Item",

        type:
          item.type || "custom",

        quantity:
          Number(item.quantity) || 1,

        notes:
          item.isRestored ? "Restored from previous flight" : (item.notes || ""),

        unit:
          item.unit || "",

        price:
          Number(item.price) || 0,

        currency:
          item.currency || "INR",

        category:
          item.category || "",

        dietaryTags: Array.isArray(
          item.dietaryTags
        )
          ? item.dietaryTags
          : [],
      }))
      : [];

    // CALCULATE DELTAS AND UPDATE STOCK & RESTORED ITEMS
    const warehouseLoc = await prisma.inventoryLocation.findFirst({
      where: { type: "WAREHOUSE" }
    });

    const allItemIds = Array.from(new Set([
      ...oldFlight.items.map(i => i.itemId).filter(Boolean),
      ...items.map((i: any) => i.itemId).filter(Boolean)
    ])) as string[];

    const finalTailNumber = (body.tailNumber || oldFlight.tailNumber || "").trim().toUpperCase();

    for (const itemId of allItemIds) {
      const newPayloads = items.filter((i: any) => i.itemId === itemId);
      const oldDbItems = oldFlight.items.filter(i => i.itemId === itemId);

      // Case A: Restored Item
      const newRestoredQty = newPayloads.filter((i: any) => i.notes === "Restored from previous flight").reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0);
      const oldRestoredQty = oldDbItems.filter(i => i.notes === "Restored from previous flight").reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0);
      const restoredDelta = newRestoredQty - oldRestoredQty;

      let unfulfilledRestoredDelta = 0;

      if (restoredDelta !== 0 && finalTailNumber && finalTailNumber !== "TBD") {
        if (restoredDelta > 0) {
          const restoredPool = await prisma.restoredItem.findMany({
            where: {
              flightOrder: {
                tailNumber: finalTailNumber.trim().toUpperCase(),
                status: "Completed"
              },
              returnedQty: { gt: 0 }
            },
            orderBy: { restoredAt: "asc" },
            include: { flightOrder: { include: { items: true } } }
          });

          let remainingToDeduct = restoredDelta;

          for (const ri of restoredPool) {
            if (remainingToDeduct <= 0) break;
            const orderItem = ri.flightOrder.items.find((i: any) => i.id === ri.itemId);
            if (orderItem && orderItem.itemId === itemId) {
              const deduct = Math.min(ri.returnedQty, remainingToDeduct);
              await prisma.restoredItem.update({
                where: { id: ri.id },
                data: { returnedQty: ri.returnedQty - deduct }
              });
              remainingToDeduct -= deduct;
            }
          }
          unfulfilledRestoredDelta = remainingToDeduct;
        } else {
          // If the user reduces the quantity of a "restored" item row, 
          // we refund it to the warehouse pool, preventing the ephemeral restored pool from overfilling.
          unfulfilledRestoredDelta = restoredDelta;
        }
      } else if (restoredDelta > 0) {
        unfulfilledRestoredDelta = restoredDelta;
      }

      // Case B: Warehouse Item (not vendor, not restored)
      const newWarehouseQty = newPayloads.filter((i: any) => i.notes !== "Restored from previous flight" && !i.vendorId).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0);
      const oldWarehouseQty = oldDbItems.filter(i => i.notes !== "Restored from previous flight" && !i.vendorId).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0);
      const warehouseDelta = newWarehouseQty - oldWarehouseQty + unfulfilledRestoredDelta;

      if (warehouseDelta !== 0 && warehouseLoc && validCatalogItemIds.has(itemId)) {
        const balanceId = `${warehouseLoc.id}_${itemId}`;
        const existing = await prisma.inventoryBalance.findUnique({ where: { id: balanceId } });
        const newQty = Math.max(0, (existing?.onHandBaseUnits ?? 0) - warehouseDelta);

        await prisma.inventoryBalance.upsert({
          where: { id: balanceId },
          update: { onHandBaseUnits: newQty },
          create: { id: balanceId, locationId: warehouseLoc.id, itemId, onHandBaseUnits: newQty }
        });

        const catalogItem = await prisma.catalogItem.update({
          where: { id: itemId },
          data: { stock: newQty }
        });

        // if (catalogItem.type === "grocery") {
        //   const thresholdType = catalogItem.reorderThresholdType;
        //   const thresholdValue = catalogItem.reorderThresholdValue;
        //   const packSize = catalogItem.packSize || 1;
        //   const thresholdBaseUnits = (thresholdType === "PACK" && catalogItem.packEnabled) 
        //     ? thresholdValue * packSize 
        //     : thresholdValue;

        //   const isLow = newQty < Math.max(thresholdBaseUnits, 10);
        //   const existingAlert = await prisma.inventoryAlert.findFirst({
        //     where: { itemId, locationId: warehouseLoc.id, acknowledgedAt: null }
        //   });

        //   if (isLow && !existingAlert) {
        //     await prisma.inventoryAlert.create({
        //       data: {
        //         itemId,
        //         locationId: warehouseLoc.id,
        //         severity: "LOW_STOCK",
        //         thresholdType,
        //         thresholdValue,
        //         currentBaseUnits: newQty
        //       }
        //     });
        //   } else if (!isLow && existingAlert) {
        //     await prisma.inventoryAlert.update({
        //       where: { id: existingAlert.id },
        //       data: { acknowledgedAt: new Date(), acknowledgedBy: "SYSTEM_AUTO" }
        //     });
        //   } else if (isLow && existingAlert) {
        //     await prisma.inventoryAlert.update({
        //       where: { id: existingAlert.id },
        //       data: { currentBaseUnits: newQty }
        //     });
        //   }
        // }
      }
    }

    // DELETE OLD ITEMS
    await prisma.orderItem.deleteMany({
      where: {
        orderId: params.id,
      },
    });

    const updatedFlight =
      await prisma.flightOrder.update({
        where: {
          id: params.id,
        },

        data: {
          flightNumber:
            body.flightNumber || "TBD",

          tailNumber:
            body.tailNumber || "TBD",

          departure:
            body.departure || "",

          arrival:
            body.arrival || "",

          date: body.date
            ? new Date(body.date)
            : new Date(),
          departureTime: parsedDepartureTime,
          paxCount:
            Number(body.paxCount) || 1,

          crewCount:
            Number(body.crewCount) || 1,

          timezone:
            body.timezone || "UTC",

          pickupLocation:
            body.pickupLocation || "",

          dietaryNotes:
            body.dietaryNotes || "",

          serviceStyleNotes:
            body.serviceStyleNotes || "",

          specialInstructions:
            body.specialInstructions || "",

          deliveryDate:
            body.deliveryDate || null,

          deliveryTime:
            body.deliveryTime || null,

          status:
            body.status || "Draft",

          items: {
            create: items,
          },
        },

        include: {
          items: {
            include: {
              vendor: true,
            },
          },
        },
      });

    return NextResponse.json(
      updatedFlight
    );
  } catch (error: any) {
    console.error(
      "FAILED TO UPDATE FLIGHT:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update flight",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Note: orderId on OrderItem has onDelete: Cascade in your schema, 
    // so this will automatically clean up the items.
    await prisma.flightOrder.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete flight:", error);
    return NextResponse.json({ error: "Failed to delete flight" }, { status: 500 });
  }
}