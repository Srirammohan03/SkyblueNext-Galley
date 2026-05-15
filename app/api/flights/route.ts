// app/api/flights/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";

    const status = searchParams.get("status") || "";

    const startDate = searchParams.get("startDate");

    const endDate = searchParams.get("endDate");

    const flights = await prisma.flightOrder.findMany({
      where: {
        ...(search && {
          OR: [
            {
              flightNumber: {
                contains: search,
                mode: "insensitive",
              },
            },

            {
              departure: {
                contains: search,
                mode: "insensitive",
              },
            },

            {
              arrival: {
                contains: search,
                mode: "insensitive",
              },
            },

            {
              tailNumber: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }),

        ...(status &&
          status !== "All" && {
            status: status as any,
          }),

        ...((startDate || endDate) && {
          date: {
            ...(startDate && {
              gte: new Date(startDate),
            }),

            ...(endDate && {
              lte: new Date(`${endDate}T23:59:59.999Z`),
            }),
          },
        }),
      },

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
      },

      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(flights);
  } catch (error) {
    console.error("GET FLIGHTS ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch flights",
      },
      {
        status: 500,
      },
    );
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
      deliveryTime,
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

        timezone: timezone || "UTC",

        pickupLocation: pickupLocation || "",

        dietaryNotes: dietaryNotes || "",

        serviceStyleNotes: serviceStyleNotes || "",

        specialInstructions: specialInstructions || "",

        deliveryDate: body.deliveryDate || null,
        deliveryTime: body.deliveryTime || null,

        status: "Draft",

        createdBy: (session.user as any).id,

        items: {
          create: Array.isArray(items)
            ? items.map((item: any) => ({
                itemId: item.itemId || "custom",

                vendorId: item.vendorId || null,

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
              }))
            : [],
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
