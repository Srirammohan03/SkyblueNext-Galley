const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAlerts() {
  const warehouse = await prisma.inventoryLocation.findFirst({ where: { type: 'WAREHOUSE' } });
  if (!warehouse) return console.log('No warehouse location found.');

  const balances = await prisma.inventoryBalance.findMany({
    where: { locationId: warehouse.id },
    include: { item: true }
  });

  let newAlerts = 0;
  for (const bal of balances) {
    const item = bal.item;
    if (item.type !== 'grocery') continue;
    
    // threshold logic from lib/inventory/threshold.ts
    let threshold = item.reorderThresholdValue || 5;
    if (item.reorderThresholdType === 'PACK' && item.packEnabled && item.packSize) {
      threshold = item.reorderThresholdValue * item.packSize;
    }
    threshold = Math.max(threshold, 10);
    
    if (bal.onHandBaseUnits < threshold) {
      const existingAlert = await prisma.inventoryAlert.findFirst({
        where: { itemId: item.id, locationId: warehouse.id, acknowledgedAt: null }
      });
      if (!existingAlert) {
        await prisma.inventoryAlert.create({
          data: {
            itemId: item.id,
            locationId: warehouse.id,
            severity: 'LOW_STOCK',
            thresholdType: item.reorderThresholdType || 'UNIT',
            thresholdValue: item.reorderThresholdValue || 5,
            currentBaseUnits: bal.onHandBaseUnits
          }
        });
        newAlerts++;
      } else {
        await prisma.inventoryAlert.update({
          where: { id: existingAlert.id },
          data: { currentBaseUnits: bal.onHandBaseUnits }
        });
      }
    }
  }
  console.log(`Synced ${newAlerts} new alerts for low stock items.`);
}

syncAlerts().then(() => prisma.$disconnect()).catch(console.error);
