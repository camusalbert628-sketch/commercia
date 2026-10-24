import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';
import { paymentGateway } from '../payments/paymentGateway';

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

    // Cas 2 : Formule payante (Pro ou Business)
    // RÈGLE STRICTE : Le compte reste FREE tant que le paiement n'est pas confirmé par le webhook / prestataire.
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

    const timestamp = Date.now();
    const reference = `COMMERCIA-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;

    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'http';
    const returnUrl = `${protocol}://${host}/subscription?payment_ref=${reference}`;
    const notifyUrl = `${protocol}://${host}/api/payments/webhook`;

    // Enregistrer la transaction avec statut STRICTEMENT PENDING
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

    // Appel à la passerelle de paiement
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
      message: 'Demande de paiement initiée. La formule Pro sera activée dès confirmation effective du paiement.',
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

export { router as subscriptionRouter };
