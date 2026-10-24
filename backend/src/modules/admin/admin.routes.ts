import { Router } from 'express';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';

const router = Router();
router.use(authenticate);

// Middleware vérifiant strictement les droits administrateur
const requireAdmin = async (req: AuthRequest, _res: any, next: any) => {
  const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !user.isAdmin) {
    return next(new AppError('Accès réservé aux administrateurs autorisés.', 403));
  }
  next();
};

router.use(requireAdmin);

// GET /api/admin/stats — Métriques SaaS globales
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      totalSales,
      payments,
      subscriptions,
      recentUsersRaw,
    ] = await Promise.all([
      req.prisma.user.count(),
      req.prisma.business.count(),
      req.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      req.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      req.prisma.subscription.findMany({
        include: { plan: true },
      }),
      req.prisma.user.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          businesses: { include: { business: true } },
          subscription: { include: { plan: true } },
        },
      }),
    ]);

    // Calcul du MRR réel basé sur les abonnements actifs confirmés
    let mrr = 0;
    const now = new Date();
    let activeSubsCount = 0;
    let expiredSubsCount = 0;
    let freeCount = 0;

    for (const sub of subscriptions) {
      const isPaid = sub.plan && (sub.plan.name === 'pro' || sub.plan.name === 'business');
      const isActive = sub.status === 'active' && (!sub.endDate || new Date(sub.endDate) > now);
      if (isPaid && isActive) {
        activeSubsCount++;
        mrr += sub.plan.priceMonthly || 4500;
      } else if (sub.status === 'expired' || (isPaid && sub.endDate && new Date(sub.endDate) <= now)) {
        expiredSubsCount++;
      } else {
        freeCount++;
      }
    }

    const recentUsers = await Promise.all(
      recentUsersRaw.map(async (u: any) => {
        const subDetails = await getUserSubscriptionDetails(req.prisma, u.id);
        return {
          id: u.id,
          email: u.email,
          name: `${u.firstName} ${u.lastName}`.trim(),
          phone: u.phone,
          createdAt: u.createdAt,
          isActive: u.isActive,
          isAdmin: u.isAdmin,
          businessCount: u.businesses.length,
          plan: subDetails.planDisplayName,
          planName: subDetails.planName,
          status: subDetails.status,
          isPro: subDetails.isPro,
          endDate: subDetails.endDate,
          daysRemaining: subDetails.daysRemaining,
        };
      })
    );

    res.json({
      metrics: {
        totalUsers,
        totalBusinesses,
        totalSalesVolume: totalSales._sum.totalAmount || 0,
        totalSalesCount: totalSales._count.id,
        activeSubscriptionsCount: activeSubsCount,
        expiredSubscriptionsCount: expiredSubsCount,
        freeUsersCount: freeCount,
        totalPaymentsCount: payments.length,
        completedPaymentsCount: payments.filter((p: any) => p.status === 'completed').length,
        estimatedMRR: mrr,
      },
      recentUsers,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users — Liste complète des utilisateurs avec statut réel Free vs Pro
router.get('/users', async (req: AuthRequest, res, next) => {
  try {
    const users = await req.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        businesses: { include: { business: true } },
        subscription: { include: { plan: true } },
      },
    });

    const enrichedUsers = await Promise.all(
      users.map(async (u: any) => {
        const subDetails = await getUserSubscriptionDetails(req.prisma, u.id);
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          isAdmin: u.isAdmin,
          isActive: u.isActive,
          createdAt: u.createdAt,
          businesses: u.businesses.map((bm: any) => ({
            id: bm.business.id,
            name: bm.business.name,
            sector: bm.business.sector,
          })),
          subscription: {
            planName: subDetails.planName,
            planDisplayName: subDetails.planDisplayName,
            status: subDetails.status,
            isPro: subDetails.isPro,
            startDate: subDetails.startDate,
            endDate: subDetails.endDate,
            daysRemaining: subDetails.daysRemaining,
          },
        };
      })
    );

    res.json(enrichedUsers);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/payments — Historique de toutes les transactions et paiements
router.get('/payments', async (req: AuthRequest, res, next) => {
  try {
    const payments = await req.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        plan: true,
      },
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/subscriptions — Gestion de tous les abonnements (actifs, expirés, en attente)
router.get('/subscriptions', async (req: AuthRequest, res, next) => {
  try {
    const subs = await req.prisma.subscription.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            businesses: { include: { business: true } },
          },
        },
        plan: true,
      },
    });

    const now = new Date();
    const formatted = subs.map((s: any) => {
      const isPaid = s.plan && (s.plan.name === 'pro' || s.plan.name === 'business');
      const isExpired = s.endDate && new Date(s.endDate) <= now;
      let effectiveStatus = s.status;
      if (isPaid && isExpired && s.status === 'active') {
        effectiveStatus = 'expired';
      }

      const daysRemaining = s.endDate
        ? Math.max(0, Math.ceil((new Date(s.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        id: s.id,
        userId: s.userId,
        userEmail: s.user.email,
        userName: `${s.user.firstName} ${s.user.lastName}`.trim(),
        businessName: s.user.businesses?.[0]?.business?.name || 'Boutique',
        plan: s.plan.name,
        planDisplayName: s.plan.displayName,
        status: effectiveStatus,
        startDate: s.startDate,
        endDate: s.endDate,
        daysRemaining,
        lastPaymentId: s.lastPaymentId,
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/audit-logs — Traçabilité des actions administratives
router.get('/audit-logs', async (req: AuthRequest, res, next) => {
  try {
    const logs = await req.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/toggle — Activer / Suspendre un utilisateur
router.put('/users/:id/toggle', async (req: AuthRequest, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('Utilisateur non trouvé.', 404);

    const updated = await req.prisma.user.update({
      where: { id: user.id },
      data: { isActive: !user.isActive },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: updated.isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ targetEmail: user.email }),
      },
    });

    res.json({
      message: `Compte ${updated.isActive ? 'réactivé' : 'suspendu'}.`,
      isActive: updated.isActive,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/subscription — Accorder ou révoquer manuellement un accès Pro (avec traçabilité d'audit obligatoire)
router.put('/users/:id/subscription', async (req: AuthRequest, res, next) => {
  try {
    const { planName, days, motif } = req.body;
    if (!motif || !motif.trim()) {
      throw new AppError('Un motif écrit obligatoire est exigé pour toute modification manuelle d\'abonnement.', 400);
    }

    const user = await req.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('Utilisateur non trouvé.', 404);

    const targetPlanName = planName === 'business' ? 'business' : planName === 'pro' ? 'pro' : 'free';
    const plan = await req.prisma.plan.findUnique({ where: { name: targetPlanName } });
    if (!plan) throw new AppError('Plan invalide.', 400);

    const durationDays = Number(days) || 30;
    const now = new Date();
    const isFree = plan.name === 'free';
    const endDate = isFree ? null : new Date(now.getTime() + durationDays * 86400000);
    const newStatus = isFree ? 'free' : 'active';

    const subscription = await req.prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        planId: plan.id,
        status: newStatus,
        startDate: now,
        endDate,
      },
      create: {
        userId: user.id,
        planId: plan.id,
        status: newStatus,
        startDate: now,
        endDate,
      },
      include: { plan: true },
    });

    // Journal d'audit obligatoire pour traçabilité administrative stricte
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: isFree ? 'MANUAL_PRO_REVOKED' : 'MANUAL_PRO_GRANTED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: JSON.stringify({
          adminId: req.userId,
          targetUserId: user.id,
          targetEmail: user.email,
          previousPlan: plan.name,
          newPlan: targetPlanName,
          durationDays: isFree ? 0 : durationDays,
          motif: motif.trim(),
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Notification à l'utilisateur
    try {
      await req.prisma.notification.create({
        data: {
          userId: user.id,
          type: isFree ? 'debt_reminder' : 'sales_up',
          title: isFree ? 'Votre formule est passée en Gratuit' : `Accès ${plan.displayName} accordé`,
          message: isFree
            ? `Votre abonnement a été révoqué par l'administration. Motif : ${motif.trim()}`
            : `Un accès à la formule ${plan.displayName} vous a été octroyé manuellement pour ${durationDays} jours.`,
          actionUrl: '/subscription',
        },
      });
    } catch (e) {
      /* ignorer */
    }

    res.json({
      message: `Abonnement mis à jour avec succès : ${plan.displayName}`,
      subscription: {
        id: subscription.id,
        plan: plan.name,
        displayName: plan.displayName,
        status: subscription.status,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };
