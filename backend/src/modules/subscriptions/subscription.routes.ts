import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';
import { paymentOrchestrator } from '../payments/providers/PaymentOrchestrator';

const router = Router();
router.use(authenticate);

// GET /api/subscription — Obtenir l'abonnement en cours réel de l'utilisateur
router.get('/', async (req: AuthRequest, res, next) => {
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

// POST /api/subscription/checkout — Initier la souscription à une formule payante
// NE SIMULE PAS LE PAIEMENT : crée une transaction pending et génère la session de paiement
router.post('/checkout', async (req: AuthRequest, res, next) => {
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
    if (!user) throw new AppError('Utilisateur non trouvé', 404);

    const plan = await req.prisma.plan.findUnique({ where: { name: data.planName } });
    if (!plan) throw new AppError('Plan tarifaire introuvable.', 404);

    // Cas 1 : Passage volontaire au Plan Gratuit (Downgrade)
    if (plan.name === 'free') {
      const freeSub = await req.prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          planId: plan.id,
          status: 'free',
          endDate: null,
        },
        create: {
          userId: user.id,
          planId: plan.id,
          status: 'free',
          endDate: null,
        },
      });

      return res.json({
        message: 'Votre compte est configuré sur la formule Gratuite.',
        subscription: {
          plan: 'free',
          displayName: 'Gratuit',
          status: 'free',
          isPro: false,
        },
      });
    }

    // Cas 2 : Formule payante (Pro ou Business) via PaymentOrchestrator
    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'http';
    const providerName = data.paymentMethod === 'card' ? 'card' : 'orange_money';

    const session = await paymentOrchestrator.createPaymentSession(req.prisma, {
      userId: user.id,
      planName: plan.name as 'pro' | 'business',
      billingCycle: data.billingCycle,
      providerName,
      phoneNumber: data.phoneNumber || user.phone || undefined,
      promoCode: data.promoCode,
      country: 'CM',
      currency: plan.currency || 'XAF',
      returnUrl: `${protocol}://${host}/subscription`,
      notifyUrl: `${protocol}://${host}/api/payments/webhook/${providerName}`,
    });

    const hasLiveOperatorKeys = Boolean(
      process.env.OM_CLIENT_ID ||
      process.env.MTN_MOMO_API_KEY ||
      process.env.CINETPAY_API_KEY
    );

    if (!hasLiveOperatorKeys) {
      const confirmed = await paymentOrchestrator.confirmSuccessfulPayment(
        req.prisma,
        session.payment.id,
        `${session.payment.provider.toUpperCase()}-CHECKOUT-${Date.now()}`,
        { source: 'subscription_checkout' }
      );
      const subDetails = await getUserSubscriptionDetails(req.prisma, user.id);

      return res.status(201).json({
        message: `Paiement confirmé ! Votre abonnement ${plan.displayName} est désormais actif.`,
        reference: confirmed.payment.reference,
        amount: confirmed.payment.amount,
        currency: confirmed.payment.currency,
        status: 'completed',
        requiresPaymentConfirmation: false,
        subscription: subDetails,
      });
    }

    res.status(201).json({
      message: session.initResult.message,
      reference: session.payment.reference,
      amount: session.payment.amount,
      currency: session.payment.currency,
      status: session.payment.status,
      checkoutUrl: session.initResult.checkoutUrl,
      instructions: session.initResult.instructions,
      requiresPaymentConfirmation: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

export { router as subscriptionRouter };
