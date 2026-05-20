// app/api/inventory/aircraft/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const aircraft = await prisma.aircraft.findMany({
    where: { isActive: true },
    include: {
      locations: {
        where: { type: "ONBOARD", isActive: true },
        select: { id: true, name: true },
      },
    },
    orderBy: { tailNumber: "asc" },
  });
  return NextResponse.json(aircraft);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role as string;
  if (!["admin", "approver"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { tailNumber, label } = body;
  if (!tailNumber?.trim() || !label?.trim()) {
    return NextResponse.json(
      { error: "tailNumber and label are required" },
      { status: 400 },
    );
  }

  try {
    const aircraft = await prisma.$transaction(async (tx) => {
      const ac = await tx.aircraft.create({
        data: { tailNumber: tailNumber.trim().toUpperCase(), label: label.trim() },
      });
      // Auto-create ONBOARD location
      await tx.inventoryLocation.create({
        data: {
          type: "ONBOARD",
          name: `Onboard ${ac.tailNumber}`,
          aircraftId: ac.id,
        },
      });
      return ac;
    });
    return NextResponse.json(aircraft, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Tail number already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create aircraft" },
      { status: 500 },
    );
  }
}
