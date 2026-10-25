import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL LOT CAMPAIGNS ---');
  const campaigns = await prisma.commercialLotCampaign.findMany({
    include: {
      items: true,
      sales: {
        include: { items: true }
      },
      movements: true
    }
  });
  console.log(JSON.stringify(campaigns, null, 2));

  console.log('--- RECENT REGULAR SALES (Ventes Comptoir) ---');
  const regularSales = await prisma.sale.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: { product: true }
      }
    }
  });
  console.log(JSON.stringify(regularSales, null, 2));

  console.log('--- RECENT PRODUCTS ---');
  const products = await prisma.product.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(products, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
