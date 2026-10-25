import { PrismaClient } from '@prisma/client';
import { calculateLotFinancials, calculateDepletionStats } from '../src/modules/lots/lotFinancialEngine';

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.commercialLotCampaign.findUnique({
    where: { id: '2e095d73-cbef-46f4-95e7-44c622434cfd' },
    include: {
      items: true,
      sales: {
        include: { items: { include: { lotItem: true } } }
      },
      expenses: true,
      movements: {
        include: { lotItem: true }
      }
    }
  });

  if (!c) {
    console.log('Not found');
    return;
  }

  const fin = calculateLotFinancials(c, c.items, c.sales, c.expenses);
  const dep = calculateDepletionStats(c, c.items, c.sales);

  console.log('--- FINANCIALS ---');
  console.log('Total Landed Cost:', fin.totalLandedCost);
  console.log('Net Turnover:', fin.salesSummary.netTurnover);
  console.log('Realized Net Profit:', fin.realizedNetProfit);
  console.log('Capital Recovery Rate:', fin.capitalRecovery.capitalRecoveryRate);
  console.log('Remaining to Recover:', fin.capitalRecovery.capitalRemainingToRecover);
  console.log('Units to Breakeven:', fin.capitalRecovery.unitsToBreakeven);
  console.log('Avg Selling Price:', fin.unitAverages.avgSellingPrice);
  console.log('Total Qty Received:', fin.stockValuation.totalQuantityReceived);
  console.log('Total Qty Sold:', fin.stockValuation.totalQuantitySold);
  console.log('Total Qty Remaining:', fin.stockValuation.totalQuantityRemaining);

  console.log('--- DEPLETION STATS ---');
  console.log('Depletion stats:', dep);
}

main().catch(console.error).finally(() => prisma.$disconnect());
