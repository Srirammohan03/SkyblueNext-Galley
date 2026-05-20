// app/api/inventory/locations/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // WAREHOUSE | ONBOARD

  const where: any = { isActive: true };
  if (type) where.type = type;

  const locations = await prisma.inventoryLocation.findMany({
    where,
    include: {
      aircraft: { select: { id: true, tailNumber: true, label: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(locations);
}
