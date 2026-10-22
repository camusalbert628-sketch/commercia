import { Router } from 'express';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { calculateFinancialMetrics } from '../../utils/finance';

const router = Router();
router.use(authenticate);

// GET /api/dashboard — Synthèse financière et commerciale
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Queries in parallel
    const [
      todaySalesList,
      todayExpensesList,
      todayCustomerPayments,
      weekSalesList,
      weekExpensesList,
      monthSalesList,
      monthExpensesList,
      recentSales,
      recentExpenses,
      customersWithDebt,
      lowStockProducts,
      insights,
    ] = await Promise.all([
      // Today sales with items
      req.prisma.sale.findMany({
        where: { businessId, saleDate: { gte: startOfToday, lte: endOfToday } },
        include: { items: true, customer: true },
      }),
      // Today expenses
      req.prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: startOfToday, lte: endOfToday } },
      }),
      // Today customer debt payments (cash entering from credit recovery)
      req.prisma.customerPayment.findMany({
        where: { customer: { businessId }, paidAt: { gte: startOfToday, lte: endOfToday } },
      }),
      // Week sales
      req.prisma.sale.findMany({
        where: { businessId, saleDate: { gte: startOfWeek } },
        include: { items: true },
      }),
      // Week expenses
      req.prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: startOfWeek } },
      }),
      // Month sales
      req.prisma.sale.findMany({
        where: { businessId, saleDate: { gte: startOfMonth } },
        include: { items: true },
      }),
      // Month expenses
      req.prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: startOfMonth } },
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

    // Financial calculations using single source of truth
    const metricsToday = calculateFinancialMetrics({
      sales: todaySalesList,
      expenses: todayExpensesList,
      customerPayments: todayCustomerPayments,
    });

    const metricsWeek = calculateFinancialMetrics({
      sales: weekSalesList,
      expenses: weekExpensesList,
    });

    const metricsMonth = calculateFinancialMetrics({
      sales: monthSalesList,
      expenses: monthExpensesList,
    });

    // Build smart actionable advice
    const dynamicInsights = [...insights];
    if (dynamicInsights.length === 0) {
      if (metricsToday.creditSales > 0 && metricsToday.cashCollected < metricsToday.creditSales) {
        dynamicInsights.push({
          id: 'auto-credit-alert',
          businessId,
          type: 'credit',
          title: 'Ventes à crédit détectées',
          message: `Vous avez ${metricsToday.creditSales.toLocaleString('fr-FR')} FCFA de ventes à crédit aujourd'hui non encore encaissées. Votre trésorerie réelle encaissée est de ${metricsToday.cashCollected.toLocaleString('fr-FR')} FCFA.`,
          severity: 'warning',
          isRead: false,
          createdAt: new Date(),
          expiresAt: null,
        });
      } else if (metricsToday.revenue > 0 && metricsToday.estimatedNetProfit > 0) {
        dynamicInsights.push({
          id: 'auto-1',
          businessId,
          type: 'profitability',
          title: 'Journée profitable',
          message: `Bravo ! Vous dégagez un bénéfice net estimé de ${metricsToday.estimatedNetProfit.toLocaleString('fr-FR')} FCFA aujourd'hui (Marge brute : ${metricsToday.grossMarginPercent}%).`,
          severity: 'success',
          isRead: false,
          createdAt: new Date(),
          expiresAt: null,
        });
      } else if (metricsToday.revenue === 0) {
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
        revenue: metricsToday.revenue,
        sales: metricsToday.revenue, // rétrocompatibilité
        salesCount: todaySalesList.length,
        cashCollected: metricsToday.cashCollected,
        creditSales: metricsToday.creditSales,
        cogs: metricsToday.cogs,
        grossProfit: metricsToday.grossProfit,
        grossMarginPercent: metricsToday.grossMarginPercent,
        operatingExpenses: metricsToday.operatingExpenses,
        inventoryExpenses: metricsToday.inventoryExpenses,
        personalWithdrawals: metricsToday.personalWithdrawals,
        expenses: metricsToday.operatingExpenses + metricsToday.inventoryExpenses,
        profit: metricsToday.estimatedNetProfit,
        netCashFlow: metricsToday.netCashFlow,
        whyExplanation: metricsToday.whyExplanation,
      },
      week: {
        revenue: metricsWeek.revenue,
        sales: metricsWeek.revenue,
        cashCollected: metricsWeek.cashCollected,
        expenses: metricsWeek.operatingExpenses + metricsWeek.inventoryExpenses,
        profit: metricsWeek.estimatedNetProfit,
        netCashFlow: metricsWeek.netCashFlow,
        whyExplanation: metricsWeek.whyExplanation,
      },
      month: {
        revenue: metricsMonth.revenue,
        sales: metricsMonth.revenue,
        cashCollected: metricsMonth.cashCollected,
        expenses: metricsMonth.operatingExpenses + metricsMonth.inventoryExpenses,
        profit: metricsMonth.estimatedNetProfit,
        netCashFlow: metricsMonth.netCashFlow,
        whyExplanation: metricsMonth.whyExplanation,
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
