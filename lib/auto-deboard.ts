import prisma from "@/lib/prisma";

export async function autoDeboardFlight(
    tx: any,
    flightId: string,
    userId: string,
) {
    const flight = await tx.flightOrder.findUnique({
        where: {
            id: flightId,
        },

        include: {
            items: true,
        },
    });

    if (!flight) {
        throw new Error("Flight not found");
    }

    // FIND ONBOARD ITEMS
    const onboardItems =
        flight.items.filter((item: any) =>
            item.name?.includes("(ONBOARD)"),
        );

    for (const item of onboardItems) {
        const remainingQty =
            Number(item.quantity || 0);

        if (remainingQty <= 0) {
            continue;
        }

        // INVENTORY TRANSACTION
        await tx.inventoryTransaction.create({
            data: {
                createdBy: userId,

                type: "ADJUST",

                itemId: item.itemId,

                baseUnits: remainingQty,

                flightId,

                note: JSON.stringify({
                    action: "AUTO_DEBOARD_CANCELLED",
                }),
            },
        });

        // SAVE TO REUSABLE POOL
        await tx.restoredItem.create({
            data: {
                flightOrderId: flightId,

                itemId: item.id,

                returnedQty: remainingQty,

                restoredBy: userId,
            },
        });
    }

    // MOVE STATUS
    await tx.flightOrder.update({
        where: {
            id: flightId,
        },

        data: {
            status: "DeBoard",
        },
    });
}