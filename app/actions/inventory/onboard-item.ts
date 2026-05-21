"use server";

import { prisma } from "@/lib/prisma";

export interface OnboardItemInput {
  flightId: string;
  inventoryItemId: string;
  quantity: number;
}

export async function onboardItem({ flightId, inventoryItemId, quantity }: OnboardItemInput) {
  if (!flightId || !inventoryItemId || quantity <= 0) {
    throw new Error("Invalid input: flightId, inventoryItemId, and positive quantity are required");
  }

  // 1. Fetch flight details
  const flight = await prisma.flightOrder.findUnique({
    where: { id: flightId },
    select: { tailNumber: true, status: true },
  });

  if (!flight) {
    throw new Error("Flight order not found");
  }

  const tailNumber = flight.tailNumber;

  // 2. Next Flight Reuse Algorithm: Calculate available reusable stock for this tail number
  // Sum returnedQty in DeboardItem for this tailNumber and inventoryItemId
  const deboardSum = await prisma.deboardItem.aggregate({
    _sum: {
      returnedQty: true,
    },
    where: {
      inventoryItemId,
      flight: {
        tailNumber,
      },
    },
  });

  // Sum reusedQty in OnboardItem for this tailNumber and inventoryItemId
  const onboardSum = await prisma.onboardItem.aggregate({
    _sum: {
      reusedQty: true,
    },
    where: {
      inventoryItemId,
      flight: {
        tailNumber,
      },
    },
  });

  const totalReturned = deboardSum._sum.returnedQty || 0;
  const totalReused = onboardSum._sum.reusedQty || 0;
  const availableReusable = Math.max(0, totalReturned - totalReused);

  // 3. Allocate quantities
  const reusedQty = Math.min(quantity, availableReusable);
  const warehouseQty = quantity - reusedQty;

  // 4. Verify warehouse stock if needed
  if (warehouseQty > 0) {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!inventoryItem) {
      throw new Error("Inventory item not found");
    }

    if (inventoryItem.warehouseQty < warehouseQty) {
      throw new Error(
        `Insufficient warehouse stock. Needed: ${warehouseQty}, Available: ${inventoryItem.warehouseQty}`
      );
    }
  }

  // 5. Run Prisma Transaction
  return await prisma.$transaction(async (tx) => {
    // Deduct from warehouse
    if (warehouseQty > 0) {
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          warehouseQty: {
            decrement: warehouseQty,
          },
        },
      });
    }

    // Create or update OnboardItem
    // Let's see if there is already an OnboardItem for this flight and inventoryItem
    const existingOnboard = await tx.onboardItem.findFirst({
      where: {
        flightId,
        inventoryItemId,
      },
    });

    let onboardRecord;
    if (existingOnboard) {
      onboardRecord = await tx.onboardItem.update({
        where: { id: existingOnboard.id },
        data: {
          quantity: { increment: quantity },
          reusedQty: { increment: reusedQty },
          warehouseQty: { increment: warehouseQty },
        },
      });
    } else {
      onboardRecord = await tx.onboardItem.create({
        data: {
          flightId,
          inventoryItemId,
          quantity,
          reusedQty,
          warehouseQty,
        },
      });
    }

    // Create Inventory Movements
    if (warehouseQty > 0) {
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId,
          flightId,
          type: "ONBOARD",
          quantity: -warehouseQty, // Negative represents deduction from general warehouse
          notes: `Onboard allocation (warehouse deduction). Reused: ${reusedQty}`,
        },
      });
    }
    if (reusedQty > 0) {
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId,
          flightId,
          type: "REUSE",
          quantity: reusedQty, // Reused quantity from tail number returns
          notes: `Onboard allocation (reused from tail number ${tailNumber})`,
        },
      });
    }

    // Automatic status transition: If status is Delivered, advance to Onboard
    if (flight.status === "Delivered") {
      await tx.flightOrder.update({
        where: { id: flightId },
        data: {
          status: "Onboard",
        },
      });
    }

    // Audit logging
    await tx.inventoryAuditLog.create({
      data: {
        action: "ONBOARD_ITEM",
        entityType: "OnboardItem",
        entityId: onboardRecord.id,
        newData: {
          flightId,
          inventoryItemId,
          quantity,
          reusedQty,
          warehouseQty,
          totalOnboarded: onboardRecord.quantity,
        },
      },
    });

    return onboardRecord;
  });
}
