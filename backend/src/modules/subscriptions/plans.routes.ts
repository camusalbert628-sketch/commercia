import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// GET /api/plans — Liste des plans tarifaires (Accessible publiquement)
router.get('/', async (req: any, res, next) => {
  try {
    let plans = await req.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Seed default plans if none exist
    if (plans.length === 0) {
      const defaultPlans = [
        {
          name: 'free',
          displayName: 'Gratuit',
          description: 'Pour démarrer et tester la gestion simplifiée',
          priceMonthly: 0,
          priceYearly: 0,
          features: JSON.stringify([
            'Ventes & dépenses illimitées (30 jours)',
            'Dashboard financier de base',
            'Calcul du bénéfice journalier',
            'Historique 30 jours',
          ]),
          limits: JSON.stringify({ salesPerMonth: 100, aiQueries: 5, historyDays: 30, stockEnabled: false }),
          sortOrder: 1,
        },
        {
          name: 'pro',
          displayName: 'Pro',
          description: 'Idéal pour les commerces actifs et gestion des crédits',
          priceMonthly: 5000,
          priceYearly: 50000,
          features: JSON.stringify([
            'Tout le plan Gratuit',
            'Gestion complète des crédits clients',
            'Relances automatiques de dettes',
            'Gestion de stock & alertes ruptures',
            'Copilote IA COMMERCIA (illimité)',
            'Historique illimité et export PDF/Excel',
          ]),
          limits: JSON.stringify({ salesPerMonth: -1, aiQueries: -1, historyDays: -1, stockEnabled: true }),
          sortOrder: 2,
        },
        {
          name: 'business',
          displayName: 'Business Multi-Activités',
          description: 'Pour entrepreneurs avec plusieurs points de vente ou boutiques',
          priceMonthly: 15000,
          priceYearly: 150000,
          features: JSON.stringify([
            'Tout le plan Pro',
            'Multi-activités / boutiques',
            'Comptes employés & gestion des permissions',
            'Rapport hebdomadaire automatique sur WhatsApp',
            'Support prioritaire 7j/7',
          ]),
          limits: JSON.stringify({ salesPerMonth: -1, aiQueries: -1, historyDays: -1, stockEnabled: true, multiShop: true }),
          sortOrder: 3,
        },
      ];

      for (const p of defaultPlans) {
        await req.prisma.plan.create({ data: p });
      }

      plans = await req.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    const formatted = plans.map((p: any) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      currency: p.currency,
      features: JSON.parse(p.features || '[]'),
      limits: JSON.parse(p.limits || '{}'),
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// GET /api/plans/my-subscription — Abonnement actuel
router.get('/my-subscription', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sub = await req.prisma.subscription.findUnique({
      where: { userId: req.userId },
      include: { plan: true },
    });

    if (!sub) {
      return res.json({
        plan: 'free',
        displayName: 'Gratuit',
        status: 'active',
        features: [],
      });
    }

    res.json({
      id: sub.id,
      plan: sub.plan.name,
      displayName: sub.plan.displayName,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      features: JSON.parse(sub.plan.features || '[]'),
      limits: JSON.parse(sub.plan.limits || '{}'),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/plans/subscribe — Souscrire à un plan (Simulation Mobile Money MTN / Orange)
router.post('/subscribe', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      planName: z.enum(['free', 'pro', 'business']),
      paymentMethod: z.enum(['mobile_money', 'card', 'cash']).default('mobile_money'),
      phoneNumber: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const plan = await req.prisma.plan.findUnique({ where: { name: data.planName } });
    if (!plan) throw new AppError('Plan introuvable.', 404);

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await req.prisma.subscription.upsert({
      where: { userId: req.userId! },
      update: {
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        endDate,
      },
      create: {
        userId: req.userId!,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        endDate,
      },
      include: { plan: true },
    });

    // Record payment
    if (plan.priceMonthly > 0) {
      await req.prisma.payment.create({
        data: {
          userId: req.userId!,
          amount: plan.priceMonthly,
          currency: plan.currency,
          method: data.paymentMethod,
          status: 'completed',
          reference: `PAY-${Date.now()}-${data.paymentMethod.toUpperCase()}`,
        },
      });
    }

    res.json({
      message: `Félicitations ! Vous êtes désormais abonné au plan ${plan.displayName} 🎉`,
      subscription: {
        plan: plan.name,
        displayName: plan.displayName,
        status: subscription.status,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

export { router as plansRouter };
