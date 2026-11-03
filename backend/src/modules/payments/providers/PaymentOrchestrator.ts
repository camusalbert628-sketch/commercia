import { PrismaClient } from '@prisma/client';
import { IPaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerifyResult } from './IPaymentProvider';
import { OrangeMoneyProvider } from './OrangeMoneyProvider';
import { MTNMoMoProvider } from './MTNMoMoProvider';
import { WaveProvider } from './WaveProvider';
import { CardPaymentProvider } from './CardPaymentProvider';
import { activateUserSubscription } from '../../../utils/subscriptionUtils';

export interface AvailablePaymentMethod {
  id: string; // 'orange_money' | 'mtn_momo' | 'wave' | 'card'
  name: string;
  category: 'mobile_money' | 'card';
  logoUrl: string;
  isAvailable: boolean;
  unavailableReason?: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  feeDescription?: string;
}

export interface PromoValidationResult {
  isValid: boolean;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export class PaymentOrchestrator {
  private providers: Map<string, IPaymentProvider> = new Map();

  constructor() {
    this.registerProvider(new OrangeMoneyProvider());
    this.registerProvider(new MTNMoMoProvider());
    this.registerProvider(new WaveProvider());
    this.registerProvider(new CardPaymentProvider());
  }

  public registerProvider(provider: IPaymentProvider) {
    this.providers.set(provider.providerName, provider);
  }

  public getProvider(name: string): IPaymentProvider | undefined {
    // Normalisation des noms
    const norm = name.toLowerCase();
    if (norm === 'orange' || norm === 'orange_money') return this.providers.get('orange_money');
    if (norm === 'mtn' || norm === 'mtn_momo' || norm === 'momo') return this.providers.get('mtn_momo');
    if (norm === 'wave') return this.providers.get('wave');
    if (norm === 'card' || norm === 'visa' || norm === 'mastercard' || norm === 'cinetpay') return this.providers.get('card');
    return this.providers.get(norm);
  }

  /**
   * Retourne la liste des moyens de paiement filtrée dynamiquement par pays et devise
   */
  public getAvailableMethods(country: string = 'CM', currency: string = 'XAF'): AvailablePaymentMethod[] {
    const normCountry = country.toUpperCase();
    const normCurrency = currency.toUpperCase();

    const methods: AvailablePaymentMethod[] = [
      {
        id: 'orange_money',
        name: 'Orange Money Cameroun',
        category: 'mobile_money',
        logoUrl: '/logos/orange-money.png',
        isAvailable: normCountry === 'CM' && normCurrency === 'XAF',
        unavailableReason: normCountry !== 'CM' ? 'Orange Money Cameroun est réservé au territoire camerounais.' : undefined,
        supportedCountries: ['CM'],
        supportedCurrencies: ['XAF'],
        feeDescription: 'Sans frais supplémentaires',
      },
      {
        id: 'mtn_momo',
        name: 'MTN Mobile Money',
        category: 'mobile_money',
        logoUrl: '/logos/mtn-momo.png',
        isAvailable: normCountry === 'CM' && normCurrency === 'XAF',
        unavailableReason: normCountry !== 'CM' ? 'MTN MoMo Cameroun est réservé au territoire camerounais.' : undefined,
        supportedCountries: ['CM'],
        supportedCurrencies: ['XAF'],
        feeDescription: 'Sans frais supplémentaires',
      },
      {
        id: 'card',
        name: 'Carte Bancaire (Visa / Mastercard)',
        category: 'card',
        logoUrl: '/logos/cards-visa-mc.png',
        isAvailable: true,
        supportedCountries: ['CM', 'SN', 'CI', 'ALL'],
        supportedCurrencies: ['XAF', 'XOF', 'EUR', 'USD'],
        feeDescription: 'Sécurisé 3D-Secure 2.0',
      },
      {
        id: 'wave',
        name: 'Wave Mobile Money',
        category: 'mobile_money',
        logoUrl: '/logos/wave.png',
        isAvailable: false, // Strictement indisponible pour le Cameroun
        unavailableReason: normCountry === 'CM'
          ? 'Wave n\'est pas déployé comme opérateur d\'acquisition marchand au Cameroun (Zone CEMAC - XAF).'
          : 'Wave est disponible uniquement au Sénégal et en Côte d\'Ivoire (XOF).',
        supportedCountries: ['SN', 'CI'],
        supportedCurrencies: ['XOF'],
      },
    ];

    return methods;
  }

  /**
   * Valide un code promotionnel contre la base de données PostgreSQL
   */
  public async validatePromoCode(
    prisma: PrismaClient,
    code: string,
    basePrice: number,
    planName: string,
    billingCycle: string,
    userId?: string
  ): Promise<PromoValidationResult> {
    const cleanCode = code.trim().toUpperCase();

    const promo = await prisma.promotionCode.findUnique({
      where: { code: cleanCode },
    });

    if (!promo || !promo.isActive) {
      return {
        isValid: false,
        code: cleanCode,
        discountType: 'percent',
        discountValue: 0,
        discountAmount: 0,
        finalAmount: basePrice,
        message: 'Code promotionnel invalide ou expiré.',
      };
    }

    const now = new Date();
    if (promo.validUntil && promo.validUntil < now) {
      return {
        isValid: false,
        code: cleanCode,
        discountType: promo.discountType as any,
        discountValue: promo.discountValue,
        discountAmount: 0,
        finalAmount: basePrice,
        message: 'Ce code promotionnel est arrivé à expiration.',
      };
    }

    if (promo.currentUses >= promo.maxUses) {
      return {
        isValid: false,
        code: cleanCode,
        discountType: promo.discountType as any,
        discountValue: promo.discountValue,
        discountAmount: 0,
        finalAmount: basePrice,
        message: 'Le quota maximal d\'utilisation de ce code a été atteint.',
      };
    }

    if (basePrice < promo.minOrderAmount) {
      return {
        isValid: false,
        code: cleanCode,
        discountType: promo.discountType as any,
        discountValue: promo.discountValue,
        discountAmount: 0,
        finalAmount: basePrice,
        message: `Montant minimum d'achat requis de ${promo.minOrderAmount} FCFA pour appliquer ce code.`,
      };
    }

    // Vérifier les plans applicables
    try {
      const applicablePlans: string[] = JSON.parse(promo.applicablePlans || '[]');
      if (applicablePlans.length > 0 && !applicablePlans.includes(planName)) {
        return {
          isValid: false,
          code: cleanCode,
          discountType: promo.discountType as any,
          discountValue: promo.discountValue,
          discountAmount: 0,
          finalAmount: basePrice,
          message: `Ce code promotionnel n'est pas applicable au forfait ${planName.toUpperCase()}.`,
        };
      }
    } catch (e) {
      /* ignore */
    }

    // Vérification quota par utilisateur
    if (userId) {
      const userRedemptions = await prisma.promotionRedemption.count({
        where: { promoCodeId: promo.id, userId },
      });
      if (userRedemptions >= promo.maxUsesPerUser) {
        return {
          isValid: false,
          code: cleanCode,
          discountType: promo.discountType as any,
          discountValue: promo.discountValue,
          discountAmount: 0,
          finalAmount: basePrice,
          message: 'Vous avez déjà utilisé ce code promotionnel le nombre maximum de fois autorisé.',
        };
      }
    }

    // Calcul de la réduction
    let discountAmount = 0;
    if (promo.discountType === 'percent') {
      discountAmount = Math.round((basePrice * promo.discountValue) / 100);
      if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
        discountAmount = promo.maxDiscount;
      }
    } else {
      discountAmount = Math.min(basePrice, promo.discountValue);
    }

    const finalAmount = Math.max(0, basePrice - discountAmount);

    return {
      isValid: true,
      code: cleanCode,
      discountType: promo.discountType as any,
      discountValue: promo.discountValue,
      discountAmount,
      finalAmount,
      message: `Réduction de ${discountAmount} FCFA appliquée (${promo.discountType === 'percent' ? promo.discountValue + '%' : promo.discountValue + ' FCFA'}).`,
    };
  }

