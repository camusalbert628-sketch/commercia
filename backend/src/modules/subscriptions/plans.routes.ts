import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';
import { paymentGateway } from '../payments/paymentGateway';

const router = Router();

// GET /api/plans — Liste des plans tarifaires (Accessible publiquement)
router.get('/', async (req: any, res, next) => {
  try {
    let plans = await req.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (plans.length === 0) {
      const defaultPlans = [
        {
          name: 'free',
          displayName: 'Gratuit',
          description: 'Pour démarrer et tester la gestion simplifiée',
          priceMonthly: 0,
          priceYearly: 0,
          features: JSON.stringify([
            '15 ventes par jour maximum',
            'Enregistrement des dépenses de base',
            'Tableau de bord financier simplifié',
            'Calcul du bénéfice journalier estimé',
            'Support communautaire',
          ]),
          limits: JSON.stringify({ salesPerDay: 15, aiQueries: 0, stockEnabled: false, creditEnabled: false }),
          sortOrder: 1,
        },
        {
          name: 'pro',
          displayName: 'Pro',
          description: 'Idéal pour commerces actifs : crédits, stock et copilote',
          priceMonthly: 4500,
          priceYearly: 45000,
          features: JSON.stringify([
            'Ventes et dépenses illimitées',
            'Gestion complète des crédits clients',
            'Relances automatiques de dettes',
            'Gestion de stock & alertes ruptures',
            'Copilote IA COMMERCIA en temps réel',
            'Historique complet et exports',
          ]),
          limits: JSON.stringify({ salesPerDay: -1, aiQueries: -1, stockEnabled: true, creditEnabled: true }),
          sortOrder: 2,
        },
        {
          name: 'business',
          displayName: 'Business Multi-Activités',
          description: 'Pour entrepreneurs avec plusieurs points de vente ou boutiques',
          priceMonthly: 12000,
          priceYearly: 120000,
          features: JSON.stringify([
            'Tout le plan Pro',
            'Multi-boutiques & multi-utilisateurs',
            'Gestion des permissions collaborateurs',
            'Trésorerie prévisionnelle & simulations',
            'Support prioritaire 7j/7 WhatsApp',
          ]),
          limits: JSON.stringify({ salesPerDay: -1, aiQueries: -1, stockEnabled: true, creditEnabled: true, multiShop: true }),
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

// GET /api/plans/my-subscription — Abonnement actuel réel vérifié
router.get('/my-subscription', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const details = await getUserSubscriptionDetails(req.prisma, req.userId!);
    res.json({
      plan: details.planName,
      displayName: details.planDisplayName,
      isPro: details.isPro,
      isAdmin: details.isAdmin,
      status: details.status,
      startDate: details.startDate,
      endDate: details.endDate,
      daysRemaining: details.daysRemaining,
      features: details.features,
      limits: details.limits,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/plans/subscribe — Initier la souscription à une offre
router.post('/subscribe', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      planName: z.enum(['free', 'pro', 'business']),
      billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
      paymentMethod: z.enum(['mobile_money', 'card', 'cash']).default('mobile_money'),
      phoneNumber: z.string().optional(),
      promoCode: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const user = await req.prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new AppError('Utilisateur introuvable', 404);

    const plan = await req.prisma.plan.findUnique({ where: { name: data.planName } });
    if (!plan) throw new AppError('Plan tarifaire introuvable.', 404);

    if (plan.name === 'free') {
      await req.prisma.subscription.upsert({
        where: { userId: user.id },
        update: { planId: plan.id, status: 'free', endDate: null },
        create: { userId: user.id, planId: plan.id, status: 'free', endDate: null },
      });
      return res.json({
        message: 'Votre compte est configuré sur la formule Gratuite.',
        subscription: { plan: 'free', displayName: 'Gratuit', status: 'free', isPro: false },
      });
    }

    // Calcul du montant réel
    const isYearly = data.billingCycle === 'yearly';
    const basePrice = isYearly
      ? (plan.priceYearly > 0 ? plan.priceYearly : plan.priceMonthly * 10)
      : plan.priceMonthly;

    let finalAmount = basePrice;
    if (data.promoCode?.trim().toUpperCase() === 'COMMERCIA20') {
      finalAmount = Math.round(basePrice * 0.8);
    } else if (data.promoCode?.trim().toUpperCase() === 'BIENVENUE5000') {
      finalAmount = Math.max(0, basePrice - 5000);
    }

    const reference = `COMMERCIA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'http';
    const returnUrl = `${protocol}://${host}/subscription?payment_ref=${reference}`;
    const notifyUrl = `${protocol}://${host}/api/payments/webhook`;

    // Enregistrement de la transaction avec statut STRICTEMENT PENDING
    const payment = await req.prisma.payment.create({
      data: {
        userId: user.id,
        planId: plan.id,
        amount: finalAmount,
        currency: plan.currency || 'XAF',
        method: data.paymentMethod,
        provider: 'cinetpay',
        status: 'pending',
        reference,
        phoneNumber: data.phoneNumber || user.phone || null,
        payerEmail: user.email,
        metadata: JSON.stringify({
          planName: plan.name,
          billingCycle: data.billingCycle,
          promoCode: data.promoCode || null,
        }),
      },
    });

    const gatewayResult = await paymentGateway.initiatePayment({
      userId: user.id,
      planName: plan.name as 'pro' | 'business',
      billingCycle: data.billingCycle,
      amount: finalAmount,
      currency: plan.currency || 'XAF',
      paymentMethod: data.paymentMethod === 'card' ? 'card' : 'mobile_money',
      phoneNumber: data.phoneNumber || user.phone || undefined,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
      customerEmail: user.email,
      reference,
      returnUrl,
      notifyUrl,
    });

    if (gatewayResult.checkoutUrl) {
      await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          checkoutUrl: gatewayResult.checkoutUrl,
          providerReference: gatewayResult.providerReference || null,
        },
      });
    }

    res.status(201).json({
      message: 'Demande de paiement initiée. La formule Pro sera activée après confirmation réelle du paiement.',
      reference,
      amount: finalAmount,
      currency: plan.currency || 'XAF',
      status: 'pending',
      checkoutUrl: gatewayResult.checkoutUrl,
      requiresPaymentConfirmation: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

export { router as plansRouter };
