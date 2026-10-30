import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);


// GET /api/analytics/trends — Tendances de ventes & dépenses
router.get('/trends', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { days = '7' } = req.query as any;
    const numDays = Math.min(90, Math.max(7, parseInt(days) || 7));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (numDays - 1));
    startDate.setHours(0, 0, 0, 0);

    const [sales, expenses] = await Promise.all([
      req.prisma.sale.findMany({
        where: { businessId, saleDate: { gte: startDate } },
        select: { totalAmount: true, saleDate: true },
      }),
      req.prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: startDate } },
        select: { amount: true, expenseDate: true },
      }),
    ]);

    // Aggregate by day
    const dayMap: Record<string, { date: string; sales: number; expenses: number; profit: number }> = {};
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = { date: key, sales: 0, expenses: 0, profit: 0 };
    }

    sales.forEach((s: any) => {
      const key = s.saleDate.toISOString().split('T')[0];
      if (dayMap[key]) dayMap[key].sales += s.totalAmount;
    });

    expenses.forEach((e: any) => {
      const key = e.expenseDate.toISOString().split('T')[0];
      if (dayMap[key]) dayMap[key].expenses += e.amount;
    });

    Object.values(dayMap).forEach((item: any) => {
      item.profit = item.sales - item.expenses;
    });

    res.json(Object.values(dayMap));
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/categories — Répartition des dépenses
router.get('/categories', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const expenses = await req.prisma.expense.groupBy({
      by: ['category'],
      where: { businessId },
      _sum: { amount: true },
    });

    const formatted = expenses.map((e: any) => ({
      category: e.category,
      amount: e._sum.amount || 0,
    })).sort((a: any, b: any) => b.amount - a.amount);

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/top-products — Top produits vendus
router.get('/top-products', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const saleItems = await req.prisma.saleItem.findMany({
      where: { sale: { businessId } },
      select: {
        name: true,
        quantity: true,
        totalPrice: true,
      },
    });

    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    saleItems.forEach((item: any) => {
      if (!productMap[item.name]) {
        productMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      }
      productMap[item.name].quantity += item.quantity;
      productMap[item.name].revenue += item.totalPrice;
    });

    const top = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json(top);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/weekly-report — Rapport hebdomadaire prêt à l'emploi
router.get('/weekly-report', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const [sales, expenses, debt] = await Promise.all([
      req.prisma.sale.aggregate({
        where: { businessId, saleDate: { gte: oneWeekAgo } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      req.prisma.expense.aggregate({
        where: { businessId, expenseDate: { gte: oneWeekAgo } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      req.prisma.customer.aggregate({
        where: { businessId, totalOwed: { gt: 0 } },
        _sum: { totalOwed: true },
      }),
    ]);

    const totalSales = sales._sum.totalAmount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = totalSales - totalExpenses;
    const totalDebt = debt._sum.totalOwed || 0;

    let recommendation = '';
    if (netProfit > 0) {
      recommendation = 'Excellente semaine ! Votre activité génère du cash. Pensez à réinvestir une partie dans vos produits phares.';
    } else if (totalSales === 0) {
      recommendation = 'Aucune vente enregistrée sur les 7 derniers jours. Vérifiez vos stocks et relancez vos clients.';
    } else {
      recommendation = 'Attention : vos dépenses dépassent vos recettes cette semaine. Réduisez les frais annexes.';
    }

    res.json({
      period: {
        from: oneWeekAgo.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      metrics: {
        totalSales,
        salesCount: sales._count.id,
        totalExpenses,
        expensesCount: expenses._count.id,
        netProfit,
        totalDebt,
      },
      recommendation,
    });
  } catch (error) {
    next(error);
  }
});

import { handleCopilotChat } from '../ai/copilotService';

// POST /api/analytics/ai/chat — Copilote financier IA (Propulsé par véritable LLM)
router.post('/ai/chat', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      message: z.string().min(1, 'Message requis'),
      conversationId: z.string().optional(),
      history: z
        .array(
          z.object({
            role: z.string(),
            content: z.string(),
          })
        )
        .optional(),
      userConfig: z
        .object({
          provider: z.enum(['gemini', 'openai', 'groq', 'custom']).optional(),
          model: z.string().optional(),
          apiKey: z.string().optional(),
        })
        .optional(),
    });
    const data = schema.parse(req.body);

    const customApiKey = (req.headers['x-ai-api-key'] ||
      req.headers['x-gemini-api-key'] ||
      req.headers['x-openai-api-key'] ||
      req.headers['x-groq-api-key']) as string | undefined;

    const result = await handleCopilotChat({
      prisma: req.prisma,
      userId: req.userId!,
      businessId,
      message: data.message,
      conversationId: data.conversationId,
      history: (data.history || []) as any,
      userConfig: data.userConfig,
      customApiKey,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

export { router as analyticsRouter };
