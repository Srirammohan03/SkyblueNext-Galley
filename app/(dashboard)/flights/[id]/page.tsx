// app/flights/[id]/page.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";

import FlightOrderForm from "@/components/flight-order-form";

interface PageProps {
  params: {
    id: string;
  };

  searchParams: {
    mode?: string;
  };
}
export const dynamic = "force-dynamic";
export default async function EditFlightPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();
  const isReviewMode = searchParams.mode === "review";
  if (!session?.user) {
    redirect("/login");
  }

  const flight = await prisma.flightOrder.findUnique({
    where: {
      id: params.id,
    },

    include: {
      items: {
        include: {
          vendor: true,
        },
      },

      vendor: true,

      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!flight) {
    redirect("/flights");
  }

  const formattedFlight = {
    ...flight,

    date: flight.date ? new Date(flight.date).toISOString().slice(0, 16) : "",

    items:
      flight.items?.map((item) => ({
        id: item.id,

        itemId: item.itemId || "",

        vendorId: item.vendorId || "",

        vendorName: item.vendorName || "",

        vendor: item.vendor || null,

        name: item.name || "",

        type: item.type || "custom",

        quantity: item.quantity || 1,

        notes: item.notes || "",

        category: item.category || "",

        unit: item.unit || "",

        dietaryTags: item.dietaryTags || [],

        currency: item.currency || "INR",

        price: item.price || 0,
      })) || [],
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      <FlightOrderForm
        id={params.id}
        initialData={formattedFlight}
        isReviewMode={isReviewMode}
      />
    </div>
  );
}
