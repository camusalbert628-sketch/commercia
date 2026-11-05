import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { calculateMerchantAccountStatus, SubscriptionAutomationService } from '../subscriptions/subscriptionAutomation';

const router = Router();

// =========================================================================
// 1. ANNUAIRE CENTRAL : UTILISATEURS & MARCHANDS (15 COLONNES OFFICIELLES)
// =========================================================================
router.get('/merchants', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const planFilter = ((req.query.plan as string) || 'all').toLowerCase();
    const statusFilter = ((req.query.status as string) || 'all').toUpperCase();
    const sectorFilter = ((req.query.sector as string) || 'all').toLowerCase();
    const sortBy = (req.query.sort as string) || 'date_desc';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const ruleConfig = await SubscriptionAutomationService.getRuleConfig(req.prisma);

    // Récupération de tous les utilisateurs marchands réels (exclusion stricte du Super Admin)
    const allUsers = await req.prisma.user.findMany({
      where: { isAdmin: false },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        businesses: {
          include: {
            business: true,
          },
        },
        payments: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            refundedAmount: true,
            providerFee: true,
            method: true,
            provider: true,
            reference: true,
            createdAt: true,
          },
        },
        feedbacks: {
          select: {
            id: true,
            rating: true,
            category: true,
            status: true,
          },
        },
      },
    });

    // Transformation et calcul des métriques individuelles réelles
    const now = new Date();
    const computedMerchants = allUsers.map((u: any) => {
      const sub = u.subscription;
      const plan = sub?.plan;
      const statusInfo = calculateMerchantAccountStatus(u, sub);
      const primaryBiz = u.businesses[0]?.business;

      const businessName = primaryBiz?.name || 'Non renseigné';
      const sector = primaryBiz?.sector || 'commerce';

      // Totaux financiers réels
      let totalPaid = 0;
      let totalRefunds = 0;
      let totalFees = 0;

      for (const p of u.payments) {
        totalPaid += Number(p.amount || 0);
        totalRefunds += Number(p.refundedAmount || 0);
        totalFees += Number(p.providerFee || 0);
      }

      const netRevenue = Math.max(0, totalPaid - totalRefunds - totalFees);
      const knownCac = Number(u.estimatedCac || 0);
      const supportCost = Number(u.supportCost || 0);
      const estimatedContribution = netRevenue - knownCac - supportCost;

      // Dernier paiement confirmé
      const lastPayment = u.payments.length > 0 ? {
        amount: u.payments[0].amount,
        date: u.payments[0].createdAt,
        method: u.payments[0].method,
        provider: u.payments[0].provider,
        reference: u.payments[0].reference,
      } : null;

      // Jours restants et prochain renouvellement
      let daysRemaining: number | null = null;
      let nextRenewal: string | null = null;

      if (sub?.endDate) {
        const diffMs = new Date(sub.endDate).getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (sub.status === 'active' || sub.status === 'in_grace') {
          nextRenewal = sub.endDate.toISOString();
        }
      }

      // Dernière activité (login ou date du dernier paiement ou date de création)
      const lastActivity = u.lastLoginAt
        ? u.lastLoginAt.toISOString()
        : lastPayment
        ? lastPayment.date.toISOString()
        : u.createdAt.toISOString();

      return {
        // 15 Colonnes Requises
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Commerçant',
        phone: u.phone || 'Non renseigné',
        email: u.email,
        businessName,
        sector,
        createdAt: u.createdAt.toISOString(),
        planName: plan?.displayName || (plan?.name === 'pro' ? 'Pro' : plan?.name === 'business' ? 'Business' : 'Gratuit'),
        planKey: plan?.name || 'free',
        subStart: sub?.startDate ? sub.startDate.toISOString() : u.createdAt.toISOString(),
        subEnd: sub?.endDate ? sub.endDate.toISOString() : null,
        lastPayment,
        nextRenewal,
        totalPaid,
        netRevenue,
        status: statusInfo.code,
        statusLabel: statusInfo.label,
        statusColor: statusInfo.badgeColor,
        statusDescription: statusInfo.description,
        isSuspended: u.isSuspended,
        suspensionType: u.suspensionType,
        suspendedReason: u.suspendedReason,
        securityLocked: u.securityLocked,
        securityLockedReason: u.securityLockedReason,
        lastActivity,
        // Métriques supplémentaires
        daysRemaining,
        estimatedContribution,
        loginCount: u.loginCount || 0,
        paymentsCount: u.payments.length,
        feedbacksCount: u.feedbacks.length,
        isAdmin: u.isAdmin,
      };
    });

    // Filtrage multicritères
    let filtered = computedMerchants.filter((m: any) => {
      if (search) {
        const inName = m.name.toLowerCase().includes(search);
        const inEmail = m.email.toLowerCase().includes(search);
        const inPhone = m.phone.toLowerCase().includes(search);
        const inBiz = m.businessName.toLowerCase().includes(search);
        const inId = m.id.toLowerCase().includes(search);
        if (!inName && !inEmail && !inPhone && !inBiz && !inId) return false;
      }

      if (planFilter !== 'all' && m.planKey !== planFilter) {
        return false;
      }

      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false;
      }

      if (sectorFilter !== 'all' && m.sector.toLowerCase() !== sectorFilter) {
        return false;
      }

      return true;
    });

    // Tri
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'revenue_desc':
          return b.netRevenue - a.netRevenue;
        case 'profit_desc':
          return b.estimatedContribution - a.estimatedContribution;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'expiry_asc':
          if (!a.subEnd) return 1;
          if (!b.subEnd) return -1;
          return new Date(a.subEnd).getTime() - new Date(b.subEnd).getTime();
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    // Pagination
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const paginatedRecords = filtered.slice((page - 1) * limit, page * limit);

    // Métriques globales du tableau (exclusion stricte des comptes administrateurs)
    const summary = {
      totalUsers: allUsers.filter((u: any) => !u.isAdmin).length,
      payingUsers: allUsers.filter((u: any) => !u.isAdmin && u.subscription?.plan && u.subscription.plan.name !== 'free' && u.subscription.plan.name !== 'admin').length,
      freeUsers: allUsers.filter((u: any) => !u.isAdmin && (!u.subscription?.plan || u.subscription.plan.name === 'free')).length,
      activePaid: computedMerchants.filter((m: any) => !m.isAdmin && m.status === 'ACTIF' && m.planKey !== 'free' && m.planKey !== 'admin').length,
      expiringSoon: computedMerchants.filter((m: any) => !m.isAdmin && m.status === 'À RENOUVELER').length,
      inGrace: computedMerchants.filter((m: any) => !m.isAdmin && m.status === 'EN GRÂCE').length,
      expiredCount: computedMerchants.filter((m: any) => !m.isAdmin && m.status === 'NON RENOUVELÉ').length,
      suspendedCount: computedMerchants.filter((m: any) => !m.isAdmin && m.status.startsWith('SUSPENDU')).length,
      securityLockedCount: computedMerchants.filter((m: any) => !m.isAdmin && m.status === 'BLOQUÉ POUR RAISON DE SÉCURITÉ').length,
      totalGrossRevenue: computedMerchants.filter((m: any) => !m.isAdmin).reduce((sum: number, m: any) => sum + m.totalPaid, 0),
      totalNetRevenue: computedMerchants.filter((m: any) => !m.isAdmin).reduce((sum: number, m: any) => sum + m.netRevenue, 0),
    };

    res.json({
      merchants: paginatedRecords,
      totalRecords,
      totalPages,
      page,
      limit,
      summary,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. PROFIL INDIVIDUEL DÉTAILLÉ 360° (SECTIONS A, B, C, D, E)
// =========================================================================
router.get('/merchants/:id/profile', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const user = await req.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true,
            events: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        businesses: {
          include: {
            business: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            plan: true,
            refunds: true,
          },
        },
        feedbacks: {
          orderBy: { createdAt: 'desc' },
        },
        receivedCommunications: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      throw new AppError('Commerçant introuvable.', 404);
    }

    const ruleConfig = await SubscriptionAutomationService.getRuleConfig(req.prisma);
    const sub = user.subscription;
    const plan = sub?.plan;
    const statusInfo = calculateMerchantAccountStatus(user, sub);

    const primaryBiz = user.businesses[0]?.business;
    const businessIds = user.businesses.map((b: any) => b.businessId);

    // Activité réelle calculée depuis les tables Neon
    const [
      salesCount,
      salesAgg,
      productsCount,
      expensesCount,
      expensesAgg,
      customersCount,
      deliveriesCount,
      cashSessionsCount,
      auditLogs,
    ] = await Promise.all([
      req.prisma.sale.count({ where: { businessId: { in: businessIds } } }),
      req.prisma.sale.aggregate({
        where: { businessId: { in: businessIds } },
        _sum: { totalAmount: true },
      }),
      req.prisma.product.count({ where: { businessId: { in: businessIds } } }),
      req.prisma.expense.count({ where: { businessId: { in: businessIds } } }),
      req.prisma.expense.aggregate({
        where: { businessId: { in: businessIds } },
        _sum: { amount: true },
      }),
      req.prisma.customer.count({ where: { businessId: { in: businessIds } } }),
      req.prisma.delivery.count({ where: { businessId: { in: businessIds } } }),
      req.prisma.cashSession.count({ where: { businessId: { in: businessIds } } }),
      req.prisma.auditLog.findMany({
        where: {
          OR: [
            { userId: user.id },
            { entityId: user.id },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    // SECTION A : Identité & Informations Générales
    const identity = {
      id: user.id,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Commerçant',
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || 'Non renseigné',
      businessName: primaryBiz?.name || 'Non renseigné',
      businessCount: user.businesses.length,
      sector: primaryBiz?.sector || 'commerce',
      country: primaryBiz?.country || 'CM',
      currency: primaryBiz?.currency || 'XAF',
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      loginCount: user.loginCount || 0,
      status: statusInfo.code,
      statusLabel: statusInfo.label,
      statusColor: statusInfo.badgeColor,
      statusDescription: statusInfo.description,
      accountType: user.isAdmin ? 'Super Administrateur' : 'Commerçant / Marchand',
      currentPlan: plan?.displayName || (plan?.name === 'pro' ? 'Pro' : plan?.name === 'business' ? 'Business' : 'Gratuit'),
      optInMarketing: user.optInMarketing,
      isSuspended: user.isSuspended,
      suspensionType: user.suspensionType,
      suspendedReason: user.suspendedReason,
      suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
      suspendedBy: user.suspendedBy,
      securityLocked: user.securityLocked,
      securityLockedReason: user.securityLockedReason,
    };

    // SECTION B : Informations sur l'Abonnement & Chronologie
    const now = new Date();
    let daysRemaining: number | null = null;
    let nextRenewalDate: string | null = null;

    if (sub?.endDate) {
      const diffMs = new Date(sub.endDate).getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (sub.status === 'active' || sub.status === 'in_grace') {
        nextRenewalDate = sub.endDate.toISOString();
      }
    }

    const totalUsageDays = Math.max(1, Math.ceil((now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    const subscriptionInfo = {
      currentPlan: plan?.displayName || 'Gratuit',
      planKey: plan?.name || 'free',
      catalogPriceMonthly: plan?.priceMonthly || 0,
      catalogPriceYearly: plan?.priceYearly || 0,
      periodicity: sub?.plan?.name === 'free' ? 'Illimitée' : 'Mensuelle / Annuelle',
      startDate: sub?.startDate ? sub.startDate.toISOString() : user.createdAt.toISOString(),
      endDate: sub?.endDate ? sub.endDate.toISOString() : null,
      gracePeriodEndsAt: sub?.gracePeriodEndsAt ? sub.gracePeriodEndsAt.toISOString() : null,
      daysRemaining,
      lastRenewedAt: sub?.lastRenewedAt ? sub.lastRenewedAt.toISOString() : null,
      nextRenewalDate,
      renewalCount: sub?.renewalCount || 0,
      totalUsageDays,
      autoRenew: sub?.autoRenew || false,
      cancelledAt: sub?.cancelledAt ? sub.cancelledAt.toISOString() : null,
      cancelledReason: sub?.cancelledReason || null,
      eventsTimeline: (sub?.events || []).map((e: any) => ({
        id: e.id,
        eventType: e.eventType,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        createdAt: e.createdAt.toISOString(),
      })),
    };

    // SECTION C : Historique Financier Individuel & Carte de Rentabilité
    let totalConfirmedPayments = 0;
    let totalDiscounts = 0;
    let totalProviderFees = 0;
    let totalRefunds = 0;
    const completedPayments = user.payments.filter((p: any) => p.status === 'completed');

    for (const p of completedPayments as any[]) {
      totalConfirmedPayments += Number(p.amount || 0);
      totalProviderFees += Number(p.providerFee || 0);
      totalRefunds += Number(p.refundedAmount || 0);
      if (p.metadata) {
        try {
          const meta = JSON.parse(p.metadata);
          if (meta.discountAmount) totalDiscounts += Number(meta.discountAmount);
        } catch (_) {}
      }
    }

    const netRevenue = Math.max(0, totalConfirmedPayments - totalRefunds - totalProviderFees);
    const knownCac = Number(user.estimatedCac || 0);
    const supportCost = Number(user.supportCost || 0);
    const estimatedContribution = netRevenue - knownCac - supportCost;
    const averagePayment = completedPayments.length > 0 ? Math.round(totalConfirmedPayments / completedPayments.length) : 0;
    const lastPaymentAmount = completedPayments.length > 0 ? completedPayments[0].amount : 0;

    const financialHistory = {
      totalConfirmedPayments,
      paymentsCount: completedPayments.length,
      lastPaymentAmount,
      averagePayment,
      totalDiscounts,
      totalProviderFees,
      totalRefunds,
      netRevenue,
      knownCac,
      supportCost,
      estimatedContribution,
      paymentsList: user.payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        method: p.method,
        reference: p.reference,
        providerFee: p.providerFee,
        refundedAmount: p.refundedAmount,
        createdAt: p.createdAt.toISOString(),
      })),
      profitabilityCard: {
        title: "RENTABILITÉ DE L'UTILISATEUR",
        grossTurnover: totalConfirmedPayments,
        deductions: {
          refunds: totalRefunds,
          fees: totalProviderFees,
        },
        netRevenue,
        costs: {
          cacKnown: knownCac,
          supportCostKnown: supportCost,
          totalCosts: knownCac + supportCost,
        },
        estimatedContribution,
        note: 'Calcul conforme aux normes IFRS/SaaS. Le chiffre d’affaires brut n’est jamais confondu avec le bénéfice.',
      },
    };

    // SECTION D : Activité Réelle sur COMMERCIA
    const platformActivity = {
      salesCount,
      salesGmv: Number(salesAgg._sum.totalAmount || 0),
      productsCount,
      expensesCount,
      expensesVolume: Number(expensesAgg._sum.amount || 0),
      customersCount,
      deliveriesCount,
      cashSessionsCount,
      lastActivity: user.lastLoginAt ? user.lastLoginAt.toISOString() : (completedPayments[0]?.createdAt.toISOString() || user.createdAt.toISOString()),
      usageFrequency: salesCount > 50 ? 'Très active' : salesCount > 10 ? 'Régulière' : 'Occasionnelle',
      mostUsedModules: [
        salesCount > 0 ? { name: 'Ventes & Caisse', count: salesCount } : null,
        productsCount > 0 ? { name: 'Gestion des Stocks', count: productsCount } : null,
        expensesCount > 0 ? { name: 'Dépenses', count: expensesCount } : null,
        customersCount > 0 ? { name: 'Carnet Clients & Dettes', count: customersCount } : null,
        deliveriesCount > 0 ? { name: 'Livraisons', count: deliveriesCount } : null,
      ].filter(Boolean),
    };

    // SECTION E : Interactions avec le Support & Retours
    const supportInteractions = {
      feedbacks: user.feedbacks.map((f: any) => ({
        id: f.id,
        rating: f.rating,
        category: f.category,
        categoryLabel: f.categoryLabel,
        comment: f.comment,
        module: f.module,
        status: f.status,
        responseMessage: f.responseMessage,
        respondedAt: f.respondedAt ? f.respondedAt.toISOString() : null,
        createdAt: f.createdAt.toISOString(),
      })),
      communications: user.receivedCommunications.map((c: any) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        content: c.content,
        channel: c.channel,
        status: c.status,
        sentAt: c.sentAt.toISOString(),
      })),
    };

    res.json({
      identity,
      subscriptionInfo,
      financialHistory,
      platformActivity,
      supportInteractions,
      auditLogs: auditLogs.map((l: any) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        details: l.details ? JSON.parse(l.details) : null,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. CONTRÔLE MANUEL DES COMPTES (SUSPENDRE, RÉACTIVER, VERROUILLER, PROLONGER)
// =========================================================================
router.post('/merchants/:id/action', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { action, reason, days, planName, durationDays } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('Le motif de l’action est obligatoire pour le journal d’audit.', 400);
    }

    const targetUser = await req.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!targetUser) {
      throw new AppError('Commerçant introuvable.', 404);
    }

    // Protection Super Admin
    if (targetUser.email === 'admin@commercia.com' || targetUser.id === req.userId) {
      if (action === 'suspend' || action === 'security_lock') {
        throw new AppError('Action interdite : vous ne pouvez pas suspendre ou verrouiller ce Super Administrateur.', 403);
      }
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
    let resultMessage = '';

    switch (action) {
      case 'suspend': {
        await req.prisma.user.update({
          where: { id },
          data: {
            isSuspended: true,
            suspensionType: 'manual',
            suspendedReason: reason.trim(),
            suspendedBy: req.userId!,
            suspendedAt: new Date(),
          },
        });

        // Alerte commerciale
        await req.prisma.commercialAlert.create({
          data: {
            title: `Compte suspendu manuellement : ${targetUser.email}`,
            message: `L'administrateur a suspendu le compte de ${targetUser.firstName} ${targetUser.lastName}. Motif: ${reason.trim()}`,
            priority: 'high',
            category: 'user_suspended',
            userId: targetUser.id,
          },
        });

        resultMessage = `Compte ${targetUser.email} suspendu manuellement avec succès.`;
        break;
      }

      case 'reactivate': {
        await req.prisma.user.update({
          where: { id },
          data: {
            isSuspended: false,
            suspensionType: null,
            suspendedReason: null,
            suspendedBy: null,
            suspendedAt: null,
          },
        });

        resultMessage = `Compte ${targetUser.email} réactivé avec succès.`;
        break;
      }

      case 'security_lock': {
        await req.prisma.user.update({
          where: { id },
          data: {
            securityLocked: true,
            securityLockedReason: reason.trim(),
          },
        });

        resultMessage = `Compte ${targetUser.email} verrouillé pour raison de sécurité.`;
        break;
      }

      case 'security_unlock': {
        await req.prisma.user.update({
          where: { id },
          data: {
            securityLocked: false,
            securityLockedReason: null,
          },
        });

        resultMessage = `Compte ${targetUser.email} déverrouillé de la sécurité.`;
        break;
      }

      case 'extend_subscription': {
        const extensionDays = Number(days || durationDays || 30);
        if (isNaN(extensionDays) || extensionDays <= 0) {
          throw new AppError('Nombre de jours de prolongation invalide.', 400);
        }

        const currentEnd = targetUser.subscription?.endDate
          ? new Date(targetUser.subscription.endDate)
          : new Date();
        const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
        const newEndDate = new Date(baseDate.getTime() + extensionDays * 86400000);

        if (targetUser.subscription) {
          await req.prisma.subscription.update({
            where: { id: targetUser.subscription.id },
            data: {
              endDate: newEndDate,
              status: 'active',
              gracePeriodEndsAt: null,
            },
          });

          await req.prisma.subscriptionEvent.create({
            data: {
              subscriptionId: targetUser.subscription.id,
              eventType: 'extended_by_admin',
              metadata: JSON.stringify({
                extensionDays,
                previousEndDate: currentEnd.toISOString(),
                newEndDate: newEndDate.toISOString(),
                reason: reason.trim(),
                adminId: req.userId,
              }),
            },
          });
        }

        resultMessage = `Abonnement prolongé de ${extensionDays} jours (jusqu'au ${newEndDate.toLocaleDateString()}).`;
        break;
      }

      case 'change_plan': {
        if (!planName) throw new AppError('Le nom de la nouvelle formule est requis.', 400);
        const targetPlan = await req.prisma.plan.findFirst({
          where: { name: planName.toLowerCase() },
        });
        if (!targetPlan) throw new AppError(`Formule ${planName} introuvable.`, 404);

        if (targetUser.subscription) {
          await req.prisma.subscription.update({
            where: { id: targetUser.subscription.id },
            data: {
              planId: targetPlan.id,
              status: targetPlan.name === 'free' ? 'free' : 'active',
            },
          });

          await req.prisma.subscriptionEvent.create({
            data: {
              subscriptionId: targetUser.subscription.id,
              eventType: 'plan_changed_by_admin',
              metadata: JSON.stringify({
                previousPlan: targetUser.subscription.plan.name,
                newPlan: targetPlan.name,
                reason: reason.trim(),
                adminId: req.userId,
              }),
            },
          });
        }

        resultMessage = `Formule changée vers ${targetPlan.displayName}.`;
        break;
      }

      case 'cancel_subscription': {
        if (targetUser.subscription) {
          await req.prisma.subscription.update({
            where: { id: targetUser.subscription.id },
            data: {
              status: 'cancelled',
              cancelledAt: new Date(),
              cancelledReason: reason.trim(),
            },
          });

          await req.prisma.subscriptionEvent.create({
            data: {
              subscriptionId: targetUser.subscription.id,
              eventType: 'cancelled_by_admin',
              metadata: JSON.stringify({ reason: reason.trim(), adminId: req.userId }),
            },
          });
        }

        resultMessage = `Abonnement résilié avec succès.`;
        break;
      }

      default:
        throw new AppError(`Action inconnue: ${action}`, 400);
    }

    // Journal d'audit immuable
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: `MERCHANT_ACTION_${action.toUpperCase()}`,
        entity: 'User',
        entityId: targetUser.id,
        details: JSON.stringify({
          action,
          targetEmail: targetUser.email,
          reason: reason.trim(),
          adminId: req.userId,
          ipAddress: clientIp,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: clientIp,
      },
    });

    res.json({
      success: true,
      message: resultMessage,
    });
  } catch (error) {
    next(error);
  }
});

export { router as merchantsAdminRouter };