  /**
   * Crée et initialise un paiement complet de façon sécurisée
   */
  public async createPaymentSession(
    prisma: PrismaClient,
    params: {
      userId: string;
      planName: 'pro' | 'business';
      billingCycle: 'monthly' | 'yearly';
      providerName: string;
      phoneNumber?: string;
      promoCode?: string;
      country?: string;
      currency?: string;
      returnUrl: string;
      notifyUrl: string;
      metadata?: Record<string, any>;
    }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error('Utilisateur introuvable.');
    }

    const plan = await prisma.plan.findUnique({ where: { name: params.planName } });
    if (!plan) {
      throw new Error(`Plan tarifaire ${params.planName} introuvable.`);
    }

    // Calcul strict du tarif de base depuis la base de données
    const isYearly = params.billingCycle === 'yearly';
    const basePrice = isYearly
      ? (plan.priceYearly > 0 ? plan.priceYearly : plan.priceMonthly * 10)
      : plan.priceMonthly;

    let finalAmount = basePrice;
    let promoDiscount = 0;
    let validatedPromo: PromoValidationResult | null = null;

    if (params.promoCode) {
      validatedPromo = await this.validatePromoCode(
        prisma,
        params.promoCode,
        basePrice,
        params.planName,
        params.billingCycle,
        user.id
      );
      if (validatedPromo.isValid) {
        promoDiscount = validatedPromo.discountAmount;
        finalAmount = validatedPromo.finalAmount;
      }
    }

