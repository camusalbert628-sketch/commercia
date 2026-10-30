import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId, requireProSubscription } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { calculateFinancialMetrics } from '../../utils/finance';

const router = Router();
router.use(authenticate);

// GET /api/ai/insights — Récupérer les insights financiers générés par le copilote
router.get('/insights', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    // Récupérer les insights persistés non lus en priorité
    let insights = await req.prisma.aIInsight.findMany({
      where: { businessId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Si aucun insight en base, générer dynamiquement des insights fondés sur les données réelles
    if (insights.length === 0) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);

      const [salesToday, expensesToday, debtors, lowStockProducts] = await Promise.all([
        req.prisma.sale.findMany({
          where: { businessId, saleDate: { gte: startOfToday } },
          include: { items: true },
        }),
        req.prisma.expense.findMany({
          where: { businessId, expenseDate: { gte: startOfToday } },
        }),
        req.prisma.customer.findMany({
          where: { businessId, totalOwed: { gt: 0 } },
          orderBy: { totalOwed: 'desc' },
          take: 3,
        }),
        req.prisma.product.findMany({
          where: { businessId, isActive: true, quantity: { lte: 5 } },
          take: 3,
        }),
      ]);

      const metrics = calculateFinancialMetrics({
        sales: salesToday,
        expenses: expensesToday,
      });

      const generated: any[] = [];

      // Alerte Crédits clients
      if (debtors.length > 0) {
        const totalDebt = debtors.reduce((sum: number, d: any) => sum + d.totalOwed, 0);
        generated.push({
          id: 'insight-debt-gen',
          businessId,
          type: 'credit',
          title: 'Créances clients à récupérer',
          message: `${debtors.length} client(s) vous doivent actuellement un total de ${totalDebt.toLocaleString('fr-FR')} FCFA (${debtors.map((d: any) => d.name).join(', ')}). Relancez-les pour sécuriser votre trésorerie.`,
          severity: 'warning',
          isRead: false,
          createdAt: new Date(),
        });
      }

      // Alerte Stock faible
      if (lowStockProducts.length > 0) {
        generated.push({
          id: 'insight-stock-gen',
          businessId,
          type: 'stock',
          title: 'Stock critique détecté',
          message: `Ravitaillement recommandé pour : ${lowStockProducts.map((p: any) => `${p.name} (${p.quantity} restant(s))`).join(', ')}.`,
          severity: 'danger',
          isRead: false,
          createdAt: new Date(),
        });
      }

      // Opportunité ou rentabilité
      if (metrics.revenue > 0) {
        generated.push({
          id: 'insight-profit-gen',
          businessId,
          type: 'profitability',
          title: 'Rentabilité journalière',
          message: `Vous dégagez un bénéfice net estimé de ${metrics.estimatedNetProfit.toLocaleString('fr-FR')} FCFA aujourd'hui. Marge brute : ${metrics.grossMarginPercent}%.`,
          severity: metrics.estimatedNetProfit >= 0 ? 'success' : 'danger',
          isRead: false,
          createdAt: new Date(),
        });
      }

      insights = generated;
    }

    res.json(insights);
  } catch (error) {
    next(error);
  }
});

import { handleCopilotChat } from './copilotService';

// POST /api/ai/chat — Copilote interactif guidant le commerçant (Propulsé par Véritable LLM & RAG Temps Réel)
router.post('/chat', requireProSubscription, async (req: AuthRequest, res, next) => {
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

export { router as aiRouter };

