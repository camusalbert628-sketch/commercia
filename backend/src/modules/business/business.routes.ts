import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getBusinessProfile } from '../../config/businessProfiles';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';
import { filterModulesByPlan, canPlanAccessModule } from '../../config/capabilities';

const router = Router();

// GET /api/business/current
router.get('/current', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const business = await req.prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId: req.userId, isActive: true } },
      },
      include: {
        settings: true,
      },
    });

    if (!business) {
      throw new AppError('Entreprise non trouvée ou accès non autorisé.', 404);
    }

    const profileConfig = getBusinessProfile(business.profileId);
    let activeModules: string[] = [];
    try {
      activeModules = JSON.parse(business.activeModules || '[]');
    } catch (e) {
      activeModules = profileConfig.recommendedModules;
    }

    let salesChannels: string[] = [];
    try {
      salesChannels = JSON.parse(business.salesChannels || '["boutique"]');
    } catch (e) {
      salesChannels = ['boutique'];
    }

    res.json({
      business: {
        ...business,
        activeModules,
        salesChannels,
        profileConfig,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/business/profile (Mise à jour adaptative du profil et des modules)
const updateBusinessProfileSchema = z.object({
  name: z.string().min(1).optional(),
  profileId: z.string().optional(),
  trackingMode: z.enum(['simple', 'avec_stock', 'complet']).optional(),
  activeModules: z.array(z.string()).optional(),
  salesChannels: z.array(z.string()).optional(),
  businessConfig: z.record(z.any()).optional(),
  currency: z.string().optional(),
  dailySalesEstimate: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    // Vérifier les droits (owner ou manager)
    const membership = await req.prisma.businessMember.findFirst({
      where: {
        businessId,
        userId: req.userId,
        isActive: true,
        role: { in: ['owner', 'manager'] },
      },
    });
    if (!membership) {
      throw new AppError('Seuls les propriétaires ou gérants peuvent modifier les réglages de l’activité.', 403);
    }

    const data = updateBusinessProfileSchema.parse(req.body);
    const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId!);

    const updatePayload: any = {};
    if (data.name) updatePayload.name = data.name;
    if (data.profileId) updatePayload.profileId = data.profileId;
    if (data.trackingMode) updatePayload.trackingMode = data.trackingMode;

    if (data.activeModules) {
      // Filtrer rigoureusement selon les capacités du plan si l'utilisateur n'est pas admin
      const sanitizedModules = subDetails.isAdmin
        ? data.activeModules
        : filterModulesByPlan(subDetails.planName, data.activeModules);
      updatePayload.activeModules = JSON.stringify(sanitizedModules);
    }

    if (data.salesChannels) updatePayload.salesChannels = JSON.stringify(data.salesChannels);
    if (data.businessConfig) updatePayload.businessConfig = JSON.stringify(data.businessConfig);
    if (data.currency) updatePayload.currency = data.currency;
    if (data.dailySalesEstimate) updatePayload.dailySalesEstimate = data.dailySalesEstimate;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.phone !== undefined) updatePayload.phone = data.phone;

    const updated = await req.prisma.business.update({
      where: { id: businessId },
      data: updatePayload,
      include: { settings: true },
    });

    // Mettre à jour les paramètres de stock / crédit si le trackingMode change
    if (data.trackingMode) {
      await req.prisma.businessSettings.upsert({
        where: { businessId },
        update: {
          enableStock: data.trackingMode === 'avec_stock' || data.trackingMode === 'complet',
          enableCredits: data.trackingMode === 'complet',
        },
        create: {
          businessId,
          enableStock: data.trackingMode === 'avec_stock' || data.trackingMode === 'complet',
          enableCredits: data.trackingMode === 'complet',
        },
      });
    }

    res.json({
      message: 'Profil d’activité et modules mis à jour avec succès !',
      business: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/business/profiles-catalog (Retourne les 20 profils configurés)
router.get('/profiles-catalog', (_req: AuthRequest, res: Response) => {
  const { getProfilesGroupedByFamily, BUSINESS_PROFILES } = require('../../config/businessProfiles');
  res.json({
    families: getProfilesGroupedByFamily(),
    profiles: BUSINESS_PROFILES,
  });
});

// GET /api/business/trade-dashboard (Calcul en temps réel des KPI métier spécifiques)
router.get('/trade-dashboard', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const business = await req.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new AppError('Entreprise introuvable.', 404);

    const profileId = business.profileId || 'epicerie_alimentation';
    const profile = getBusinessProfile(profileId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Métriques Restauration / Boulangerie (Food Prep)
    let foodPrepMetrics = null;
    if (profile.recommendedModules.includes('food_preparation')) {
      const [recipesCount, activePreps] = await Promise.all([
        req.prisma.recipe.count({ where: { businessId, isActive: true } }),
        req.prisma.mealPreparation.findMany({
          where: { businessId, preparationDate: { gte: todayStart } },
        }),
      ]);

      const portionsPrepared = activePreps.reduce((acc: number, p: any) => acc + (p.portionsPrepared || 0), 0);
      const portionsSold = activePreps.reduce((acc: number, p: any) => acc + (p.portionsSold || 0), 0);
      const portionsRemaining = activePreps.reduce((acc: number, p: any) => acc + (p.portionsRemaining || 0), 0);
      const portionsLost = activePreps.reduce((acc: number, p: any) => acc + (p.portionsLost || 0), 0);
      const sellThroughRate = portionsPrepared > 0 ? Math.round((portionsSold / portionsPrepared) * 100) : 0;

      foodPrepMetrics = {
        recipesCount,
        portionsPrepared,
        portionsSold,
        portionsRemaining,
        portionsLost,
        sellThroughRate,
      };
    }

    // 2. Métriques Commandes / Devis / Prestations (Service Orders)
    let serviceOrdersMetrics = null;
    if (profile.recommendedModules.includes('service_orders')) {
      const [pendingOrders, readyOrders, deliveredToday, allActiveOrders] = await Promise.all([
        req.prisma.serviceOrder.count({
          where: { businessId, status: { in: ['en_attente', 'en_cours'] } },
        }),
        req.prisma.serviceOrder.count({
          where: { businessId, status: 'pret' },
        }),
        req.prisma.serviceOrder.count({
          where: { businessId, status: 'livre', updatedAt: { gte: todayStart } },
        }),
        req.prisma.serviceOrder.findMany({
          where: { businessId, status: { notIn: ['annule', 'devis'] } },
          select: { advancePaid: true, balanceDue: true, agreedAmount: true },
        }),
      ]);

      const totalBalanceDue = allActiveOrders.reduce((acc: number, o: any) => acc + (o.balanceDue || 0), 0);
      const totalAdvanceCollected = allActiveOrders.reduce((acc: number, o: any) => acc + (o.advancePaid || 0), 0);

      serviceOrdersMetrics = {
        pendingOrders,
        readyOrders,
        deliveredToday,
        totalBalanceDue,
        totalAdvanceCollected,
      };
    }

    // 3. Métriques Mobile Money
    let mobileMoneyMetrics = null;
    if (profile.recommendedModules.includes('mobile_money_ops') || profileId === 'agence_mobile_money') {
      const todayOps = await req.prisma.mobileMoneyOperation.findMany({
        where: { businessId, operationDate: { gte: todayStart } },
      });

      const operationsCount = todayOps.length;
      const totalCommissionsEarned = todayOps.reduce((acc: number, o: any) => acc + (o.commissionEarned || 0), 0);
      const totalVolume = todayOps.reduce((acc: number, o: any) => acc + (o.clientAmount || 0), 0);
      const depositsVolume = todayOps.filter((o: any) => o.type === 'depot').reduce((acc: number, o: any) => acc + (o.clientAmount || 0), 0);
      const withdrawalsVolume = todayOps.filter((o: any) => o.type === 'retrait').reduce((acc: number, o: any) => acc + (o.clientAmount || 0), 0);

      mobileMoneyMetrics = {
        operationsCount,
        totalCommissionsEarned,
        totalVolume,
        depositsVolume,
        withdrawalsVolume,
        netCashFlow: depositsVolume - withdrawalsVolume + totalCommissionsEarned,
      };
    }

    // 4. Métriques Friperie & Lots commerciaux
    let lotsMetrics = null;
    if (profile.recommendedModules.includes('commercial_lots') || profileId === 'friperie_vetements') {
      const activeLots = await req.prisma.commercialLot.findMany({
        where: { businessId, status: 'active' },
        include: { items: true },
      });

      const lotsCount = activeLots.length;
      let totalPiecesInitial = 0;
      let totalPiecesSold = 0;
      let totalCostInvested = 0;
      let totalSalesGenerated = 0;

      for (const lot of activeLots) {
        totalCostInvested += (lot.purchaseCost || 0) + (lot.shippingCost || 0) + (lot.customsCost || 0) + (lot.otherCosts || 0);
        for (const item of lot.items) {
          totalPiecesInitial += item.initialQuantity || 0;
          totalPiecesSold += item.soldQuantity || 0;
          totalSalesGenerated += (item.soldQuantity || 0) * (item.targetUnitPrice || 0);
        }
      }

      const averageSellThrough = totalPiecesInitial > 0 ? Math.round((totalPiecesSold / totalPiecesInitial) * 100) : 0;
      const netLotsMargin = totalSalesGenerated - totalCostInvested;

      lotsMetrics = {
        lotsCount,
        totalPiecesInitial,
        totalPiecesSold,
        totalPiecesRemaining: Math.max(0, totalPiecesInitial - totalPiecesSold),
        averageSellThrough,
        totalCostInvested,
        totalSalesGenerated,
        netLotsMargin,
      };
    }

    // 5. Métriques Commerce Général / Stock & Crédits
    const [lowStockCount, totalDebtors, pendingDebtsSum] = await Promise.all([
      req.prisma.product.count({
        where: { businessId, stockQuantity: { lte: 5 } },
      }),
      req.prisma.customer.count({
        where: { businessId, totalOwed: { gt: 0 } },
      }),
      req.prisma.customer.aggregate({
        where: { businessId, totalOwed: { gt: 0 } },
        _sum: { totalOwed: true },
      }),
    ]);

    const generalMetrics = {
      lowStockCount,
      debtorsCount: totalDebtors,
      totalDebtsAmount: pendingDebtsSum._sum.totalOwed || 0,
    };

    res.json({
      profileId,
      profileName: profile.name,
      currency: business.currency || 'FCFA',
      foodPrepMetrics,
      serviceOrdersMetrics,
      mobileMoneyMetrics,
      lotsMetrics,
      generalMetrics,
    });
  } catch (error) {
    next(error);
  }
});

export { router as businessRouter };

