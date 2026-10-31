import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getBusinessProfile } from '../../config/businessProfiles';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';
import { filterModulesByPlan, canPlanAccessModule } from '../../config/capabilities';
import bcrypt from 'bcryptjs';

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

// ===================== GESTION D'ÉQUIPE & DES CAISSIERS =====================

// GET /api/business/members (Liste des membres & caissiers de l'entreprise active)
router.get('/members', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const callerMembership = await req.prisma.businessMember.findFirst({
      where: { businessId, userId: req.userId, isActive: true },
    });
    if (!callerMembership) throw new AppError('Accès refusé.', 403);

    const members = await req.prisma.businessMember.findMany({
      where: { businessId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({
      members: members.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        role: m.role, // 'owner' | 'manager' | 'employee'
        isActive: m.isActive,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      currentUserRole: callerMembership.role,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/business/members (Ajouter un caissier ou collaborateur)
const addMemberSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().optional().default(''),
  phone: z.string().optional(),
  role: z.enum(['manager', 'employee']).default('employee'),
  password: z.string().min(4, 'Mot de passe ou code PIN de 4 caractères minimum requis').optional().default('123456'),
});

router.post('/members', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);

    // Vérifier les droits du demandeur (owner ou manager)
    const callerMembership = await req.prisma.businessMember.findFirst({
      where: {
        businessId,
        userId: req.userId,
        isActive: true,
        role: { in: ['owner', 'manager'] },
      },
    });
    if (!callerMembership) {
      throw new AppError('Seuls les propriétaires ou gérants peuvent ajouter des collaborateurs.', 403);
    }

    const data = addMemberSchema.parse(req.body);
    const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId!);
    const activeMembersCount = await req.prisma.businessMember.count({
      where: { businessId, isActive: true },
    });

    // Contrôle strict des quotas selon l'abonnement
    if (!subDetails.isAdmin && !subDetails.isPro && subDetails.planName === 'free') {
      throw new AppError('L\'ajout de caissiers et la gestion d\'équipe requièrent un forfait PRO ou BUSINESS.', 403);
    }
    if (!subDetails.isAdmin && subDetails.planName === 'pro' && activeMembersCount >= 3) {
      throw new AppError('Le forfait PRO est limité à 3 collaborateurs. Passez au forfait BUSINESS pour des caissiers illimités.', 403);
    }

    // Vérifier si un compte utilisateur existe déjà avec cet email
    let targetUser = await req.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (targetUser) {
      // Vérifier s'il est déjà membre de cette entreprise
      const existingMembership = await req.prisma.businessMember.findFirst({
        where: { businessId, userId: targetUser.id },
      });
      if (existingMembership) {
        if (existingMembership.isActive) {
          throw new AppError('Cet utilisateur fait déjà partie de l’équipe de cette boutique.', 409);
        } else {
          // Réactiver l'accès
          const updated = await req.prisma.businessMember.update({
            where: { id: existingMembership.id },
            data: { isActive: true, role: data.role },
            include: { user: true },
          });
          res.json({ message: 'Accès du collaborateur réactivé avec succès !', member: updated });
          return;
        }
      }
    } else {
      // Créer un compte utilisateur pour le caissier
      const passwordHash = await bcrypt.hash(data.password, 10);
      targetUser = await req.prisma.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          avatarUrl: null,
          locale: 'fr',
          currency: 'XAF',
        },
      });
    }

    const newMember = await req.prisma.businessMember.create({
      data: {
        userId: targetUser.id,
        businessId,
        role: data.role,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'create',
        entity: 'business_member',
        entityId: newMember.id,
      },
    });

    res.status(201).json({
      message: `Caissier/Collaborateur ${targetUser.firstName} ajouté avec succès !`,
      member: newMember,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/business/members/:id (Mettre à jour le rôle ou le statut d'un collaborateur)
const updateMemberSchema = z.object({
  role: z.enum(['owner', 'manager', 'employee']).optional(),
  isActive: z.boolean().optional(),
});

router.put('/members/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);

    // Seul le propriétaire peut modifier les rôles
    const callerMembership = await req.prisma.businessMember.findFirst({
      where: { businessId, userId: req.userId, isActive: true, role: 'owner' },
    });
    if (!callerMembership) {
      throw new AppError('Seul le propriétaire de l\'activité peut modifier les rôles ou statuts de l\'équipe.', 403);
    }

    const memberToUpdate = await req.prisma.businessMember.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!memberToUpdate) throw new AppError('Collaborateur introuvable.', 404);

    if (memberToUpdate.userId === req.userId && req.body.isActive === false) {
      throw new AppError('Vous ne pouvez pas désactiver votre propre accès propriétaire.', 400);
    }

    const data = updateMemberSchema.parse(req.body);
    const updated = await req.prisma.businessMember.update({
      where: { id: memberToUpdate.id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({ message: 'Rôle et statut mis à jour !', member: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/business/members/:id (Retirer un collaborateur de la boutique)
router.delete('/members/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const callerMembership = await req.prisma.businessMember.findFirst({
      where: { businessId, userId: req.userId, isActive: true, role: 'owner' },
    });
    if (!callerMembership) {
      throw new AppError('Seul le propriétaire peut retirer un collaborateur de la boutique.', 403);
    }

    const memberToDelete = await req.prisma.businessMember.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!memberToDelete) throw new AppError('Collaborateur introuvable.', 404);

    if (memberToDelete.userId === req.userId) {
      throw new AppError('Vous ne pouvez pas supprimer votre propre compte de propriétaire.', 400);
    }

    await req.prisma.businessMember.delete({ where: { id: memberToDelete.id } });

    res.json({ message: 'Collaborateur retiré avec succès de la boutique.' });
  } catch (error) {
    next(error);
  }
});

// ===================== GESTION MULTI-BOUTIQUES / SUCCURSALES =====================

// POST /api/business/branches (Créer une nouvelle boutique / succursale)
const createBranchSchema = z.object({
  name: z.string().min(1, 'Nom de la boutique requis'),
  sector: z.string().default('commerce'),
  profileId: z.string().default('epicerie_alimentation'),
  city: z.string().optional(),
  currency: z.string().default('XAF'),
  trackingMode: z.string().default('avec_stock'),
});

router.post('/branches', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId!);
    const ownedBusinessesCount = await req.prisma.businessMember.count({
      where: { userId: req.userId, role: 'owner', isActive: true },
    });

    // Contrôle strict des quotas multi-boutiques
    if (!subDetails.isAdmin && !subDetails.isPro && subDetails.planName === 'free') {
      throw new AppError('La création de plusieurs boutiques requiert un forfait PRO (jusqu’à 2 boutiques) ou BUSINESS (boutiques illimitées).', 403);
    }
    if (!subDetails.isAdmin && subDetails.planName === 'pro' && ownedBusinessesCount >= 2) {
      throw new AppError('Le forfait PRO est limité à 2 boutiques. Passez au forfait BUSINESS pour gérer un nombre illimité de points de vente.', 403);
    }

    const data = createBranchSchema.parse(req.body);
    const { getBusinessProfile } = require('../../config/businessProfiles');
    const profile = getBusinessProfile(data.profileId);

    const newBusiness = await req.prisma.business.create({
      data: {
        name: data.name,
        sector: data.sector,
        profileId: profile.id,
        activeModules: JSON.stringify(profile.recommendedModules),
        salesChannels: JSON.stringify(['boutique']),
        trackingMode: data.trackingMode || profile.defaultTrackingMode,
        address: data.city || null,
        currency: data.currency || 'XAF',
        members: {
          create: {
            userId: req.userId!,
            role: 'owner',
          },
        },
        settings: {
          create: {
            enableStock: (data.trackingMode || profile.defaultTrackingMode) === 'avec_stock' || (data.trackingMode || profile.defaultTrackingMode) === 'complet',
            enableCredits: (data.trackingMode || profile.defaultTrackingMode) === 'complet',
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // Catégories de dépenses initiales adaptées au profil
    const categoriesToCreate = profile.defaultExpenseCategories && profile.defaultExpenseCategories.length > 0
      ? profile.defaultExpenseCategories
      : [
          { name: 'Marchandise', icon: '🏬' },
          { name: 'Transport', icon: '🚚' },
          { name: 'Loyer', icon: '🏠' },
          { name: 'Électricité', icon: '💡' },
          { name: 'Salaires', icon: '👥' },
          { name: 'Autre', icon: '📋' },
        ];

    for (const cat of categoriesToCreate) {
      await req.prisma.expenseCategory.create({
        data: {
          businessId: newBusiness.id,
          name: cat.name,
          icon: cat.icon,
        },
      });
    }

    // Récupérer toutes les boutiques mises à jour de l'utilisateur
    const userBusinesses = await req.prisma.businessMember.findMany({
      where: { userId: req.userId, isActive: true },
      include: { business: true },
    });

    res.status(201).json({
      message: `Nouvelle boutique « ${newBusiness.name} » créée avec succès ! 🎉`,
      business: newBusiness,
      allBusinesses: userBusinesses.map((bm: any) => ({
        id: bm.business.id,
        name: bm.business.name,
        sector: bm.business.sector,
        profileId: bm.business.profileId,
        trackingMode: bm.business.trackingMode,
        currency: bm.business.currency,
        role: bm.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export { router as businessRouter };


