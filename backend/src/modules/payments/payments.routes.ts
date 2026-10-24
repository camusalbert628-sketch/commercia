import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { paymentGateway } from './paymentGateway';
import { activateUserSubscription, getUserSubscriptionDetails } from '../../utils/subscriptionUtils';

const router = Router();

// 1. INITIATION D'UN PAIEMENT D'ABONNEMENT
// POST /api/payments/initiate
router.post('/initiate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      planName: z.enum(['pro', 'business']),
      billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
      paymentMethod: z.enum(['mobile_money', 'card']).default('mobile_money'),
      phoneNumber: z.string().optional(),
      promoCode: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    const plan = await req.prisma.plan.findUnique({ where: { name: data.planName } });
    if (!plan) {
      throw new AppError('Plan tarifaire sélectionné introuvable.', 404);
    }

    // Calcul du tarif
    const isYearly = data.billingCycle === 'yearly';
    const basePrice = isYearly
      ? (plan.priceYearly > 0 ? plan.priceYearly : plan.priceMonthly * 10)
      : plan.priceMonthly;

    let finalAmount = basePrice;
    let promoDiscount = 0;

    if (data.promoCode) {
      const code = data.promoCode.trim().toUpperCase();
      if (code === 'COMMERCIA20') {
        promoDiscount = Math.round(basePrice * 0.2);
        finalAmount = basePrice - promoDiscount;
      } else if (code === 'BIENVENUE5000') {
        promoDiscount = Math.min(basePrice, 5000);
        finalAmount = Math.max(0, basePrice - promoDiscount);
      }
    }

    // Génération de référence unique et idempotente
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `COMMERCIA-${timestamp}-${randomSuffix}`;

    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'http';
    const returnUrl = `${protocol}://${host}/subscription?payment_ref=${reference}`;
    const notifyUrl = `${protocol}://${host}/api/payments/webhook`;

    // Enregistrement de la transaction avec statut STRICTEMENT PENDING
    // À ce stade, le compte utilisateur reste FREE !
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
          basePrice,
          promoDiscount,
          promoCode: data.promoCode || null,
          initiatedAt: new Date().toISOString(),
        }),
      },
    });

    // Appel passerelle
    const gatewayResult = await paymentGateway.initiatePayment({
      userId: user.id,
      planName: data.planName,
      billingCycle: data.billingCycle,
      amount: finalAmount,
      currency: plan.currency || 'XAF',
      paymentMethod: data.paymentMethod,
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
      message: 'Demande de paiement initiée. Veuillez valider la transaction.',
      reference,
      amount: finalAmount,
      currency: plan.currency || 'XAF',
      status: 'pending',
      checkoutUrl: gatewayResult.checkoutUrl,
      providerReference: gatewayResult.providerReference,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// 2. WEBHOOK SÉCURISÉ & IDEMPOTENT DU FOURNISSEUR DE PAIEMENT
// POST /api/payments/webhook
router.post('/webhook', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-cinetpay-signature'] as string | undefined;
    const payload = req.body;

    const reference = payload.cpm_trans_id || payload.transaction_id || payload.reference;
    if (!reference) {
      return res.status(400).json({ error: 'Identifiant de transaction manquant dans le webhook.' });
    }

    // Vérification de signature
    const isValidSignature = paymentGateway.verifyWebhookSignature(payload, signature);
    if (!isValidSignature) {
      console.warn(`[Webhook Alerte Sécurité] Signature invalide pour la référence ${reference}`);
      return res.status(403).json({ error: 'Signature du webhook non authentifiée.' });
    }

    // Recherche de la transaction en base
    const payment = await req.prisma.payment.findUnique({
      where: { reference },
      include: { user: true, plan: true },
    });

    if (!payment) {
      console.warn(`[Webhook Warning] Transaction introuvable pour la référence ${reference}`);
      return res.status(404).json({ error: 'Transaction non trouvée.' });
    }

    // IDEMPOTENCE : Si la transaction a déjà été confirmée, ne pas re-créditer ni doubler
    if (payment.status === 'completed') {
      return res.status(200).json({
        message: 'Transaction déjà traitée avec succès (Idempotence respectée).',
        status: 'completed',
      });
    }

    // Vérification active serveur-à-serveur auprès du provider
    const directVerification = await paymentGateway.verifyPaymentStatus(reference, payload.cpm_site_id);
    const isPaymentConfirmed =
      directVerification.status === 'completed' ||
      payload.cpm_result === '00' ||
      payload.status === 'ACCEPTED' ||
      payload.status === 'completed';

    const isPaymentFailed =
      directVerification.status === 'failed' ||
      payload.cpm_result === '662' ||
      payload.status === 'REFUSED' ||
      payload.status === 'failed' ||
      payload.status === 'cancelled';

    if (isPaymentConfirmed) {
      // 1. Mettre à jour le paiement
      const updatedPayment = await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          providerReference: directVerification.providerReference || payload.cpm_payid || null,
          verifiedAt: new Date(),
          metadata: JSON.stringify({
            ...(payment.metadata ? JSON.parse(payment.metadata) : {}),
            webhookReceivedAt: new Date().toISOString(),
            rawWebhook: payload,
          }),
        },
      });

      // 2. Déterminer la durée de l'abonnement
      let meta: any = {};
      try {
        meta = JSON.parse(payment.metadata || '{}');
      } catch (e) {
        meta = {};
      }
      const durationDays = meta.billingCycle === 'yearly' ? 365 : 30;
      const targetPlanName = (payment.plan?.name as 'pro' | 'business') || 'pro';

      // 3. Activer le statut Pro de manière centralisée et sécurisée
      await activateUserSubscription(req.prisma, {
        userId: payment.userId,
        planName: targetPlanName,
        durationDays,
        paymentId: updatedPayment.id,
        provider: payment.provider,
        transactionReference: reference,
      });

      return res.status(200).json({
        success: true,
        message: 'Paiement confirmé et abonnement Pro activé avec succès.',
      });
    } else if (isPaymentFailed) {
      await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage: payload.cpm_error_message || 'Paiement refusé ou annulé par l\'opérateur.',
          metadata: JSON.stringify({
            ...(payment.metadata ? JSON.parse(payment.metadata) : {}),
            webhookFailedAt: new Date().toISOString(),
            rawWebhook: payload,
          }),
        },
      });

      // L'utilisateur reste GRATUIT (Free). Aucune activation n'a lieu.
      return res.status(200).json({
        success: false,
        message: 'Paiement marqué comme échoué. Le compte utilisateur reste au statut Gratuit.',
      });
    }

    // Statut en attente (pending)
    res.status(200).json({ message: 'Transaction toujours en attente.' });
  } catch (error) {
    next(error);
  }
});

