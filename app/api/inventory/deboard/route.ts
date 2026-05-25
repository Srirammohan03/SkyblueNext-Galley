// app\api\inventory\deboard\route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    try {
        const body = await req.json();

        const { flightId, items } = body;

        if (!flightId || !Array.isArray(items)) {
            return NextResponse.json(
                { error: "Invalid payload" },
                { status: 400 },
            );
        }

        await prisma.$transaction(async (tx) => {
            const flight = await tx.flightOrder.findUnique({
                where: {
                    id: flightId,
                },
            });

            if (!flight) {
                throw new Error("Flight not found");
            }

            for (const item of items) {
                const usedQty = Number(item.usedQty || 0);

                const remainingQty = Number(item.remainingQty || 0);

                // STORE CONSUMED INVENTORY
                if (usedQty > 0) {
                    await tx.inventoryTransaction.create({
                        data: {
                            createdBy: (session.user as any).id,

                            type: "CONSUME",

                            itemId: item.itemId,

                            baseUnits: usedQty,

                            flightId,

                            note: JSON.stringify({
                                action: "DEBOARD_USED",
                            }),
                        },
                    });
                }

                // STORE REUSABLE STOCK
                if (remainingQty > 0) {
                    await tx.inventoryTransaction.create({
                        data: {
                            createdBy: (session.user as any).id,

                            type: "ADJUST",

                            itemId: item.itemId,

                            baseUnits: remainingQty,

                            flightId,

                            note: JSON.stringify({
                                action: "DEBOARD_REMAINING",
                            }),
                        },
                    });

                    // SAVE TO RESTORED POOL
                    const onboardOrderItem =
                        await tx.orderItem.findFirst({
                            where: {
                                orderId: flightId,

                                itemId: item.itemId,

                                name: {
                                    contains: "(ONBOARD)",
                                },
                            },
                        });

                    if (onboardOrderItem) {
                        await tx.restoredItem.create({
                            data: {
                                flightOrderId: flightId,

                                itemId: onboardOrderItem.id,

                                returnedQty: remainingQty,

                                restoredBy: (session.user as any).id,
                            },
                        });
                    }
                }
            }

            // UPDATE FLIGHT STATUS
            await tx.flightOrder.update({
                where: {
                    id: flightId,
                },

                data: {
                    status: "DeBoard",
                },
            });
        });

        return NextResponse.json({
            success: true,
        });
    } catch (error: any) {
        console.error(
            "DEBOARD ERROR:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Deboard failed",
            },
            {
                status: 500,
            },
        );
    }
}