    const provider = this.getProvider(params.providerName);
    if (!provider) {
      throw new Error(`Fournisseur de paiement ${params.providerName} non pris en charge.`);
    }

    const country = params.country || 'CM';
    const currency = params.currency || plan.currency || 'XAF';

    if (!provider.isAvailableFor(country, currency)) {
      throw new Error(
        `Le moyen de paiement ${provider.displayName} n'est pas disponible pour le pays ${country} et la devise ${currency}.`
      );
    }

    // Référence unique horodatée
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `COMMERCIA-${timestamp}-${randomSuffix}`;

    // Enregistrement de la transaction en base de données avec statut PENDING obligatoire
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        planId: plan.id,
        amount: finalAmount,
        currency,
        country,
        method: provider.providerName === 'card' ? 'card' : 'mobile_money',
        provider: provider.providerName,
        status: 'pending',
        reference,
        phoneNumber: params.phoneNumber || user.phone || null,
        payerEmail: user.email,
        metadata: JSON.stringify({
          planName: plan.name,
          billingCycle: params.billingCycle,
          basePrice,
          promoDiscount,
          promoCode: validatedPromo?.isValid ? validatedPromo.code : null,
          initiatedAt: new Date().toISOString(),
          customerName: `${user.firstName} ${user.lastName}`.trim(),
          ...params.metadata,
        }),
      },
    });

    // Appel à l'adaptateur de paiement
    const initResult = await provider.initializePayment({
      userId: user.id,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
      customerEmail: user.email,
      phoneNumber: params.phoneNumber || user.phone || undefined,
      planName: params.planName,
      billingCycle: params.billingCycle,
      amount: finalAmount,
      currency,
      country,
      reference,
      returnUrl: params.returnUrl,
      notifyUrl: params.notifyUrl,
      metadata: params.metadata,
    });

    // Mise à jour de la référence du prestataire et de l'URL de paiement
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutUrl: initResult.checkoutUrl || null,
        providerReference: initResult.providerReference || null,
      },
    });

    return {
      payment,
      initResult,
      pricing: {
        basePrice,
        promoDiscount,
        finalAmount,
        currency,
      },
    };
  }

  /**
   * Confirme définitivement un paiement et active l'abonnement
   * Idempotent : ne double jamais un abonnement ni une facture
   */
  public async confirmSuccessfulPayment(
    prisma: PrismaClient,
    paymentId: string,
    providerReference?: string,
    rawPayload?: any
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, plan: true },
    });

    if (!payment) {
      throw new Error('Paiement introuvable.');
    }

    // Contrôle d'idempotence strict
    if (payment.status === 'completed') {
      return { alreadyProcessed: true, payment };
    }

    // 1. Mettre à jour le paiement
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        providerReference: providerReference || payment.providerReference || null,
        verifiedAt: new Date(),
        metadata: JSON.stringify({
          ...(payment.metadata ? JSON.parse(payment.metadata) : {}),
          confirmedAt: new Date().toISOString(),
          rawPayload,
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

    // 3. Activer l'abonnement
    const activeSub = await activateUserSubscription(prisma, {
      userId: payment.userId,
      planName: targetPlanName,
      durationDays,
      paymentId: updatedPayment.id,
      provider: payment.provider,
      transactionReference: payment.reference,
    });

    // 4. Générer la facture officielle
    const invoiceNumber = `COM-${new Date().getFullYear()}-${payment.reference.replace('COMMERCIA-', '')}`;
    await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId: payment.userId,
        paymentId: updatedPayment.id,
        planName: payment.plan?.displayName || 'Plan Pro',
        billingCycle: meta.billingCycle === 'yearly' ? 'Annuel' : 'Mensuel',
        amount: payment.amount,
        currency: payment.currency,
        status: 'paid',
        dueDate: new Date(),
        paidAt: new Date(),
        metadata: JSON.stringify({
          provider: payment.provider,
          reference: payment.reference,
          providerReference: updatedPayment.providerReference,
        }),
      },
    });

    // 5. Enregistrer l'utilisation du code promo si présent
    if (meta.promoCode) {
      const promo = await prisma.promotionCode.findUnique({
        where: { code: meta.promoCode },
      });
      if (promo) {
        await prisma.promotionRedemption.create({
          data: {
            promoCodeId: promo.id,
            userId: payment.userId,
            paymentId: updatedPayment.id,
            discountAmount: meta.promoDiscount || 0,
          },
        });
        await prisma.promotionCode.update({
          where: { id: promo.id },
          data: { currentUses: { increment: 1 } },
        });
      }
    }

    return { alreadyProcessed: false, payment: updatedPayment, subscription: activeSub };
  }

  /**
   * Tâche automatique de réconciliation des paiements en attente (Background Task)
   * Détecte les transactions en attente depuis plus de 2 minutes et interroge l'opérateur
   */
  public async reconcilePendingPayments(prisma: PrismaClient): Promise<{ checked: number; resolved: number }> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'pending',
        createdAt: {
          gte: oneDayAgo,
          lte: twoMinutesAgo,
        },
      },
      include: { plan: true },
      take: 20,
    });

    let resolved = 0;

    for (const payment of pendingPayments) {
      const provider = this.getProvider(payment.provider);
      if (!provider) continue;

      let meta: any = {};
      try {
        meta = JSON.parse(payment.metadata || '{}');
      } catch (e) {
        meta = {};
      }

      try {
        const verifyResult = await provider.verifyPayment(payment.reference, {
          ...meta,
          providerReference: payment.providerReference,
        });

        if (verifyResult.status === 'completed') {
          await this.confirmSuccessfulPayment(prisma, payment.id, verifyResult.providerReference, verifyResult.rawResponse);
          resolved++;
          console.log(`[Reconciliation] Transaction ${payment.reference} résolue avec SUCCÈS via vérification opérateur.`);
        } else if (verifyResult.status === 'failed') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'failed',
              errorMessage: verifyResult.errorMessage || 'Transaction confirmée échouée lors de la réconciliation.',
            },
          });
          resolved++;
          console.log(`[Reconciliation] Transaction ${payment.reference} marquée ÉCHOUÉE.`);
        }
      } catch (err) {
        console.warn(`[Reconciliation] Échec réconciliation pour ${payment.reference}:`, err);
      }
    }

    return { checked: pendingPayments.length, resolved };
  }
}

export const paymentOrchestrator = new PaymentOrchestrator();
