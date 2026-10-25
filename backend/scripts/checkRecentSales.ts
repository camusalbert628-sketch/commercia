import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.commercialLotCampaign.findMany({
    select: {
      id: true,
      businessId: true,
      name: true,
      goodsType: true,
      totalLandedCost: true,
      items: true,
      sales: {
        include: { items: true }
      }
    }
  });
  console.log('CAMPAIGNS COUNT:', campaigns.length);
  console.log(JSON.stringify(campaigns, null, 2));

  const allSalesCount = await prisma.sale.count();
  console.log('TOTAL REGULAR SALES COUNT:', allSalesCount);
  
  const allLotSalesCount = await prisma.lotSale.count();
  console.log('TOTAL LOT SALES COUNT:', allLotSalesCount);

  // Check if any sale was created in the last 2 hours
  const recentSales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 4 * 3600 * 1000)
      }
    },
    include: { items: true }
  });
  console.log('RECENT SALES (LAST 4 HOURS):', JSON.stringify(recentSales, null, 2));

  const recentLotSales = await prisma.lotSale.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 4 * 3600 * 1000)
      }
    },
    include: { items: true }
  });
  console.log('RECENT LOT SALES (LAST 4 HOURS):', JSON.stringify(recentLotSales, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
