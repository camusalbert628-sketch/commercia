import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';

const router = Router();

// =========================================================================
// TABLEAU DE BORD DE PERFORMANCE & RENTABILITÉ CLIENTS (SAAS KPIs)
// =========================================================================
router.get('/analytics/profitability', async (req: AuthRequest, res: Response, next) => {
  try {
    const timeframe = ((req.query.timeframe as string) || 'month').toLowerCase();
    const now = new Date();

    // Définition de la borne de début selon la période
    let periodStart = new Date();
    switch (timeframe) {
      case 'today':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        periodStart = new Date(0);
        break;
      case 'month':
      default:
        periodStart.setMonth(now.getMonth() - 1);
        break;
    }

    // Récupération de tous les utilisateurs et abonnements marchands (exclusion stricte des comptes admin)
    const [allUsers, allSubscriptions, periodPayments, allCompletedPayments, salesAgg] = await Promise.all([
      req.prisma.user.findMany({
        where: { isAdmin: false },
        include: {
          businesses: { include: { business: true } },
          subscription: { include: { plan: true } },
          payments: { where: { status: 'completed' } },
        },
      }),
      req.prisma.subscription.findMany({
        where: { user: { isAdmin: false } },
        include: { plan: true },
      }),
      req.prisma.payment.findMany({
        where: {
          status: 'completed',
          user: { isAdmin: false },
          createdAt: { gte: periodStart },
        },
      }),
      req.prisma.payment.findMany({
        where: { status: 'completed', user: { isAdmin: false } },
      }),
      req.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const totalUsers = allUsers.length;
    let payingUsers = 0;
    let freeUsers = 0;
    let activeSubscriptions = 0;
    let expiredSubscriptions = 0;
    let totalRenewals = 0;
    let totalSuspensions = 0;
    let mrr = 0;

    for (const sub of allSubscriptions) {
      const isPaid = sub.plan && sub.plan.name !== 'free' && sub.plan.name !== 'admin';
      if (isPaid) {
        payingUsers++;
        if (sub.status === 'active' || sub.status === 'in_grace') {
          activeSubscriptions++;
          // Normalisation mensuelle du MRR
          mrr += Number(sub.plan?.priceMonthly || 0);
        } else if (sub.status === 'expired') {
          expiredSubscriptions++;
        }
      } else {
        freeUsers++;
      }

      totalRenewals += Number(sub.renewalCount || 0);
      if (sub.suspendedAt) {
        totalSuspensions++;
      }
    }

    const arr = mrr * 12;

    // Revenus reconnus sur la période
    let periodGross = 0;
    let periodRefunds = 0;
    let periodFees = 0;

    for (const p of periodPayments) {
      periodGross += Number(p.amount || 0);
      periodRefunds += Number(p.refundedAmount || 0);
      periodFees += Number(p.providerFee || 0);
    }

    const periodNetRevenue = Math.max(0, periodGross - periodRefunds - periodFees);

    // Calcul de l'ARPU et ARPPU
    const arpu = totalUsers > 0 ? Math.round(periodNetRevenue / totalUsers) : 0;
    const arppu = payingUsers > 0 ? Math.round(periodNetRevenue / payingUsers) : 0;

    // Calcul du Churn et de la Rétention
    // Taux de Churn = (Abonnements expirés ou résiliés sur la période / Total clients début de période) * 100
    const churnedSubs = allSubscriptions.filter(
      (s: any) => s.status === 'expired' || s.status === 'cancelled'
    ).length;
    const baseClientCount = Math.max(1, activeSubscriptions + churnedSubs);
    const churnRate = Math.min(100, Math.round((churnedSubs / baseClientCount) * 1000) / 10);
    const retentionRate = Math.max(0, Math.round((100 - churnRate) * 10) / 10);

    // CAC moyen réel (ou 0 si non configuré)
    let totalKnownCac = 0;
    let cacEntriesCount = 0;
    let totalKnownSupport = 0;

    for (const u of allUsers as any[]) {
      if (u.estimatedCac) {
        totalKnownCac += Number(u.estimatedCac);
        cacEntriesCount++;
      }
      if (u.supportCost) {
        totalKnownSupport += Number(u.supportCost);
      }
    }

    const averageCac = cacEntriesCount > 0 ? Math.round(totalKnownCac / cacEntriesCount) : 0;

    // LTV (Customer Lifetime Value) estimée : ARPU / (ChurnRate mensualisé) ou ARPU moyen * durée moyenne de vie
    const monthlyChurnFactor = churnRate > 0 ? churnRate / 100 : 0.05;
    const ltv = arppu > 0 ? Math.round(arppu / monthlyChurnFactor) : 0;

    // =======================================================================
    // CLASSEMENT DES UTILISATEURS (TOP CLIENTS)
    // =======================================================================
    const userRankings = allUsers.map((u: any) => {
      let uGross = 0;
      let uRefunds = 0;
      let uFees = 0;

      for (const p of u.payments) {
        uGross += Number(p.amount || 0);
        uRefunds += Number(p.refundedAmount || 0);
        uFees += Number(p.providerFee || 0);
      }

      const uNetRevenue = Math.max(0, uGross - uRefunds - uFees);
      const uCac = Number(u.estimatedCac || 0);
      const uSupport = Number(u.supportCost || 0);
      const uContribution = uNetRevenue - uCac - uSupport;

      const sub = u.subscription;
      const renewalCount = sub?.renewalCount || 0;
      const primaryBiz = u.businesses[0]?.business;

      const seniorityDays = Math.max(
        1,
        Math.ceil((now.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Commerçant',
        email: u.email,
        phone: u.phone,
        businessName: primaryBiz?.name || 'Boutique',
        plan: sub?.plan?.displayName || 'Gratuit',
        planKey: sub?.plan?.name || 'free',
        status: sub?.status || 'free',
        grossRevenue: uGross,
        netRevenue: uNetRevenue,
        cac: uCac,
        supportCost: uSupport,
        estimatedContribution: uContribution,
        renewalCount,
        seniorityDays,
        paymentsCount: u.payments.length,
        createdAt: u.createdAt.toISOString(),
      };
    });

    // Classements par catégories
    const topByNetRevenue = [...userRankings]
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .slice(0, 10);

    const topByContribution = [...userRankings]
      .sort((a, b) => b.estimatedContribution - a.estimatedContribution)
      .slice(0, 10);

    const topByLoyalty = [...userRankings]
      .sort((a, b) => b.renewalCount - a.renewalCount || b.seniorityDays - a.seniorityDays)
      .slice(0, 10);

    // Totaux globaux de la plateforme
    let totalAllGross = 0;
    let totalAllRefunds = 0;
    let totalAllFees = 0;
    for (const p of allCompletedPayments) {
      totalAllGross += Number(p.amount || 0);
      totalAllRefunds += Number(p.refundedAmount || 0);
      totalAllFees += Number(p.providerFee || 0);
    }
    const totalAllNet = Math.max(0, totalAllGross - totalAllRefunds - totalAllFees);

    res.json({
      timeframe,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      kpis: {
        totalUsers,
        payingUsers,
        freeUsers,
        activeSubscriptions,
        expiredSubscriptions,
        totalRenewals,
        totalSuspensions,
        mrr,
        arr,
        arpu,
        arppu,
        cac: averageCac,
        ltv,
        churnRate,
        retentionRate,
        periodGross,
        periodNetRevenue,
        totalLifetimeNetRevenue: totalAllNet,
        totalGmv: Number(salesAgg._sum.totalAmount || 0),
        totalTransactions: salesAgg._count.id || 0,
      },
      rankings: {
        topByNetRevenue,
        topByContribution,
        topByLoyalty,
      },
      definitions: {
        mrr: 'Somme des revenus récurrents mensuels normalisés des abonnements payants actifs.',
        arr: 'MRR × 12 mois.',
        arpu: 'Revenu net reconnu sur la période / Nombre total d’utilisateurs.',
        arppu: 'Revenu net reconnu sur la période / Nombre d’utilisateurs payants.',
        netRevenue: 'Paiements confirmés − Remboursements − Commissions de paiement.',
        financialContribution: 'Revenu net − Coût d’acquisition client (CAC) − Coût de support attribuable.',
        churnRate: 'Taux d’attrition : (Clients perdus sur la période / Base clients actifs au début) × 100.',
        retentionRate: '100% − Taux d’attrition.',
        ltv: 'Valeur vie client estimée : ARPPU / Taux de Churn.',
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as profitabilityAdminRouter };
