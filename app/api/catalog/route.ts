// app\api\catalog\route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Adjust based on your prisma client location

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const type = searchParams.get("type");

  const items = await prisma.catalogItem.findMany({
    where: {
      ...(type ? { type } : {}),
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const warehouse = await prisma.inventoryLocation.findFirst({
    where: { type: "WAREHOUSE" },
  });

  if (Array.isArray(body)) {
    const results = [];

    for (const item of body) {
      const type = item.type?.toLowerCase()?.trim() || "grocery";

      const defaultQty = item.defaultQty
        ? parseInt(item.defaultQty)
        : null;

      const created = await prisma.catalogItem.create({
        data: {
          ...item,
          type,
          defaultQty,
          price: Number(item.price) || 0,
          currency: item.currency || "INR",
          isAvailable:
            typeof item.isAvailable === "boolean"
              ? item.isAvailable
              : true,
        },
      });

      // Auto create warehouse balance
      if (
        warehouse &&
        defaultQty !== null &&
        type === "grocery"
      ) {
        await prisma.inventoryBalance.upsert({
          where: {
            locationId_itemId: {
              locationId: warehouse.id,
              itemId: created.id,
            },
          },
          update: {
            onHandBaseUnits: defaultQty,
          },
          create: {
            locationId: warehouse.id,
            itemId: created.id,
            onHandBaseUnits: defaultQty,
          },
        });
      }

      results.push(created);
    }

    return NextResponse.json(results);
  }

  const { id, ...data } = body;
  const defaultQty = data.defaultQty ? parseInt(data.defaultQty) : null;
  const itemType = data.type?.toLowerCase()?.trim() || "grocery";

  const item = await prisma.catalogItem.upsert({
    where: {
      id: id || "new-id",
    },
    update: {
      ...data,
      defaultQty,
      price: Number(data.price) || 0,
      currency: data.currency || "INR",
      isAvailable: typeof data.isAvailable === "boolean" ? data.isAvailable : true,
    },
    create: {
      ...data,
      defaultQty,
      price: Number(data.price) || 0,
      currency: data.currency || "INR",
      isAvailable: typeof data.isAvailable === "boolean" ? data.isAvailable : true,
    },
  });

  if (warehouse && defaultQty !== null && itemType === "grocery") {
    await prisma.inventoryBalance.upsert({
      where: {
        locationId_itemId: {
          locationId: warehouse.id,
          itemId: item.id,
        },
      },
      update: {
        onHandBaseUnits: defaultQty,
      },
      create: {
        locationId: warehouse.id,
        itemId: item.id,
        onHandBaseUnits: defaultQty,
      },
    });
  }

  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.catalogItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}