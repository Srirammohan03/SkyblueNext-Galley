const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  const locs = await prisma.inventoryLocation.findMany();
  console.log("Locations:", locs);
  
  let warehouse = locs.find(l => l.type === 'WAREHOUSE');
  if (!warehouse && locs.length > 0) {
    warehouse = locs[0];
    console.log("No explicit WAREHOUSE found, using first location:", warehouse.name);
  }
  
  if (!warehouse) {
    // Create one if absolutely needed
    warehouse = await prisma.inventoryLocation.create({
      data: { name: 'Main Warehouse', type: 'WAREHOUSE' }
    });
    console.log("Created Main Warehouse location.");
  }

  const items = await prisma.catalogItem.findMany({ where: { type: 'grocery' } });
  let count = 0;
  for (const item of items) {
    if (item.defaultQty !== null) {
      const balId = `${warehouse.id}_${item.id}`;
      await prisma.inventoryBalance.upsert({
        where: { id: balId },
        update: { onHandBaseUnits: item.defaultQty },
        create: { id: balId, locationId: warehouse.id, itemId: item.id, onHandBaseUnits: item.defaultQty }
      });
      count++;
    }
  }
  console.log('Synced ' + count + ' items to warehouse inventory balances.');
}
sync().then(() => prisma.$disconnect()).catch(console.error);
