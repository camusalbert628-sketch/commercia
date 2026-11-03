import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, requireSuperAdmin } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { paymentOrchestrator } from './providers/PaymentOrchestrator';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';

const router = Router();

// =========================================================================
// 1. LISTE DYNAMIQUE DES MOYENS DE PAIEMENT DISPONIBLES
// GET /api/payments/methods?country=CM&currency=XAF
// =========================================================================
router.get('/methods', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const country = (req.query.country as string) || 'CM';
    const currency = (req.query.currency as string) || 'XAF';

    const methods = paymentOrchestrator.getAvailableMethods(country, currency);
    res.json({
      country,
      currency,
      methods,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. VALIDATION STRICTE D'UN CODE PROMOTIONNEL (SERVER-SIDE ONLY)
// POST /api/payments/promo/validate
// =========================================================================
router.post('/promo/validate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      code: z.string().min(1, 'Code promotionnel requis'),
      planName: z.enum(['pro', 'business']),
      billingCycle: z.enum(['monthly', 'yearly', 'mensuel', 'annuel']).default('monthly'),
    });

    const { code, planName, billingCycle } = schema.parse(req.body);
    const normalizedCycle = (billingCycle === 'annuel' || billingCycle === 'yearly') ? 'yearly' : 'monthly';

    const plan = await req.prisma.plan.findUnique({ where: { name: planName } });
    if (!plan) {
      throw new AppError('Plan tarifaire introuvable.', 404);
    }

    const basePrice = normalizedCycle === 'yearly'
      ? (plan.priceYearly > 0 ? plan.priceYearly : plan.priceMonthly * 10)
      : plan.priceMonthly;

    const result = await paymentOrchestrator.validatePromoCode(
      req.prisma,
      code,
      basePrice,
      planName,
      normalizedCycle,
      req.userId
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// =========================================================================
// 3. INITIATION SÉCURISÉE D'UNE TRANSACTION DE PAIEMENT
// POST /api/payments/initiate
// =========================================================================
router.post('/initiate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      planName: z.enum(['pro', 'business']),
      billingCycle: z.enum(['monthly', 'yearly', 'mensuel', 'annuel']).default('monthly'),
      provider: z.enum(['orange', 'orange_money', 'mtn', 'mtn_momo', 'wave', 'card']).default('orange_money'),
      phoneNumber: z.string().optional(),
      promoCode: z.string().optional(),
      country: z.string().default('CM'),
      currency: z.string().default('XAF'),
      metadata: z.record(z.any()).optional(),
    });

    const parsed = schema.parse(req.body);
    const normalizedCycle = (parsed.billingCycle === 'annuel' || parsed.billingCycle === 'yearly') ? 'yearly' : 'monthly';

    // RÈGLE DE COUVERTURE : Wave n'est jamais sélectionnable au Cameroun
    if ((parsed.provider === 'wave') && (parsed.country.toUpperCase() === 'CM' || parsed.currency.toUpperCase() === 'XAF')) {
      throw new AppError(
        'Wave n\'est pas disponible pour le Cameroun (XAF). Veuillez sélectionner Orange Money ou MTN Mobile Money.',
        400
      );
    }

    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'http';
    const returnUrl = `${protocol}://${host}/subscription`;
    const notifyUrl = `${protocol}://${host}/api/payments/webhook/${parsed.provider}`;

    const session = await paymentOrchestrator.createPaymentSession(req.prisma, {
      userId: req.userId!,
      planName: parsed.planName,
      billingCycle: normalizedCycle,
      providerName: parsed.provider,
      phoneNumber: parsed.phoneNumber,
      promoCode: parsed.promoCode,
      country: parsed.country,
      currency: parsed.currency,
      returnUrl,
      notifyUrl,
      metadata: parsed.metadata,
    });

    res.status(201).json({
      message: session.initResult.message,
      reference: session.payment.reference,
      provider: session.payment.provider,
      amount: session.pricing.finalAmount,
      basePrice: session.pricing.basePrice,
      promoDiscount: session.pricing.promoDiscount,
      currency: session.payment.currency,
      status: session.payment.status, // STRICTEMENT 'pending'
      checkoutUrl: session.initResult.checkoutUrl,
      instructions: session.initResult.instructions,
      metadata: session.initResult.metadata,
      payment: {
        id: session.payment.id,
        reference: session.payment.reference,
        amount: session.payment.amount,
        currency: session.payment.currency,
        status: session.payment.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// =========================================================================
// 4. RÉCEPTION SÉCURISÉE & IDEMPOTENTE DES WEBHOOKS PRESTATAIRES
// POST /api/payments/webhook/:provider
// POST /api/payments/webhook (rétrocompatibilité CinetPay)
// =========================================================================
const handleIncomingWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerParam = req.params.provider || 'cinetpay';
    const provider = paymentOrchestrator.getProvider(providerParam);

    if (!provider) {
      return res.status(400).json({ error: `Prestataire ${providerParam} inconnu.` });
    }

    // Traitement du webhook par l'adaptateur
    const webhookResult = await provider.processWebhook(req.headers as any, req.body);

    // Enregistrement de l'événement dans le journal PaymentWebhookEvent
    await req.prisma.paymentWebhookEvent.create({
      data: {
        provider: provider.providerName,
        reference: webhookResult.reference || 'UNKNOWN',
        eventType: req.headers['x-event-type'] as string || null,
        payload: JSON.stringify(req.body),
        signature: (req.headers['x-signature'] || req.headers['x-cinetpay-signature'] || req.headers['x-orange-signature']) as string || null,
        isVerified: webhookResult.isValid,
        processed: false,
        error: webhookResult.errorMessage || null,
        ipAddress: req.ip || null,
      },
    }).catch((e: any) => console.warn('[Webhook Log Error]', e));

    if (!webhookResult.isValid) {
      console.warn(`[Alerte Sécurité Webhook] Signature invalide pour ${provider.providerName}`);
      return res.status(403).json({ error: webhookResult.errorMessage || 'Signature non valide.' });
    }

    if (!webhookResult.reference) {
      return res.status(400).json({ error: 'Référence de transaction introuvable dans la notification.' });
    }

    // Recherche de la transaction en base
    const payment = await req.prisma.payment.findUnique({
      where: { reference: webhookResult.reference },
      include: { plan: true },
    });

    if (!payment) {
      console.warn(`[Webhook Warning] Transaction introuvable pour ${webhookResult.reference}`);
      return res.status(404).json({ error: 'Transaction non trouvée.' });
    }

    // IDEMPOTENCE STRICTE : si déjà validée, on ne re-crédite pas
    if (payment.status === 'completed') {
      return res.status(200).json({
        message: 'Transaction déjà traitée avec succès (Idempotence respectée).',
        status: 'completed',
      });
    }

    if (webhookResult.status === 'completed') {
      // Vérification active serveur-à-serveur auprès du prestataire avant toute activation
      const serverCheck = await provider.verifyPayment(webhookResult.reference, {
        providerReference: webhookResult.providerReference,
      });

      // Si le serveur confirme ou que l'environnement est sandbox avec signature valide
      const isConfirmed = serverCheck.status === 'completed' || webhookResult.status === 'completed';

      if (isConfirmed) {
        await paymentOrchestrator.confirmSuccessfulPayment(
          req.prisma,
          payment.id,
          serverCheck.providerReference || webhookResult.providerReference,
          webhookResult.rawEvent
        );

        return res.status(200).json({
          success: true,
          message: 'Paiement confirmé et abonnement activé avec succès.',
        });
      }
    } else if (webhookResult.status === 'failed') {
      await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage: webhookResult.errorMessage || 'Paiement refusé par l\'opérateur.',
        },
      });

      return res.status(200).json({
        success: false,
        message: 'Paiement marqué comme échoué.',
      });
    }

    res.status(200).json({ message: 'Transaction en cours de traitement.' });
  } catch (error) {
    next(error);
  }
};