// 3. CONFIRMATION DE TEST SANDBOX (Contrôle d'intégrité et tests automatisés)
// POST /api/payments/confirm-sandbox
router.post('/confirm-sandbox', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      reference: z.string(),
      outcome: z.enum(['success', 'failure', 'pending']),
    });

    const { reference, outcome } = schema.parse(req.body);

    const payment = await req.prisma.payment.findUnique({
      where: { reference },
      include: { plan: true },
    });

    if (!payment) {
      throw new AppError('Paiement introuvable pour cette référence.', 404);
    }

    // Vérification de possession : l'utilisateur doit être le propriétaire ou admin
    const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
    if (payment.userId !== req.userId && !user?.isAdmin) {
      throw new AppError('Accès non autorisé à cette transaction.', 403);
    }

    // Idempotence : si déjà complété et qu'on redemande success, pas de double activation
    if (payment.status === 'completed' && outcome === 'success') {
      return res.json({
        message: 'Transaction déjà confirmée et active (Idempotence respectée).',
        payment,
      });
    }

    if (outcome === 'success') {
      const updatedPayment = await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          verifiedAt: new Date(),
          providerReference: `SANDBOX-OK-${Date.now()}`,
        },
      });

      let meta: any = {};
      try {
        meta = JSON.parse(payment.metadata || '{}');
      } catch (e) {
        meta = {};
      }
      const durationDays = meta.billingCycle === 'yearly' ? 365 : 30;
      const targetPlanName = (payment.plan?.name as 'pro' | 'business') || 'pro';

      await activateUserSubscription(req.prisma, {
        userId: payment.userId,
        planName: targetPlanName,
        durationDays,
        paymentId: updatedPayment.id,
        provider: 'sandbox_cinetpay',
        transactionReference: reference,
      });

      return res.json({
        message: 'Paiement confirmé avec succès ! Compte Pro activé.',
        payment: updatedPayment,
      });
    } else if (outcome === 'failure') {
      const failedPayment = await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage: 'Transaction refusée lors du test de validation.',
        },
      });

      return res.json({
        message: 'Paiement échoué. Le compte reste strictement gratuit.',
        payment: failedPayment,
      });
    }

    res.json({
      message: 'Transaction maintenue en attente.',
      payment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// 4. VÉRIFICATION DE STATUT D'UN PAIEMENT
// GET /api/payments/verify/:reference
router.get('/verify/:reference', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payment = await req.prisma.payment.findUnique({
      where: { reference: req.params.reference },
      include: { plan: true },
    });

    if (!payment) {
      throw new AppError('Paiement introuvable.', 404);
    }

    const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId!);

    res.json({
      payment: {
        id: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: payment.createdAt,
        verifiedAt: payment.verifiedAt,
      },
      subscription: subDetails,
    });
  } catch (error) {
    next(error);
  }
});

// 5. HISTORIQUE DES TRANSACTIONS DE L'UTILISATEUR
// GET /api/payments/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await req.prisma.payment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    const receipts = payments.map((p: any) => {
      let meta: any = {};
      try {
        meta = JSON.parse(p.metadata || '{}');
      } catch (e) {
        meta = {};
      }

      return {
        id: p.id,
        reference: p.reference,
        date: p.createdAt,
        amount: p.amount,
        currency: p.currency,
        planName: p.plan?.displayName || 'Plan Pro',
        method: p.method === 'mobile_money' ? 'Mobile Money (MTN / Orange)' : 'Carte Bancaire',
        status: p.status, // pending, completed, failed, refunded
        phoneNumber: p.phoneNumber,
        billingCycle: meta.billingCycle === 'yearly' ? 'Annuel' : 'Mensuel',
        verifiedAt: p.verifiedAt,
      };
    });

    res.json(receipts);
  } catch (error) {
    next(error);
  }
});

export { router as paymentsRouter };
