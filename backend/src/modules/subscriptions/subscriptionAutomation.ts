import { PrismaClient } from '@prisma/client';

export type MerchantAccountStatus =
  | 'ACTIF'
  | 'ESSAI'
  | 'EN ATTENTE DE PAIEMENT'
  | 'À RENOUVELER'
  | 'NON RENOUVELÉ'
  | 'EN GRÂCE'
  | 'SUSPENDU AUTOMATIQUEMENT'
  | 'SUSPENDU MANUELLEMENT'
  | 'RÉSILIÉ'
  | 'BLOQUÉ POUR RAISON DE SÉCURITÉ'
  | 'COMPTE GRATUIT';

export interface StatusDetail {
  code: MerchantAccountStatus;
  label: string;
  badgeColor: string;
  bgLight: string;
  bgDark: string;
  textColor: string;
  description: string;
}

/**
 * Moteur de calcul du statut intelligent de chaque utilisateur
 * Dissocie rigoureusement le statut de sécurité du compte et le statut de l'abonnement
 */
export function calculateMerchantAccountStatus(
  user: {
    isActive?: boolean;
    isSuspended?: boolean;
    suspensionType?: string | null;
    securityLocked?: boolean;
  },
  subscription?: {
    status?: string;
    endDate?: Date | string | null;
    trialEndsAt?: Date | string | null;
    gracePeriodEndsAt?: Date | string | null;
    suspendedBy?: string | null;
    plan?: { name?: string };
  } | null,
  recentPendingPayment?: boolean
): StatusDetail {
  // 1. Priorité absolue : Sécurité
  if (user.securityLocked) {
    return {
      code: 'BLOQUÉ POUR RAISON DE SÉCURITÉ',
      label: 'Bloqué Sécurité',
      badgeColor: '#991B1B',
      bgLight: '#FEF2F2',
      bgDark: 'rgba(239, 68, 68, 0.2)',
      textColor: '#DC2626',
      description: 'Accès bloqué immédiatement à la suite d\'une alerte ou incident de sécurité.',
    };
  }

  // 2. Suspension manuelle par un administrateur
  if (user.isSuspended && user.suspensionType === 'manual') {
    return {
      code: 'SUSPENDU MANUELLEMENT',
      label: 'Suspendu (Manuel)',
      badgeColor: '#C2410C',
      bgLight: '#FFF7ED',
      bgDark: 'rgba(234, 88, 12, 0.2)',
      textColor: '#EA580C',
      description: 'Compte désactivé délibérément par décision administrative Super Admin.',
    };
  }

  // 3. Suspension automatique (système)
  if (
    (user.isSuspended && user.suspensionType === 'automatic') ||
    subscription?.suspendedBy === 'system'
  ) {
    return {
      code: 'SUSPENDU AUTOMATIQUEMENT',
      label: 'Suspendu (Auto)',
      badgeColor: '#B91C1C',
      bgLight: '#FEF2F2',
      bgDark: 'rgba(185, 28, 28, 0.2)',
      textColor: '#B91C1C',
      description: 'Accès suspendu automatiquement par le système après expiration de la période de grâce.',
    };
  }

  // 4. Résiliation d'abonnement
  if (subscription?.status === 'cancelled') {
    return {
      code: 'RÉSILIÉ',
      label: 'Résilié',
      badgeColor: '#475569',
      bgLight: '#F1F5F9',
      bgDark: 'rgba(100, 116, 139, 0.2)',
      textColor: '#64748B',
      description: 'Abonnement expressément résilié selon les conditions commerciales.',
    };
  }

  const now = new Date();
  const subEndDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const graceDate = subscription?.gracePeriodEndsAt ? new Date(subscription.gracePeriodEndsAt) : null;
  const isPaidPlan = subscription?.plan?.name === 'pro' || subscription?.plan?.name === 'business';

  // 5. Période de grâce (soit date explicite gracePeriodEndsAt, soit délai par défaut de 3 jours)
  const defaultGraceMs = 3 * 24 * 60 * 60 * 1000;
  const effectiveGraceEnd = graceDate || (subEndDate ? new Date(subEndDate.getTime() + defaultGraceMs) : null);

  if (
    isPaidPlan &&
    subEndDate &&
    subEndDate < now &&
    effectiveGraceEnd &&
    effectiveGraceEnd > now &&
    subscription?.status !== 'expired' &&
    subscription?.status !== 'cancelled'
  ) {
    return {
      code: 'EN GRÂCE',
      label: 'En Grâce',
      badgeColor: '#D97706',
      bgLight: '#FFFBEB',
      bgDark: 'rgba(217, 119, 6, 0.2)',
      textColor: '#D97706',
      description: 'Date d\'échéance dépassée ; tolérance commerciale active avant restriction.',
    };
  }

  // 6. Non renouvelé / Expiré
  if (
    isPaidPlan &&
    subEndDate &&
    subEndDate < now &&
    (!graceDate || graceDate <= now)
  ) {
    return {
      code: 'NON RENOUVELÉ',
      label: 'Non Renouvelé',
      badgeColor: '#E11D48',
      bgLight: '#FFF1F2',
      bgDark: 'rgba(225, 29, 72, 0.2)',
      textColor: '#E11D48',
      description: 'Date de fin atteinte et aucun paiement de renouvellement validé.',
    };
  }

  // 7. En attente de paiement
  if (recentPendingPayment) {
    return {
      code: 'EN ATTENTE DE PAIEMENT',
      label: 'Paiement en Cours',
      badgeColor: '#0284C7',
      bgLight: '#F0F9FF',
      bgDark: 'rgba(2, 132, 199, 0.2)',
      textColor: '#0284C7',
      description: 'Tentative de paiement Mobile Money ou Carte initiée mais non encore finalisée.',
    };
  }

  // 8. Période d'essai
  if (
    subscription?.status === 'trial' ||
    (subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > now)
  ) {
    return {
      code: 'ESSAI',
      label: 'Période d\'Essai',
      badgeColor: '#7C3AED',
      bgLight: '#F5F3FF',
      bgDark: 'rgba(124, 58, 237, 0.2)',
      textColor: '#7C3AED',
      description: 'Compte en phase d\'évaluation des fonctionnalités Pro ou Business.',
    };
  }

  // 9. À renouveler (Abonnement actif expirant sous 7 jours)
  if (isPaidPlan && subEndDate) {
    const daysRemaining = Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 7 && daysRemaining >= 0) {
      return {
        code: 'À RENOUVELER',
        label: `À Renouveler (J-${daysRemaining})`,
        badgeColor: '#F59E0B',
        bgLight: '#FEF3C7',
        bgDark: 'rgba(245, 158, 11, 0.2)',
        textColor: '#D97706',
        description: 'Abonnement valide approchant de son terme d\'échéance sous 7 jours.',
      };
    }
  }

  // 10. Actif
  if (isPaidPlan && subEndDate && subEndDate > now) {
    return {
      code: 'ACTIF',
      label: 'Actif',
      badgeColor: '#10B981',
      bgLight: '#ECFDF5',
      bgDark: 'rgba(16, 185, 129, 0.2)',
      textColor: '#059669',
      description: 'Abonnement Pro ou Business en cours de validité sans anomalie.',
    };
  }

  // 11. Compte gratuit
  return {
    code: 'COMPTE GRATUIT',
    label: 'Compte Gratuit',
    badgeColor: '#64748B',
    bgLight: '#F1F5F9',
    bgDark: 'rgba(100, 116, 139, 0.15)',
    textColor: '#475569',
    description: 'Utilisateur actif sur la formule Découverte sans frais d\'abonnement.',
  };
}