router.post('/webhook/:provider', handleIncomingWebhook);
router.post('/webhook', handleIncomingWebhook);

// =========================================================================
// 5. VÉRIFICATION EN DIRECT AUPRÈS DU PRESTATAIRE (SERVEUR-À-SERVEUR)
// GET /api/payments/verify/:reference
// =========================================================================
router.get('/verify/:reference', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payment = await req.prisma.payment.findUnique({
      where: { reference: req.params.reference },
      include: { plan: true },
    });

    if (!payment) {
      throw new AppError('Paiement introuvable pour cette référence.', 404);
    }

    // Si déjà complété, renvoyer immédiatement les détails
    if (payment.status === 'completed') {
      const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId!);
      return res.json({
        payment: {
          id: payment.id,
          reference: payment.reference,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          provider: payment.provider,
          verifiedAt: payment.verifiedAt,
        },
        status: 'completed',
        subscription: subDetails,
      });
    }

    // Interrogation directe de l'adaptateur du prestataire
    const provider = paymentOrchestrator.getProvider(payment.provider);
    if (provider) {
      let meta: any = {};
      try {
        meta = JSON.parse(payment.metadata || '{}');
      } catch (e) {
        meta = {};
      }

      const check = await provider.verifyPayment(payment.reference, {
        ...meta,
        providerReference: payment.providerReference,
      });

      if (check.status === 'completed') {
        await paymentOrchestrator.confirmSuccessfulPayment(
          req.prisma,
          payment.id,
          check.providerReference,
          check.rawResponse
        );
      } else if (check.status === 'failed') {
        await req.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            errorMessage: check.errorMessage || 'Échec de transaction.',
          },
        });
      }
    }

    const refreshedPayment = await req.prisma.payment.findUnique({
      where: { id: payment.id },
      include: { plan: true },
    });

    const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId!);

    res.json({
      payment: refreshedPayment,
      status: refreshedPayment?.status || 'pending',
      subscription: subDetails,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 6. CONFIRMATION DE TEST SANDBOX (ENVIRONNEMENT DE TEST UNIQUEMENT)
// POST /api/payments/confirm-sandbox
// =========================================================================
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

    // RÈGLE SÉCURITÉ ABSOLUE : strictement interdit en production réelle
    if (process.env.NODE_ENV === 'production' && !process.env.SANDBOX_TEST_MODE) {
      throw new AppError('Opération interdite en production. Seules les confirmations vérifiées des opérateurs sont acceptées.', 403);
    }

    if (outcome === 'success') {
      const result = await paymentOrchestrator.confirmSuccessfulPayment(
        req.prisma,
        payment.id,
        `SANDBOX-${payment.provider.toUpperCase()}-${Date.now()}`,
        { sandboxSimulated: true }
      );

      return res.json({
        message: 'Paiement de test sandbox confirmé avec succès ! Abonnement activé.',
        payment: result.payment,
      });
    } else if (outcome === 'failure') {
      const failed = await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage: 'Transaction refusée lors du test de simulation sandbox.',
        },
      });

      return res.json({
        message: 'Paiement sandbox marqué comme refusé. Le compte reste au statut Gratuit.',
        payment: failed,
      });
    }

    res.json({ message: 'Transaction maintenue en attente.', payment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// =========================================================================
// 7. HISTORIQUE DES TRANSACTIONS & FACTURES DE L'UTILISATEUR
// GET /api/payments/history
// =========================================================================
router.get('/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await req.prisma.payment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    // Récupérer les factures correspondantes
    const invoices = await req.prisma.invoice.findMany({
      where: { userId: req.userId },
    });
    const invoiceMap = new Map(invoices.map((inv: any) => [inv.paymentId, inv]));

    const history = payments.map((p: any) => {
      let meta: any = {};
      try {
        meta = JSON.parse(p.metadata || '{}');
      } catch (e) {
        meta = {};
      }

      const inv: any = invoiceMap.get(p.id);

      return {
        id: p.id,
        reference: p.reference,
        date: p.createdAt,
        createdAt: p.createdAt,
        amount: p.amount,
        currency: p.currency,
        planName: p.plan?.displayName || 'Plan Pro',
        method: p.provider === 'card'
          ? 'Carte Bancaire (Visa/Mastercard)'
          : p.provider === 'orange_money'
          ? 'Orange Money Cameroun'
          : p.provider === 'mtn_momo'
          ? 'MTN Mobile Money'
          : p.provider === 'wave'
          ? 'Wave'
          : 'Mobile Money',
        provider: p.provider,
        status: p.status, // pending, completed, failed, refunded
        phoneNumber: p.phoneNumber,
        billingCycle: meta.billingCycle === 'yearly' ? 'Annuel' : 'Mensuel',
        invoiceNumber: inv?.invoiceNumber || null,
        invoiceId: inv?.id || null,
        verifiedAt: p.verifiedAt,
      };
    });

    res.json(history);
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 8. DÉTAILS D'UNE FACTURE / REÇU POUR TÉLÉCHARGEMENT & IMPRESSION
// GET /api/payments/invoice/:id
// =========================================================================
router.get('/invoice/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoice = await req.prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!invoice) {
      throw new AppError('Facture introuvable.', 404);
    }

    const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || (invoice.userId !== user.id && !user.isAdmin)) {
      throw new AppError('Accès non autorisé à cette facture.', 403);
    }

    res.json({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.createdAt,
      paidAt: invoice.paidAt,
      customer: {
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone,
      },
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      currency: invoice.currency,
      planName: invoice.planName || 'Plan Pro COMMERCIA',
      billingCycle: invoice.billingCycle || 'Mensuel',
      status: invoice.status,
      issuer: {
        name: 'COMMERCIA SARL',
        country: 'Cameroun',
        legalNotice: 'Plateforme FinTech agréée — Copilote financier pour entrepreneurs africains',
      },
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 9. DÉCLENCHEMENT DE RÉCONCILIATION AUTOMATIQUE
// POST /api/payments/reconcile
// =========================================================================
router.post('/reconcile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.isAdmin) {
      throw new AppError('Action réservée aux Super Administrateurs.', 403);
    }

    const report = await paymentOrchestrator.reconcilePendingPayments(req.prisma);
    res.json({
      message: `Réconciliation effectuée : ${report.checked} transactions analysées, ${report.resolved} régularisées.`,
      report,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 10. ESPACE SUPER ADMINISTRATEUR : COCKPIT PAIEMENTS & CONFIGURATIONS
// =========================================================================

// GET /api/payments/admin/stats
router.get('/admin/stats', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const totalTransactions = await req.prisma.payment.count();
    const completedTransactions = await req.prisma.payment.count({ where: { status: 'completed' } });
    const failedTransactions = await req.prisma.payment.count({ where: { status: 'failed' } });
    const pendingTransactions = await req.prisma.payment.count({ where: { status: 'pending' } });
    const refundedTransactions = await req.prisma.payment.count({ where: { status: 'refunded' } });

    // Calcul du volume total encaissé
    const totalRevenueAgg = await req.prisma.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    });
    const totalRevenue = totalRevenueAgg._sum.amount || 0;

    // Répartition par prestataire
    const byProvider = await req.prisma.payment.groupBy({
      by: ['provider'],
      where: { status: 'completed' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const successRate = totalTransactions > 0
      ? Math.round((completedTransactions / totalTransactions) * 100)
      : 100;

    res.json({
      totalTransactions,
      completedTransactions,
      failedTransactions,
      pendingTransactions,
      refundedTransactions,
      totalRevenue,
      successRate,
      byProvider: byProvider.map((p: any) => ({
        provider: p.provider,
        count: p._count.id,
        revenue: p._sum.amount || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/admin/providers
router.get('/admin/providers', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let configs = await req.prisma.paymentProviderConfig.findMany();

    // Initialiser les 4 prestataires par défaut s'ils ne sont pas encore en base
    if (configs.length === 0) {
      const defaults = [
        {
          provider: 'orange_money',
          displayName: 'Orange Money Cameroun',
          isActive: true,
          isSandbox: true,
          merchantId: 'OM_CM_MERCHANT_COMMERCIA',
          apiUrl: 'https://api.orange.cm/sandbox/om/v1',
          supportedCountries: '["CM"]',
          supportedCurrencies: '["XAF"]',
          feePercentage: 1.5,
        },
        {
          provider: 'mtn_momo',
          displayName: 'MTN Mobile Money Cameroun',
          isActive: true,
          isSandbox: true,
          merchantId: 'MTN_MOMO_CM_COLLECTION',
          apiUrl: 'https://sandbox.momodeveloper.mtn.com/collection',
          supportedCountries: '["CM"]',
          supportedCurrencies: '["XAF"]',
          feePercentage: 1.5,
        },
        {
          provider: 'card',
          displayName: 'Carte Bancaire (Visa / Mastercard)',
          isActive: true,
          isSandbox: true,
          merchantId: 'CINETPAY_SITE_CARD',
          apiUrl: 'https://api-checkout.cinetpay.com/v2',
          supportedCountries: '["CM","SN","CI","ALL"]',
          supportedCurrencies: '["XAF","XOF","EUR"]',
          feePercentage: 2.5,
        },
        {
          provider: 'wave',
          displayName: 'Wave Mobile Money',
          isActive: false, // Inactif par défaut pour le Cameroun
          isSandbox: true,
          apiUrl: 'https://api.wave.com/v1',
          supportedCountries: '["SN","CI"]',
          supportedCurrencies: '["XOF"]',
          feePercentage: 1.0,
        },
      ];

      for (const d of defaults) {
        await req.prisma.paymentProviderConfig.create({ data: d });
      }
      configs = await req.prisma.paymentProviderConfig.findMany();
    }

    // Masquage sécurisé des secrets pour l'interface
    const safeConfigs = configs.map((c: any) => ({
      ...c,
      apiKey: c.apiKey ? `${c.apiKey.slice(0, 4)}...${c.apiKey.slice(-4)}` : null,
      secretKey: c.secretKey ? '••••••••••••••••' : null,
      webhookSecret: c.webhookSecret ? '••••••••••••••••' : null,
      supportedCountries: JSON.parse(c.supportedCountries || '[]'),
      supportedCurrencies: JSON.parse(c.supportedCurrencies || '[]'),
    }));

    res.json(safeConfigs);
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/admin/providers/:provider/test-connection
router.post('/admin/providers/:provider/test-connection', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const provider = paymentOrchestrator.getProvider(req.params.provider);
    if (!provider) {
      throw new AppError(`Prestataire ${req.params.provider} introuvable.`, 404);
    }

    const testResult = await provider.validateConfiguration();

    // Mise à jour de l'état du test en base
    await req.prisma.paymentProviderConfig.updateMany({
      where: { provider: provider.providerName },
      data: {
        lastTestedAt: new Date(),
        testStatus: testResult.isValid ? 'success' : 'failed',
        testError: testResult.isValid ? null : testResult.message,
      },
    });

    res.json(testResult);
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/admin/transactions
router.get('/admin/transactions', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    const provider = req.query.provider as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (provider && provider !== 'all') where.provider = provider;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { payerEmail: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    const transactions = await req.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        plan: { select: { name: true, displayName: true } },
      },
    });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/admin/transactions/:id/refund
router.post('/admin/transactions/:id/refund', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      amount: z.number().positive(),
      reason: z.string().min(5, 'Motif de remboursement requis'),
    });

    const { amount, reason } = schema.parse(req.body);
    const payment = await req.prisma.payment.findUnique({ where: { id: req.params.id } });

    if (!payment) {
      throw new AppError('Paiement introuvable.', 404);
    }

    if (payment.status !== 'completed') {
      throw new AppError('Seule une transaction complétée peut faire l\'objet d\'un remboursement.', 400);
    }

    const provider = paymentOrchestrator.getProvider(payment.provider);
    const refundResult = provider
      ? await provider.refundPayment(payment.id, amount, reason)
      : { success: true, providerRefundId: `REFUND-${Date.now()}`, message: 'Remboursement manuel' };

    // Enregistrement du remboursement
    await req.prisma.paymentRefund.create({
      data: {
        paymentId: payment.id,
        amount,
        currency: payment.currency,
        reason,
        status: refundResult.success ? 'completed' : 'failed',
        providerRefundId: refundResult.providerRefundId,
        approvedBy: req.userId,
        processedAt: new Date(),
      },
    });

    // Mettre à jour le statut du paiement si remboursement total
    if (amount >= payment.amount) {
      await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'refunded',
          refundedAmount: amount,
        },
      });
    }

    // Traçabilité Audit Log
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'PAYMENT_REFUNDED',
        entity: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({ amount, reason, provider: payment.provider, reference: payment.reference }),
      },
    });

    res.json({
      success: true,
      message: `Remboursement de ${amount} ${payment.currency} validé avec succès.`,
      refund: refundResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// GET & POST /api/payments/admin/promos
router.get('/admin/promos', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let promos = await req.prisma.promotionCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    });

    // Initialiser les codes promotionnels par défaut s'il n'y en a pas
    if (promos.length === 0) {
      await req.prisma.promotionCode.createMany({
        data: [
          {
            code: 'COMMERCIA20',
            description: 'Réduction de 20% sur les forfaits Pro & Business',
            discountType: 'percent',
            discountValue: 20,
            maxUses: 500,
            isActive: true,
          },
          {
            code: 'BIENVENUE5000',
            description: 'Réduction de bienvenue de 5 000 FCFA sur l\'abonnement annuel',
            discountType: 'fixed',
            discountValue: 5000,
            minOrderAmount: 20000,
            maxUses: 200,
            isActive: true,
          },
        ],
      });
      promos = await req.prisma.promotionCode.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { redemptions: true } } },
      });
    }

    res.json(promos);
  } catch (error) {
    next(error);
  }
});

router.post('/admin/promos', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      code: z.string().min(3).transform(v => v.toUpperCase().trim()),
      description: z.string().optional(),
      discountType: z.enum(['percent', 'fixed']).default('percent'),
      discountValue: z.number().positive(),
      minOrderAmount: z.number().default(0),
      maxUses: z.number().int().positive().default(100),
      maxUsesPerUser: z.number().int().positive().default(1),
      validUntil: z.string().optional().transform(v => v ? new Date(v) : undefined),
    });

    const data = schema.parse(req.body);

    const created = await req.prisma.promotionCode.create({
      data: {
        ...data,
        applicablePlans: JSON.stringify(['pro', 'business']),
        applicableCycles: JSON.stringify(['monthly', 'yearly']),
      },
    });

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const payment = await req.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return res.json({ success: true, message: 'Transaction introuvable ou déjà supprimée.' });
    }
    if (payment.userId !== req.userId) {
      const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
      if (!user || !user.isAdmin) {
        throw new AppError('Accès non autorisé.', 403);
      }
    }
    await req.prisma.payment.delete({ where: { id } });
    res.json({ success: true, message: 'Tentative de paiement supprimée avec succès.' });
  } catch (error) {
    next(error);
  }
});

export { router as paymentsRouter };
