// "use server";

// import { prisma } from "@/lib/prisma";

// export interface DeboardItemInput {
//   flightId: string;
//   inventoryItemId: string;
//   onboardQty: number;
//   returnedQty: number;
//   usedQty: number;
//   damagedQty: number;
// }

// export async function deboardItem({
//   flightId,
//   inventoryItemId,
//   onboardQty,
//   returnedQty,
//   usedQty,
//   damagedQty,
// }: DeboardItemInput) {
//   // 1. Validation
//   if (!flightId || !inventoryItemId) {
//     throw new Error("flightId and inventoryItemId are required");
//   }

//   if (returnedQty < 0 || usedQty < 0 || damagedQty < 0) {
//     throw new Error("Quantities cannot be negative");
//   }

//   if (returnedQty + usedQty + damagedQty !== onboardQty) {
//     throw new Error(
//       `Sum of returned (${returnedQty}), used (${usedQty}), and damaged (${damagedQty}) must equal onboard quantity (${onboardQty})`
//     );
//   }

//   // 2. Fetch flight
//   const flight = await prisma.flightOrder.findUnique({
//     where: { id: flightId },
//     select: { status: true, tailNumber: true },
//   });

//   if (!flight) {
//     throw new Error("Flight order not found");
//   }

//   // 3. Prisma Transaction
//   return await prisma.$transaction(async (tx) => {
//     // Check if DeboardItem already exists
//     const existingDeboard = await tx.deboardItem.findFirst({
//       where: {
//         flightId,
//         inventoryItemId,
//       },
//     });

//     let deboardRecord;
//     if (existingDeboard) {
//       // If it exists, we are editing it, so we need to adjust
//       deboardRecord = await tx.deboardItem.update({
//         where: { id: existingDeboard.id },
//         data: {
//           returnedQty,
//           usedQty,
//           damagedQty,
//         },
//       });
//     } else {
//       deboardRecord = await tx.deboardItem.create({
//         data: {
//           flightId,
//           inventoryItemId,
//           onboardQty,
//           returnedQty,
//           usedQty,
//           damagedQty,
//         },
//       });
//     }

//     // Create Inventory Movement records for deboarding log
//     await tx.inventoryMovement.create({
//       data: {
//         inventoryItemId,
//         flightId,
//         type: "DEBOARD",
//         quantity: usedQty,
//         notes: `Deboard consumption log for flight ${flight.tailNumber}. Returned: ${returnedQty}, Damaged: ${damagedQty}`,
//       },
//     });

//     if (damagedQty > 0) {
//       await tx.inventoryMovement.create({
//         data: {
//           inventoryItemId,
//           flightId,
//           type: "DAMAGE",
//           quantity: damagedQty,
//           notes: `Deboard damaged items log for flight ${flight.tailNumber}`,
//         },
//       });
//     }

//     if (returnedQty > 0) {
//       await tx.inventoryMovement.create({
//         data: {
//           inventoryItemId,
//           flightId,
//           type: "RETURN",
//           quantity: returnedQty,
//           notes: `Deboard returned items log for flight ${flight.tailNumber} (available for reuse)`,
//         },
//       });
//     }

//     // Dynamic Workflow Transition:
//     // Determine the status of the flight based on completed deboards.
//     const onboardCount = await tx.onboardItem.count({
//       where: { flightId },
//     });
//     const deboardCount = await tx.deboardItem.count({
//       where: { flightId },
//     });

//     if (onboardCount > 0) {
//       if (deboardCount === onboardCount) {
//         // If all onboarded items are deboarded, advance status to Completed
//         await tx.flightOrder.update({
//           where: { id: flightId },
//           data: {
//             status: "Completed",
//           },
//         });
//       } else {
//         // If we have started deboarding but not finished all items, advance to Deboard
//         await tx.flightOrder.update({
//           where: { id: flightId },
//           data: {
//             status: "Deboard",
//           },
//         });
//       }
//     }

//     // Audit logging
//     await tx.inventoryAuditLog.create({
//       data: {
//         action: "DEBOARD_ITEM",
//         entityType: "DeboardItem",
//         entityId: deboardRecord.id,
//         newData: {
//           flightId,
//           inventoryItemId,
//           onboardQty,
//           returnedQty,
//           usedQty,
//           damagedQty,
//         },
//       },
//     });

//     return deboardRecord;
//   });
// }