/**
 * Service d'automatisation des abonnements et de surveillance des expirations
 */
export class SubscriptionAutomationService {
  /**
   * Récupère la configuration des règles d'abonnement ou initialise les valeurs par défaut
   */
  public static async getRuleConfig(prisma: PrismaClient) {
    let config = await prisma.subscriptionRuleConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      config = await prisma.subscriptionRuleConfig.create({
        data: {
          id: 'singleton',
          gracePeriodDays: 3,
          reminderDays: JSON.stringify([7, 3, 1, 0]),
          restrictFeaturesOnExpiry: true,
          autoReactivateOnPayment: true,
          allowEarlyRenewal: true,
        },
      });
    }

    return config;
  }

  /**
   * Analyse automatique de tous les abonnements marchands :
   * - Notifications d'expiration (J-7, J-3, J-1, J-0)
   * - Transition en période de grâce
   * - Suspension automatique après la période de grâce
   * - Création d'alertes commerciales
   */
  public static async runExpirationAutomation(prisma: PrismaClient) {
    const config = await this.getRuleConfig(prisma);
    const reminderDays: number[] = JSON.parse(config.reminderDays || '[7,3,1,0]');
    const now = new Date();

    const activePaidSubs = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'in_grace'] },
        endDate: { not: null },
        plan: { name: { in: ['pro', 'business'] } },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        plan: true,
      },
    });

    let notificationsSent = 0;
    let gracePeriodApplied = 0;
    let autoSuspensions = 0;
    let alertsCreated = 0;

    for (const sub of activePaidSubs) {
      if (!sub.endDate) continue;
      const endDate = new Date(sub.endDate);
      const diffMs = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // 1. Rappels avant expiration (J-7, J-3, J-1, J-0)
      if (daysRemaining >= 0 && reminderDays.includes(daysRemaining)) {
        const notifTitle = daysRemaining === 0
          ? 'Votre abonnement COMMERCIA expire aujourd\'hui'
          : `Votre abonnement COMMERCIA expire dans ${daysRemaining} jours`;

        // Éviter les alertes en double envoyées le même jour
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const existingAlert = await prisma.commercialAlert.findFirst({
          where: {
            userId: sub.userId,
            category: 'expiring_soon',
            createdAt: { gte: todayStart },
          },
        });

        if (!existingAlert) {
          await prisma.commercialAlert.create({
            data: {
              title: notifTitle,
              message: `L'abonnement ${sub.plan.displayName} de ${sub.user.firstName} ${sub.user.lastName} (${sub.user.email}) arrive à échéance le ${endDate.toLocaleDateString('fr-FR')}.`,
              priority: daysRemaining <= 1 ? 'high' : 'medium',
              category: 'expiring_soon',
              userId: sub.userId,
            },
          });
          alertsCreated++;

          // Créer une notification interne pour le commerçant
          await prisma.notification.create({
            data: {
              userId: sub.userId,
              type: 'warning',
              title: notifTitle,
              message: `Renouvelez dès maintenant votre formule ${sub.plan.displayName} pour continuer à profiter de toutes vos fonctionnalités de gestion.`,
            },
          });
          notificationsSent++;
        }
      }

      // 2. Gestion de l'échéance dépassée (endDate < now)
      if (endDate < now) {
        const graceDays = config.gracePeriodDays;
        const graceEnd = sub.gracePeriodEndsAt
          ? new Date(sub.gracePeriodEndsAt)
          : new Date(endDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

        // A. Passage en Période de Grâce
        if (graceEnd > now && sub.status !== 'in_grace') {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'in_grace',
              gracePeriodEndsAt: graceEnd,
            },
          });

          await prisma.subscriptionEvent.create({
            data: {
              subscriptionId: sub.id,
              eventType: 'entered_grace_period',
              metadata: JSON.stringify({
                gracePeriodDays: graceDays,
                gracePeriodEndsAt: graceEnd.toISOString(),
                originalEndDate: endDate.toISOString(),
              }),
            },
          });

          await prisma.commercialAlert.create({
            data: {
              title: 'Abonnement en Période de Grâce',
              message: `Le client ${sub.user.firstName} ${sub.user.lastName} est entré en période de grâce (${graceDays} jours). Échéance finale le ${graceEnd.toLocaleDateString('fr-FR')}.`,
              priority: 'high',
              category: 'expiring_soon',
              userId: sub.userId,
            },
          });

          gracePeriodApplied++;
        }

        // B. Expiration de la Période de Grâce -> Suspension Automatique
        else if (graceEnd <= now && sub.status !== 'expired') {
          // Suspendre l'abonnement
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'expired',
              suspendedAt: now,
              suspendedReason: 'Défaut de renouvellement après expiration de la période de grâce.',
              suspendedBy: 'system',
            },
          });

          // Marquer l'utilisateur comme suspendu automatiquement
          await prisma.user.update({
            where: { id: sub.userId },
            data: {
              isSuspended: true,
              suspensionType: 'automatic',
              suspendedReason: 'Abonnement Pro/Business expiré non renouvelé.',
              suspendedAt: now,
              suspendedBy: 'system',
            },
          });

          await prisma.subscriptionEvent.create({
            data: {
              subscriptionId: sub.id,
              eventType: 'auto_suspended',
              metadata: JSON.stringify({
                gracePeriodExpiredAt: graceEnd.toISOString(),
                suspendedAt: now.toISOString(),
              }),
            },
          });

          await prisma.commercialAlert.create({
            data: {
              title: 'Abonnement Suspendu Automatiquement',
              message: `L'accès payant de ${sub.user.firstName} ${sub.user.lastName} a été suspendu automatiquement. Ses données restent conservées. Risque de Churn détecté.`,
              priority: 'critical',
              category: 'user_suspended',
              userId: sub.userId,
            },
          });

          // Notifier le commerçant avec instructions de renouvellement
          await prisma.notification.create({
            data: {
              userId: sub.userId,
              type: 'error',
              title: 'Abonnement COMMERCIA Suspendu',
              message: 'Votre période de grâce a pris fin. Vos données sont conservées en toute sécurité. Connectez-vous pour régulariser votre compte et réactiver vos accès.',
            },
          });

          autoSuspensions++;
        }
      }
    }

    return {
      totalAnalyzed: activePaidSubs.length,
      notificationsSent,
      gracePeriodApplied,
      autoSuspensions,
      alertsCreated,
      timestamp: now.toISOString(),
    };
  }

  /**
   * Réactivation automatique après confirmation réelle de paiement
   * Respecte strictement l'interdiction de lever une suspension manuelle d'un administrateur
   */
  public static async processAutomaticReactivation(
    prisma: PrismaClient,
    userId: string,
    paymentId: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!user) throw new Error('Utilisateur introuvable pour réactivation.');

    // RÈGLE MÉTIER CRITIQUE : Une suspension MANUELLE par un Super Admin ne doit JAMAIS être levée automatiquement
    if (user.isSuspended && user.suspensionType === 'manual') {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_RECEIVED_ON_MANUALLY_SUSPENDED_USER',
          entity: 'User',
          entityId: userId,
          details: JSON.stringify({
            paymentId,
            message: 'Paiement reçu mais compte maintenu suspendu conformément à la suspension administrative manuelle.',
          }),
        },
      });
      return { reactivated: false, reason: 'Suspension manuelle maintenue.' };
    }

    // Lever la suspension automatique si présente
    if (user.isSuspended && user.suspensionType === 'automatic') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended: false,
          suspensionType: null,
          suspendedReason: null,
          suspendedAt: null,
          suspendedBy: null,
        },
      });
    }

    // Mettre à jour l'abonnement
    let newEndDate: Date = new Date(Date.now() + 30 * 86400000);
    if (user.subscription) {
      const now = new Date();
      const currentEnd = user.subscription.endDate ? new Date(user.subscription.endDate) : now;
      const baseDate = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          status: 'active',
          endDate: newEndDate,
          suspendedAt: null,
          suspendedReason: null,
          suspendedBy: null,
          gracePeriodEndsAt: null,
          renewalCount: { increment: 1 },
          lastRenewedAt: new Date(),
        },
      });

      await prisma.subscriptionEvent.create({
        data: {
          subscriptionId: user.subscription.id,
          eventType: 'auto_reactivated',
          metadata: JSON.stringify({
            paymentId,
            newEndDate: newEndDate.toISOString(),
            reactivatedAt: new Date().toISOString(),
          }),
        },
      });

      // Fermer les alertes d'expiration ouvertes pour cet utilisateur
      await prisma.commercialAlert.updateMany({
        where: {
          userId,
          category: { in: ['expiring_soon', 'user_suspended', 'churn_risk'] },
          status: 'open',
        },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: 'system',
        },
      });
    }

    return { reactivated: true, newEndDate };
  }
}
