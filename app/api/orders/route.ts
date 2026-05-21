// app/api/orders/route.ts
"use server";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    // For now, only support flight orders
    const orders = await prisma.flightOrder.findMany({
      where: type === "flight" ? {} : undefined,
      select: {
        id: true,
        flightNumber: true,
        tailNumber: true,
        date: true,
        departure: true,
        arrival: true,
        status: true,
        // include fields used by PDF component
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
