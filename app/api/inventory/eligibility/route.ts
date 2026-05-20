// app/api/inventory/eligibility/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageEligibility } from "@/lib/inventory/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json(
      { error: "locationId required" },
      { status: 400 },
    );
  }

  const eligibilities = await prisma.onboardEligibility.findMany({
    where: { locationId },
    include: { item: { select: { id: true, name: true, category: true } } },
  });

  return NextResponse.json(eligibilities);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  const userId = (session.user as any).id as string;

  if (!canManageEligibility(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { locationId, itemId, eligible } = body;

  if (!locationId || !itemId || typeof eligible !== "boolean") {
    return NextResponse.json(
      { error: "locationId, itemId, eligible(boolean) required" },
      { status: 400 },
    );
  }

  const record = await prisma.onboardEligibility.upsert({
    where: { locationId_itemId: { locationId, itemId } },
    update: { eligible, updatedBy: userId },
    create: { locationId, itemId, eligible, updatedBy: userId },
  });

  return NextResponse.json(record);
}
