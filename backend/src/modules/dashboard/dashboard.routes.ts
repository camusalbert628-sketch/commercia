import { Router } from 'express';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

async function getBusinessId(req: AuthRequest): Promise<string> {
  const member = await req.prisma.businessMember.findFirst({
    where: { userId: req.userId, isActive: true },
  });
  if (!member) throw new AppError('Aucune activité trouvée.', 404);
  return member.businessId;
}

// GET /api/dashboard — Synthèse complète du tableau de bord
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getBusinessId(req);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Queries in parallel
    const [
      todaySales,
      todayExpenses,
      weekSales,
      weekExpenses,
      monthSales,
      monthExpenses,
      recentSales,
      recentExpenses,
      customersWithDebt,
      lowStockProducts,
      insights,
    ] = await Promise.all([
      // Today sales
      req.prisma.sale.aggregate({
        where: { businessId, saleDate: { gte: startOfToday, lte: endOfToday } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: { id: true },
      }),
      // Today expenses
      req.prisma.expense.aggregate({
        where: { businessId, expenseDate: { gte: startOfToday, lte: endOfToday } },
        _sum: { amount: true },
      }),
      // Week sales
      req.prisma.sale.aggregate({
        where: { businessId, saleDate: { gte: startOfWeek } },
        _sum: { totalAmount: true },
      }),
      // Week expenses
      req.prisma.expense.aggregate({
        where: { businessId, expenseDate: { gte: startOfWeek } },
        _sum: { amount: true },
      }),
      // Month sales
      req.prisma.sale.aggregate({
        where: { businessId, saleDate: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      // Month expenses
      req.prisma.expense.aggregate({
        where: { businessId, expenseDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // Recent sales (last 5)
      req.prisma.sale.findMany({
        where: { businessId },
        take: 5,
        orderBy: { saleDate: 'desc' },
        include: { items: true, customer: true },
      }),
      // Recent expenses (last 5)
      req.prisma.expense.findMany({
        where: { businessId },
        take: 5,
        orderBy: { expenseDate: 'desc' },
        include: { expenseCategory: true },
      }),
      // Customers with debt
      req.prisma.customer.aggregate({
        where: { businessId, totalOwed: { gt: 0 } },
        _sum: { totalOwed: true },
        _count: { id: true },
      }),
      // Low stock count
      req.prisma.product.count({
        where: {
          businessId,
          isActive: true,
          quantity: { lte: 5 },
        },
      }),
      // AI insights
      ((req.prisma.aIInsight || req.prisma.aiInsight) ? (req.prisma.aIInsight || req.prisma.aiInsight).findMany({
        where: { businessId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }) : Promise.resolve([])),
    ]);

    const salesTodayVal = todaySales._sum.totalAmount || 0;
    const expensesTodayVal = todayExpenses._sum.amount || 0;
    const profitTodayVal = salesTodayVal - expensesTodayVal;

    const salesWeekVal = weekSales._sum.totalAmount || 0;
    const expensesWeekVal = weekExpenses._sum.amount || 0;
    const profitWeekVal = salesWeekVal - expensesWeekVal;

    const salesMonthVal = monthSales._sum.totalAmount || 0;
    const expensesMonthVal = monthExpenses._sum.amount || 0;
    const profitMonthVal = salesMonthVal - expensesMonthVal;

    // Build smart actionable advice
    const dynamicInsights = [...insights];
    if (dynamicInsights.length === 0) {
      if (salesTodayVal > 0 && profitTodayVal > 0) {
        dynamicInsights.push({
          id: 'auto-1',
          businessId,
          type: 'profitability',
          title: 'Journée profitable',
          message: `Bravo ! Vous dégagez un bénéfice net estimé de ${profitTodayVal.toLocaleString('fr-FR')} FCFA aujourd'hui.`,
          severity: 'success',
          isRead: false,
          createdAt: new Date(),
          expiresAt: null,
        });
      } else if (salesTodayVal === 0) {
        dynamicInsights.push({
          id: 'auto-2',
          businessId,
          type: 'opportunity',
          title: 'Prêt pour la journée ?',
          message: 'Enregistrez votre première vente dès qu\'un client passe commande.',
          severity: 'info',
          isRead: false,
          createdAt: new Date(),
          expiresAt: null,
        });
      }

      if ((customersWithDebt._sum.totalOwed || 0) > 0) {
        dynamicInsights.push({
          id: 'auto-3',
          businessId,
          type: 'credit',
          title: 'Crédits en attente',
          message: `Vous avez ${(customersWithDebt._sum.totalOwed || 0).toLocaleString('fr-FR')} FCFA à recouvrer auprès de ${customersWithDebt._count.id} client(s).`,
          severity: 'warning',
          isRead: false,
          createdAt: new Date(),
          expiresAt: null,
        });
      }
    }

    res.json({
      today: {
        sales: salesTodayVal,
        salesCount: todaySales._count.id,
        expenses: expensesTodayVal,
        profit: profitTodayVal,
      },
      week: {
        sales: salesWeekVal,
        expenses: expensesWeekVal,
        profit: profitWeekVal,
      },
      month: {
        sales: salesMonthVal,
        expenses: expensesMonthVal,
        profit: profitMonthVal,
      },
      debt: {
        total: customersWithDebt._sum.totalOwed || 0,
        customerCount: customersWithDebt._count.id,
      },
      stockAlertsCount: lowStockProducts,
      recentTransactions: {
        sales: recentSales,
        expenses: recentExpenses,
      },
      insights: dynamicInsights,
    });
  } catch (error) {
    next(error);
  }
});

export { router as dashboardRouter };
