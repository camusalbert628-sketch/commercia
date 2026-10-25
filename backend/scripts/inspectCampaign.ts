import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const camps = await prisma.commercialLotCampaign.findMany({
    include: {
      items: true,
      sales: {
        include: { items: true }
      },
      movements: {
        include: { lotItem: true }
      }
    }
  });

  console.log(`Found ${camps.length} campaigns`);
  for (const c of camps) {
    console.log('ID:', c.id);
    console.log('Name:', c.name);
    console.log('BusinessId:', c.businessId);
    console.log('Invested:', c.totalLandedCost);
    console.log('Items:', c.items.map((i: any) => ({
      name: i.name,
      rec: i.quantityReceived,
      sold: i.quantitySold,
      rem: i.quantityRemaining,
      price: i.estimatedSellingPrice
    })));
    console.log('Sales Count:', c.sales.length);
    for (const s of c.sales) {
      console.log('  Sale:', s.id, 'Total:', s.totalAmount, 'Items:', s.items.map((it: any) => ({ qty: it.quantity, price: it.unitPrice })));
    }
    console.log('Movements Count:', c.movements.length);
    for (const m of c.movements) {
      console.log('  Mov:', m.id, 'Type:', m.type, 'Qty:', m.quantity, 'Item:', m.lotItem?.name);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
