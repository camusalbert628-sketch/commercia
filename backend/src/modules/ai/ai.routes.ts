import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
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

// POST /api/ai/chat — Copilote interactif guidant le commerçant
router.post('/chat', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      message: z.string().min(1, 'Message requis'),
      conversationId: z.string().optional(),
      history: z.array(z.object({
        role: z.string(),
        content: z.string(),
      })).optional(),
    });
    const data = schema.parse(req.body);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    // Charger les données financières réelles pour le contexte
    const [
      salesToday,
      expensesToday,
      salesWeek,
      expensesWeek,
      debtors,
      lowStockProducts,
      topProducts,
    ] = await Promise.all([
      req.prisma.sale.findMany({
        where: { businessId, saleDate: { gte: startOfToday } },
        include: { items: true },
      }),
      req.prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: startOfToday } },
      }),
      req.prisma.sale.findMany({
        where: { businessId, saleDate: { gte: startOfWeek } },
        include: { items: true },
      }),
      req.prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: startOfWeek } },
      }),
      req.prisma.customer.findMany({
        where: { businessId, totalOwed: { gt: 0 } },
        orderBy: { totalOwed: 'desc' },
        take: 5,
      }),
      req.prisma.product.findMany({
        where: { businessId, isActive: true, quantity: { lte: 5 } },
        take: 5,
      }),
      req.prisma.saleItem.groupBy({
        by: ['name'],
        where: { sale: { businessId, saleDate: { gte: startOfWeek } } },
        _sum: { totalPrice: true, quantity: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 3,
      }),
    ]);

    const metricsToday = calculateFinancialMetrics({
      sales: salesToday,
      expenses: expensesToday,
    });

    const metricsWeek = calculateFinancialMetrics({
      sales: salesWeek,
      expenses: expensesWeek,
    });

    const totalDebt = debtors.reduce((sum: number, d: any) => sum + d.totalOwed, 0);

    const lower = data.message.toLowerCase();
    let reply = '';

    if (lower.includes('bénéfice') || lower.includes('profit') || lower.includes('combien j\'ai gagné') || lower.includes('gagné')) {
      reply = `📊 **Situation de vos bénéfices :**\n\n` +
        `• **Aujourd'hui** : Chiffre d'affaires de **${metricsToday.revenue.toLocaleString('fr-FR')} FCFA** et dépenses de **${(metricsToday.operatingExpenses + metricsToday.inventoryExpenses).toLocaleString('fr-FR')} FCFA**.\n` +
        `• **Bénéfice net estimé du jour** : **${metricsToday.estimatedNetProfit.toLocaleString('fr-FR')} FCFA** (Taux de marge brute : ${metricsToday.grossMarginPercent}%).\n` +
        `• **Sur les 7 derniers jours** : Ventes totales de **${metricsWeek.revenue.toLocaleString('fr-FR')} FCFA** pour un bénéfice de **${metricsWeek.estimatedNetProfit.toLocaleString('fr-FR')} FCFA**.\n\n` +
        `💡 ${metricsToday.estimatedNetProfit >= 0 ? "Votre journée est positive ! Maintenez ce rythme." : "Attention, vos dépenses dépassent vos ventes aujourd'hui."}`;
    } else if (lower.includes('dette') || lower.includes('crédit') || lower.includes('qui me doit') || lower.includes('doit')) {
      if (debtors.length > 0) {
        const list = debtors.map((d: any) => `• **${d.name}** : ${d.totalOwed.toLocaleString('fr-FR')} FCFA${d.phone ? ` (${d.phone})` : ''}`).join('\n');
        reply = `👥 **Argent en attente chez vos clients :**\n\n` +
          `Au total, vous avez **${totalDebt.toLocaleString('fr-FR')} FCFA** dehors auprès de ${debtors.length} client(s) :\n\n${list}\n\n` +
          `💡 **Conseil du Copilote** : Depuis l'onglet *Clients*, utilisez le bouton vert WhatsApp pour envoyer un rappel amical en 1 clic !`;
      } else {
        reply = `🎉 **Excellente nouvelle !** Aucun client ne vous doit de l'argent actuellement. Votre trésorerie est 100% sécurisée.`;
      }
    } else if (lower.includes('dépense') || lower.includes('charge') || lower.includes('où part')) {
      reply = `💸 **Analyse de vos dépenses :**\n\n` +
        `• Dépenses du jour : **${(metricsToday.operatingExpenses + metricsToday.inventoryExpenses).toLocaleString('fr-FR')} FCFA** (Fonctionnement : ${metricsToday.operatingExpenses.toLocaleString('fr-FR')} FCFA, Achats stock : ${metricsToday.inventoryExpenses.toLocaleString('fr-FR')} FCFA).\n` +
        `• Dépenses des 7 derniers jours : **${(metricsWeek.operatingExpenses + metricsWeek.inventoryExpenses).toLocaleString('fr-FR')} FCFA**.\n\n` +
        `💡 **Règle d'or** : Veillez à ce que vos charges opérationnelles (loyer, transport, électricité) ne dépassent pas 25% à 30% de votre chiffre d'affaires.`;
    } else if (lower.includes('stock') || lower.includes('rupture') || lower.includes('produit')) {
      if (lowStockProducts.length > 0) {
        const list = lowStockProducts.map((p: any) => `• **${p.name}** : reste **${p.quantity}** ${p.unit || 'unités'} (alerte : <= ${p.lowStockAlert})`).join('\n');
        reply = `⚠️ **Alertes de stock critique :**\n\n${list}\n\n` +
          `💡 Pensez à réapprovisionner ces articles rapidement pour éviter de rater des ventes !`;
      } else {
        reply = `📦 **Vos stocks sont sous contrôle !** Aucun produit n'a atteint le seuil d'alerte critique.`;
      }
    } else if (lower.includes('conseil') || lower.includes('améliorer') || lower.includes('booster') || lower.includes('stratégie')) {
      const bestProduct = topProducts[0]?.name || 'vos articles phares';
      reply = `🚀 **3 actions concrètes pour maximiser vos revenus :**\n\n` +
        `1. **Misez sur vos meilleures ventes** : *${bestProduct}* génère vos plus fortes rentrées. Assurez-vous d'en avoir toujours en réserve.\n` +
        `2. **Recouvrez vos créances** : Vous avez ${totalDebt.toLocaleString('fr-FR')} FCFA en attente. En récupérer ne serait-ce que la moitié injectera immédiatement des liquidités.\n` +
        `3. **Pointez votre caisse chaque soir** : Utilisez le module *Caisse Journalière* pour rapprocher espèces et Mobile Money et éliminer tout écart.`;
    } else {
      reply = `Bonjour ! Je suis votre Copilote Financier COMMERCIA 🤖.\n\n` +
        `Voici un coup d'œil rapide sur votre activité :\n` +
        `• Ventes aujourd'hui : **${metricsToday.revenue.toLocaleString('fr-FR')} FCFA**\n` +
        `• Bénéfice estimé : **${metricsToday.estimatedNetProfit.toLocaleString('fr-FR')} FCFA**\n` +
        `• Créances clients : **${totalDebt.toLocaleString('fr-FR')} FCFA**\n\n` +
        `Que souhaitez-vous analyser ? (Exemples : *"Quel est mon bénéfice réel ?"*, *"Qui me doit de l'argent ?"*, *"Alerte stock"*, *"Conseils pour booster mes ventes"*).`;
    }

    res.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

export { router as aiRouter };
