import { PrismaClient } from '@prisma/client';

export interface UserSubscriptionDetails {
  userId: string;
  isPro: boolean;
  isAdmin: boolean;
  status: 'free' | 'active' | 'expired' | 'trial' | 'cancelled';
  planName: 'free' | 'pro' | 'business';
  planDisplayName: string;
  startDate: Date | null;
  endDate: Date | null;
  daysRemaining: number;
  features: string[];
  limits: Record<string, any>;
  lastPaymentId?: string | null;
}

/**
 * Récupère et met à jour en temps réel l'état d'abonnement d'un utilisateur
 * Vérifie rigoureusement l'expiration et garantit qu'aucun compte non-payé n'est considéré Pro.
 */
export async function getUserSubscriptionDetails(
  prisma: any,
  userId: string
): Promise<UserSubscriptionDetails> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  // 1. Initialiser le plan free s'il n'existe pas en base
  let freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
  if (!freePlan) {
    freePlan = await prisma.plan.create({
      data: {
        name: 'free',
        displayName: 'Gratuit',
        description: 'Fonctionnalités essentielles de base pour micro-commerces',
        priceMonthly: 0,
        priceYearly: 0,
        features: JSON.stringify([
          '15 ventes par jour max',
          'Enregistrement des dépenses de base',
          'Tableau de bord financier simplifié',
          'Calcul du bénéfice journalier estimé',
          'Support communautaire',
        ]),
        limits: JSON.stringify({
          salesPerDay: 15,
          stockEnabled: false,
          creditEnabled: false,
          aiEnabled: false,
          advancedTreasury: false,
          growthMetrics: false,
        }),
        sortOrder: 1,
      },
    });
  }

  let sub = user.subscription;

  // 2. Si l'utilisateur n'a aucune souscription, lui assigner automatiquement le plan Gratuit
  if (!sub) {
    sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'free',
        startDate: new Date(),
        endDate: null,
      },
      include: { plan: true },
    });
  }

  const now = new Date();
  let currentStatus = sub.status;
  const isPaidPlan = sub.plan?.name === 'pro' || sub.plan?.name === 'business';

  // 3. Détection automatique et expiration des abonnements échus
  if (isPaidPlan && (currentStatus === 'active' || currentStatus === 'trial')) {
    if (sub.endDate && new Date(sub.endDate) <= now) {
      currentStatus = 'expired';
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      });

      // Notification à l'utilisateur de l'expiration
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'report_ready',
            title: 'Votre abonnement COMMERCIA PRO a expiré',
            message: 'Votre période d\'abonnement est arrivée à son terme. Renouvelez dès maintenant pour retrouver vos fonctionnalités illimitées.',
            actionUrl: '/subscription',
          },
        });
      } catch (e) {
        /* ignorer si notification échoue */
      }
    }
  }

  // 4. Calcul strict de l'éligibilité Pro
  // Un utilisateur est Pro UNIQUEMENT si :
  // - Il est administrateur, OU
  // - Son plan est 'pro' ou 'business' ET son statut est 'active' ou 'trial' ET non-expiré
  const hasValidProAccess =
    user.isAdmin ||
    (isPaidPlan &&
      (currentStatus === 'active' || currentStatus === 'trial') &&
      (!sub.endDate || new Date(sub.endDate) > now));

  let daysRemaining = 0;
  if (sub.endDate) {
    const diffMs = new Date(sub.endDate).getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  let parsedFeatures: string[] = [];
  try {
    parsedFeatures = JSON.parse(sub.plan?.features || '[]');
  } catch (e) {
    parsedFeatures = [];
  }

  let parsedLimits: Record<string, any> = {};
  try {
    parsedLimits = JSON.parse(sub.plan?.limits || '{}');
  } catch (e) {
    parsedLimits = {};
  }

  return {
    userId: user.id,
    isPro: hasValidProAccess,
    isAdmin: user.isAdmin,
    status: user.isAdmin ? 'active' : (hasValidProAccess ? 'active' : (currentStatus === 'expired' ? 'expired' : 'free')),
    planName: user.isAdmin ? (sub.plan?.name as any || 'pro') : (hasValidProAccess ? (sub.plan?.name as any) : 'free'),
    planDisplayName: user.isAdmin ? 'Administrateur' : (hasValidProAccess ? sub.plan?.displayName : 'Gratuit'),
    startDate: sub.startDate,
    endDate: sub.endDate,
    daysRemaining,
    features: parsedFeatures,
    limits: parsedLimits,
    lastPaymentId: sub.lastPaymentId,
  };
}

/**
 * Active ou prolonge de façon idempotente un abonnement Pro après confirmation réelle de paiement
 */
export async function activateUserSubscription(
  prisma: any,
  params: {
    userId: string;
    planName: 'pro' | 'business';
    durationDays?: number;
    paymentId?: string;
    provider?: string;
    transactionReference?: string;
  }
) {
  const { userId, planName, durationDays = 30, paymentId, provider, transactionReference } = params;

  const targetPlan = await prisma.plan.findUnique({ where: { name: planName } });
  if (!targetPlan) {
    throw new Error(`Plan introuvable : ${planName}`);
  }

  const existingSub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  // Contrôle strict d'idempotence : si ce paiement précis a déjà été activé, on ne double pas l'extension
  if (paymentId && existingSub && existingSub.lastPaymentId === paymentId && existingSub.status === 'active') {
    return existingSub;
  }

  const now = new Date();
  let newStartDate = now;
  let newEndDate: Date;

  // Si l'utilisateur avait déjà un abonnement Pro actif qui n'est pas expiré, on prolonge à partir de l'ancienne date de fin !
  if (
    existingSub &&
    existingSub.status === 'active' &&
    existingSub.endDate &&
    new Date(existingSub.endDate) > now
  ) {
    newStartDate = existingSub.startDate;
    newEndDate = new Date(new Date(existingSub.endDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
  } else {
    newStartDate = now;
    newEndDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  const updatedSub = await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId: targetPlan.id,
      status: 'active',
      startDate: newStartDate,
      endDate: newEndDate,
      lastPaymentId: paymentId || existingSub?.lastPaymentId || null,
    },
    create: {
      userId,
      planId: targetPlan.id,
      status: 'active',
      startDate: newStartDate,
      endDate: newEndDate,
      lastPaymentId: paymentId || null,
    },
    include: { plan: true },
  });

  // Enregistrer l'événement d'abonnement
  await prisma.subscriptionEvent.create({
    data: {
      subscriptionId: updatedSub.id,
      eventType: existingSub ? 'renewed' : 'upgraded',
      metadata: JSON.stringify({
        plan: targetPlan.name,
        durationDays,
        paymentId,
        provider,
        transactionReference,
        activatedAt: now.toISOString(),
      }),
    },
  });

  // Notification de confirmation envoyée au client
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'sales_up',
        title: `Abonnement ${targetPlan.displayName} activé ! 🎉`,
        message: `Félicitations ! Votre compte bénéficie désormais de tous les avantages ${targetPlan.displayName} jusqu'au ${newEndDate.toLocaleDateString('fr-FR')}.`,
        actionUrl: '/subscription',
      },
    });
  } catch (e) {
    /* ignorer */
  }

  // Traçabilité Audit Log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'SUBSCRIPTION_ACTIVATED',
      entity: 'Subscription',
      entityId: updatedSub.id,
      details: JSON.stringify({
        plan: targetPlan.name,
        paymentId,
        provider,
        transactionReference,
        endDate: newEndDate.toISOString(),
      }),
    },
  });

  return updatedSub;
}
