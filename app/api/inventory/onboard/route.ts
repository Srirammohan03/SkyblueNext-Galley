// app/api/inventory/onboard/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const { catalogItemId, flightId, baseUnits } = body;
    if (!catalogItemId || !flightId || !baseUnits || Number(baseUnits) <= 0) {
        return NextResponse.json({ error: "catalogItemId, flightId and positive baseUnits required" }, { status: 400 });
    }

    try {
        // Fetch flight
        const flight = await prisma.flightOrder.findUnique({
            where: {
                id: flightId,
            },
        });

        if (!flight) {
            throw new Error("Flight not found");
        }
        // Determine warehouse location
        const warehouseLoc =
            await prisma.inventoryLocation.findFirst({
                where: {
                    type: "WAREHOUSE",
                },
            });

        if (!warehouseLoc) {
            throw new Error(
                "Warehouse location missing",
            );
        };

        const requested = Math.round(Number(baseUnits));

        // Calculate available restored (catalog-level) for this tailNumber
        const restoredPool =
            await prisma.restoredItem.findMany({
                where: {
                    flightOrder: {
                        tailNumber: flight.tailNumber,
                        status: "Completed",
                    },
                    returnedQty: {
                        gt: 0,
                    },
                },

                include: {
                    flightOrder: {
                        include: {
                            items: true,
                        },
                    },
                },

                orderBy: {
                    restoredAt: "asc",
                },
            });
        const result = await prisma.$transaction(
            async (tx) => {


                let remainingRequested = requested;
                let totalReused = 0;

                for (const ri of restoredPool) {
                    if (remainingRequested <= 0) break;
                    const orderItem = ri.flightOrder.items.find((i: any) => i.id === ri.itemId);
                    if (!orderItem) continue;
                    const catId = orderItem.itemId;
                    if (catId !== catalogItemId) continue;
                    const deduct = Math.min(ri.returnedQty, remainingRequested);
                    await tx.restoredItem.update({ where: { id: ri.id }, data: { returnedQty: ri.returnedQty - deduct } });
                    remainingRequested -= deduct;
                    totalReused += deduct;
                }

                const needFromWarehouse = remainingRequested;

                // Adjust catalog inventory balance for warehouse
                // Find warehouse inventory balance
                const existingBal =
                    await tx.inventoryBalance.findFirst({
                        where: {
                            locationId: warehouseLoc.id,
                            itemId: catalogItemId,
                        },
                    });

                if (!existingBal) {
                    throw new Error(
                        "Warehouse inventory balance not found",
                    );
                }

                const have =
                    existingBal.onHandBaseUnits ?? 0;

                if (have < needFromWarehouse) {
                    throw new Error(
                        `Insufficient warehouse stock: have ${have}, need ${needFromWarehouse}`,
                    );
                }

                const newBal = Math.max(
                    0,
                    have - needFromWarehouse,
                );

                // Update warehouse stock
                await tx.inventoryBalance.update({
                    where: {
                        id: existingBal.id,
                    },

                    data: {
                        onHandBaseUnits: newBal,
                    },
                });
                // Update CatalogItem stock
                await tx.catalogItem.update({ where: { id: catalogItemId }, data: { stock: newBal } });

                // Create inventoryTransaction record (catalog-level)
                // const invTx = await tx.inventoryTransaction.create({
                //     data: {
                //         createdBy: (session.user as any).id,
                //         type: "TRANSFER",
                //         itemId: catalogItemId,
                //         fromLocationId: warehouseLoc.id,
                //         toLocationId: null,
                //         baseUnits: requested,
                //         flightId,
                //     },
                // });

                // Allocation summary
                const reusedQty = totalReused;

                const warehouseQty = needFromWarehouse;

                // Store onboard allocation in inventory transaction
                // Store onboard allocation in inventory transaction
                const onboardRecord =
                    await tx.inventoryTransaction.create({
                        data: {
                            createdBy:
                                (session.user as any).id,

                            type: "TRANSFER",

                            itemId: catalogItemId,

                            fromLocationId:
                                warehouseLoc.id,

                            toLocationId: null,

                            baseUnits: requested,

                            flightId,

                            note: JSON.stringify({
                                action: "ONBOARD",

                                reusedQty,

                                warehouseQty,
                            }),
                        },
                    });
                // GET CATALOG ITEM
                const catalogItem =
                    await tx.catalogItem.findUnique({
                        where: {
                            id: catalogItemId,
                        },
                    });

                if (!catalogItem) {
                    throw new Error(
                        "Catalog item not found",
                    );
                }

                const createdOrderItem =
                    await tx.orderItem.create({
                        data: {
                            orderId: flightId,

                            itemId: catalogItemId,

                            vendorId: null,

                            vendorName: "Aircraft Inventory",

                            name: `${catalogItem.name} (ONBOARD)`,

                            type: "custom",

                            category:
                                catalogItem.category,

                            quantity: requested,

                            notes:
                                "Onboard inventory allocation",

                            unit:
                                catalogItem.unit,

                            dietaryTags:
                                catalogItem.dietaryTags || [],

                            price: catalogItem?.price,

                            currency:
                                catalogItem.currency || "INR",
                        },
                    });

                console.log(
                    "ORDER ITEM CREATED:",
                    createdOrderItem,
                );

                // Auto-transition flight status
                if (flight.status !== "OnBoard") {
                    await tx.flightOrder.update({
                        where: {
                            id: flightId,
                        },
                        data: {
                            status: "OnBoard",
                        },
                    });
                }


                return {
                    onboard: onboardRecord,
                };
            },
            {
                timeout: 20000,
            });
        // revalidatePath(`/flights/${flightId}`);
        // revalidatePath("/flights");
        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        console.error("ONBOARD API ERROR:", err);
        return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
    }
}
