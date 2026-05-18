// app/tracking/page.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TrackingClient from "./tracking-client";

export default async function TrackingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const orders = await prisma.flightOrder.findMany({
    where: {
      status: {
        in: [
          "Approved",
          "SentToVendor",
          "Confirmed",
          "Delivered",
          "Completed",
          "Rejected",
          "Cancelled",
        ],
      },
    },

    include: {
      vendor: true,

      items: {
        include: {
          vendor: true,
        },
      },

      restoredItems: true,

      creator: {
        select: {
          name: true,
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
    },

    orderBy: {
      updatedAt: "desc",
    },
  });

  return <TrackingClient orders={JSON.parse(JSON.stringify(orders))} />;
}
