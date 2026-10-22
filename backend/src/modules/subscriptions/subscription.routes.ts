import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/subscription — Obtenir l'abonnement en cours de l'utilisateur
router.get('/', async (req: AuthRequest, res, next) => {
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
        features: ['Ventes & dépenses illimitées', 'Dashboard financier'],
        limits: { salesPerMonth: 100, aiQueries: 5 },
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

// POST /api/subscription/checkout — Souscrire / Upgrader via Mobile Money ou Carte
router.post('/checkout', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      planName: z.enum(['free', 'pro', 'business']),
      paymentMethod: z.enum(['mobile_money', 'card', 'cash']).default('mobile_money'),
      phoneNumber: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const plan = await req.prisma.plan.findUnique({ where: { name: data.planName } });
    if (!plan) throw new AppError('Plan tarifaire introuvable.', 404);

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

    // Enregistrer la transaction de paiement
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
      message: `Félicitations ! Votre abonnement au plan ${plan.displayName} est activé 🎉`,
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

export { router as subscriptionRouter };
