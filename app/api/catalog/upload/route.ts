// // app/api/catalog/upload/route.ts
// import { NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma';
// import { parse } from 'csv-parse/sync';

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file');
//     if (!file || !(file instanceof Blob)) {
//       return NextResponse.json({ error: 'No file provided' }, { status: 400 });
//     }
//     const buffer = Buffer.from(await file.arrayBuffer());
//     const csv = buffer.toString('utf-8');
//     // Expect CSV headers: name,category,sku,warehouseQty,minQty,packEnabled,packSize,packLabel,reorderThresholdType,reorderThresholdValue
//     const records = parse(csv, {
//       columns: true,
//       skip_empty_lines: true,
//       trim: true,
//     });
//     const createdItems = [];
//     for (const rec of records) {
//       const data = {
//         name: rec.name,
//         category: rec.category,
//         sku: rec.sku || null,
//         warehouseQty: Number(rec.warehouseQty) || 0,
//         minQty: Number(rec.minQty) || 0,
//         packEnabled: rec.packEnabled === 'true' || rec.packEnabled === '1',
//         packSize: rec.packSize ? Number(rec.packSize) : null,
//         packLabel: rec.packLabel || null,
//         reorderThresholdType: rec.reorderThresholdType || 'ABSOLUTE',
//         reorderThresholdValue: Number(rec.reorderThresholdValue) || 0,
//       };
//       const item = await prisma.inventoryItem.create({ data });
//       createdItems.push(item);
//     }
//     return NextResponse.json({ success: true, created: createdItems.length });
//   } catch (error) {
//     console.error('Upload error', error);
//     return NextResponse.json({ error: 'Failed to process CSV' }, { status: 500 });
//   }
// }
