// app/api/flights/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            );
        }

        const body = await req.json();

        const {
            status,
            billAmount,
            billNotes,
            billUrl,
            rejectionReason,
            cancelReason,
        } = body;

        const updatedFlight =
            await prisma.$transaction(
                async (tx) => {
                    const flight =
                        await tx.flightOrder.findUnique({
                            where: {
                                id: params.id,
                            },

                            include: {
                                items: true,
                            },
                        });

                    if (!flight) {
                        throw new Error(
                            "Flight not found",
                        );
                    }

                    // =========================================
                    // AUTO DEBOARD ON CANCEL / REJECT
                    // =========================================

                    const isCancelling =
                        ["Rejected", "Cancelled"].includes(
                            status,
                        ) &&
                        ![
                            "Rejected",
                            "Cancelled",
                            "Completed",
                        ].includes(flight.status);

                    if (isCancelling) {
                        // FIND ONBOARD ITEMS
                        const onboardItems =
                            flight.items.filter((item) =>
                                item.name?.includes(
                                    "(ONBOARD)",
                                ),
                            );

                        for (const item of onboardItems) {
                            const remainingQty =
                                Number(item.quantity || 0);

                            if (
                                !item.itemId ||
                                remainingQty <= 0
                            ) {
                                continue;
                            }

                            // SAVE INVENTORY TRANSACTION
                            await tx.inventoryTransaction.create(
                                {
                                    data: {
                                        createdBy:
                                            session.user.id,

                                        type: "ADJUST",

                                        itemId: item.itemId,

                                        baseUnits:
                                            remainingQty,

                                        flightId:
                                            flight.id,

                                        note: JSON.stringify(
                                            {
                                                action:
                                                    "AUTO_DEBOARD_CANCELLED",

                                                source:
                                                    status,

                                                restoredQty:
                                                    remainingQty,
                                            },
                                        ),
                                    },
                                },
                            );

                            // SAVE RESTORED STOCK
                            await tx.restoredItem.create(
                                {
                                    data: {
                                        flightOrderId:
                                            flight.id,

                                        itemId: item.id,

                                        returnedQty:
                                            remainingQty,

                                        restoredBy:
                                            session.user.id,
                                    },
                                },
                            );
                        }
                    }

                    // =========================================
                    // UPDATE FLIGHT STATUS
                    // =========================================

                    const result =
                        await tx.flightOrder.update({
                            where: {
                                id: params.id,
                            },

                            data: {
                                status,

                                rejectionReason:
                                    status ===
                                        "Rejected"
                                        ? rejectionReason
                                        : flight.rejectionReason,

                                rejectedAt:
                                    status ===
                                        "Rejected"
                                        ? new Date()
                                        : flight.rejectedAt,

                                cancelReason:
                                    status ===
                                        "Cancelled"
                                        ? cancelReason
                                        : flight.cancelReason,

                                cancelledAt:
                                    status ===
                                        "Cancelled"
                                        ? new Date()
                                        : flight.cancelledAt,

                                rejectedBy:
                                    status ===
                                        "Rejected" ||
                                        status ===
                                        "Cancelled"
                                        ? session.user.id
                                        : flight.rejectedBy,

                                billAmount:
                                    billAmount !==
                                        undefined
                                        ? Number(
                                            billAmount,
                                        )
                                        : flight.billAmount,

                                billNotes:
                                    billNotes !==
                                        undefined
                                        ? billNotes
                                        : flight.billNotes,

                                billUrl:
                                    billUrl !==
                                        undefined
                                        ? billUrl
                                        : flight.billUrl,
                            },
                        });

                    return result;
                },
            );

        return NextResponse.json(
            updatedFlight,
        );
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                error:
                    "Failed to update status",
            },
            {
                status: 500,
            },
        );
    }
}