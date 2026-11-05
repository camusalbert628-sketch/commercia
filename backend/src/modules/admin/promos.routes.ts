import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// =========================================================================
// 1. LISTE DES CODES PROMOTIONNELS & STATISTIQUES COMMERCIALES RÉELLES
// =========================================================================
router.get('/promos', async (req: AuthRequest, res: Response, next) => {
  try {
    const promos = await req.prisma.promotionCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        redemptions: {
          orderBy: { redeemedAt: 'desc' },
        },
        beneficiaries: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                isActive: true,
                isSuspended: true,
                subscription: {
                  select: {
                    status: true,
                    plan: { select: { name: true } },
                  },
                },
                businesses: {
                  select: {
                    business: { select: { name: true } },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const now = new Date();

    const formatted = await Promise.all(
      promos.map(async (p: any) => {
        const uniqueUserIds = new Set(p.redemptions.map((r: any) => r.userId));
        const totalDiscountsGiven = p.redemptions.reduce(
          (sum: number, r: any) => sum + Number(r.discountAmount || 0),
          0
        );

        // Récupération des paiements associés confirmés en base
        const paymentIds = p.redemptions.map((r: any) => r.paymentId).filter(Boolean) as string[];
        const associatedPayments =
          paymentIds.length > 0
            ? await req.prisma.payment.findMany({
                where: { id: { in: paymentIds }, status: 'completed' },
              })
            : [];

        let associatedGross = 0;
        let associatedNet = 0;
        for (const pay of associatedPayments as any[]) {
          associatedGross += Number(pay.amount || 0);
          associatedNet +=
            Number(pay.amount || 0) - Number(pay.providerFee || 0) - Number(pay.refundedAmount || 0);
        }

        const isExpired = p.validUntil ? new Date(p.validUntil).getTime() < now.getTime() : false;
        const isQuotaReached = p.currentUses >= p.maxUses;

        let statusText = 'Actif';
        if (!p.isActive) statusText = 'Désactivé';
        else if (isExpired) statusText = 'Expiré';
        else if (isQuotaReached) statusText = 'Quota atteint';

        // Détails des utilisateurs ayant consommé le code
        const redemptionsList = await Promise.all(
          p.redemptions.map(async (r: any) => {
            const user = await req.prisma.user.findUnique({
              where: { id: r.userId },
              select: { firstName: true, lastName: true, email: true },
            });
            return {
              id: r.id,
              userId: r.userId,
              userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Commerçant',
              userEmail: user?.email || 'N/A',
              discountAmount: r.discountAmount,
              redeemedAt: r.redeemedAt.toISOString(),
            };
          })
        );

        // Détails des bénéficiaires autorisés
        const beneficiariesList = p.beneficiaries.map((b: any) => {
          const u = b.user;
          return {
            id: b.id,
            userId: b.userId,
            fullName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Commerçant' : 'Inconnu',
            email: u?.email || 'N/A',
            phone: u?.phone || null,
            businessName: u?.businesses?.[0]?.business?.name || 'Boutique',
            plan: u?.subscription?.plan?.name || 'free',
            notified: b.notified,
            viewedAt: b.viewedAt ? b.viewedAt.toISOString() : null,
            usedAt: b.usedAt ? b.usedAt.toISOString() : null,
            createdAt: b.createdAt.toISOString(),
          };
        });

        const remainingUses = Math.max(0, p.maxUses - p.currentUses);

        return {
          id: p.id,
          code: p.code,
          name: p.name || `Campagne ${p.code}`,
          description: p.description,
          distributionType: p.distributionType || 'broadcast', // personal, group, broadcast
          discountType: p.discountType,
          discountValue: p.discountValue,
          minOrderAmount: p.minOrderAmount,
          maxDiscount: p.maxDiscount,
          maxUses: p.maxUses,
          currentUses: p.currentUses,
          remainingUses,
          maxUsesPerUser: p.maxUsesPerUser,
          validFrom: p.validFrom.toISOString(),
          validUntil: p.validUntil ? p.validUntil.toISOString() : null,
          applicablePlans: p.applicablePlans ? JSON.parse(p.applicablePlans) : ['pro', 'business'],
          applicableCycles: p.applicableCycles ? JSON.parse(p.applicableCycles) : ['monthly', 'yearly'],
          allowNew: p.allowNew !== false,
          allowRenewal: p.allowRenewal !== false,
          isActive: p.isActive,
          statusText,
          beneficiariesCount: p.beneficiaries.length,
          beneficiariesList,
          stats: {
            totalUses: p.currentUses,
            remainingUses,
            uniqueUsersCount: uniqueUserIds.size,
            confirmedPaymentsCount: associatedPayments.length,
            totalDiscountsGiven,
            associatedGrossTurnover: associatedGross,
            associatedNetRevenue: associatedNet,
            lastUsedAt: p.redemptions[0]?.redeemedAt ? p.redemptions[0].redeemedAt.toISOString() : null,
          },
          redemptionsList,
          createdAt: p.createdAt.toISOString(),
        };
      })
    );

    res.json({ promos: formatted, total: formatted.length });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. CRÉATION D'UNE OFFRE PROMO (MODE A: PERSONNEL, MODE B: GROUPÉ, MODE C: GÉNÉRAL)
// =========================================================================
router.post('/promos', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      name,
      code,
      description,
      distributionType, // 'personal' | 'group' | 'broadcast'
      targetUserIds, // array de string (1 ID si personal, plusieurs si group)
      discountType, // 'percent' | 'fixed'
      discountValue,
      minOrderAmount,
      maxDiscount,
      maxUses,
      maxUsesPerUser,
      validFrom,
      validUntil,
      applicablePlans,
      applicableCycles,
      allowNew,
      allowRenewal,
      isActive,
    } = req.body || {};

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new AppError('Le code promotionnel est obligatoire.', 400);
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    const existing = await req.prisma.promotionCode.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      throw new AppError(`Le code promo "${cleanCode}" existe déjà.`, 400);
    }

    const value = Number(discountValue);
    if (isNaN(value) || value <= 0) {
      throw new AppError('La valeur de la réduction doit être strictement positive.', 400);
    }

    if (discountType === 'percent' && value > 100) {
      throw new AppError('Le pourcentage de réduction ne peut pas excéder 100%.', 400);
    }

    const validDistribution = ['personal', 'group', 'broadcast'].includes(distributionType)
      ? distributionType
      : 'broadcast';

    // Détermination et validation des bénéficiaires selon le mode
    let resolvedUserIds: string[] = [];

    if (validDistribution === 'personal') {
      if (!Array.isArray(targetUserIds) || targetUserIds.length === 0 || !targetUserIds[0]) {
        throw new AppError('Veuillez sélectionner un commerçant destinataire pour le code personnel.', 400);
      }
      const targetUser = await req.prisma.user.findUnique({ where: { id: targetUserIds[0] } });
      if (!targetUser) throw new AppError('Utilisateur destinataire introuvable.', 404);
      resolvedUserIds = [targetUser.id];
    } else if (validDistribution === 'group') {
      if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new AppError('Veuillez sélectionner au moins un commerçant pour la campagne groupée.', 400);
      }
      const validUsers = await req.prisma.user.findMany({
        where: { id: { in: targetUserIds }, isAdmin: false },
        select: { id: true },
      });
      if (validUsers.length === 0) {
        throw new AppError('Aucun commerçant valide trouvé dans la sélection.', 400);
      }
      resolvedUserIds = validUsers.map((u: any) => u.id);
    } else if (validDistribution === 'broadcast') {
      // Tous les commerçants actifs non-admin
      const allActive = await req.prisma.user.findMany({
        where: { isAdmin: false, isActive: true },
        select: { id: true },
      });
      resolvedUserIds = allActive.map((u: any) => u.id);
    }

    // 1. Création transactionnelle du code promotionnel
    const calculatedMaxUses =
      validDistribution === 'personal'
        ? Math.max(1, Number(maxUsesPerUser) || 1)
        : validDistribution === 'group'
        ? resolvedUserIds.length * (Number(maxUsesPerUser) || 1)
        : Math.max(1, Number(maxUses) || 500);

    const newPromo = await req.prisma.promotionCode.create({
      data: {
        code: cleanCode,
        name: name?.trim() || `Offre Spéciale ${cleanCode}`,
        description: description?.trim() || null,
        distributionType: validDistribution,
        discountType: discountType === 'fixed' ? 'fixed' : 'percent',
        discountValue: value,
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        maxUses: calculatedMaxUses,
        maxUsesPerUser: Math.max(1, Number(maxUsesPerUser) || 1),
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        applicablePlans: Array.isArray(applicablePlans) ? JSON.stringify(applicablePlans) : '["pro","business"]',
        applicableCycles: Array.isArray(applicableCycles) ? JSON.stringify(applicableCycles) : '["monthly","yearly"]',
        allowNew: allowNew !== false,
        allowRenewal: allowRenewal !== false,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdBy: req.userId || null,
      },
    });

    // 2. Création des bénéficiaires autorisés pour le suivi et les notifications indépendantes
    if (resolvedUserIds.length > 0) {
      await req.prisma.promotionBeneficiary.createMany({
        data: resolvedUserIds.map((userId) => ({
          promoCodeId: newPromo.id,
          userId,
          notified: true,
          dismissedNotification: false,
        })),
        skipDuplicates: true,
      });
    }

    // 3. Journal d'audit de sécurité
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'PROMO_CODE_CAMPAIGN_CREATED',
        entity: 'PromotionCode',
        entityId: newPromo.id,
        details: JSON.stringify({
          code: cleanCode,
          name: newPromo.name,
          distributionType: validDistribution,
          discountType: newPromo.discountType,
          discountValue: value,
          beneficiariesCount: resolvedUserIds.length,
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: `Code promotionnel ${cleanCode} créé et attribué à ${resolvedUserIds.length} bénéficiaire(s) !`,
      promo: newPromo,
      beneficiariesCount: resolvedUserIds.length,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. MODIFICATION, PROLONGATION OU STATUT D'UN CODE PROMO
// =========================================================================
router.put('/promos/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      discountValue,
      maxUses,
      maxUsesPerUser,
      validUntil,
      applicablePlans,
      applicableCycles,
      allowNew,
      allowRenewal,
      isActive,
    } = req.body || {};

    const updated = await req.prisma.promotionCode.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
        maxUses: maxUses !== undefined ? Number(maxUses) : undefined,
        maxUsesPerUser: maxUsesPerUser !== undefined ? Number(maxUsesPerUser) : undefined,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
        applicablePlans: applicablePlans ? JSON.stringify(applicablePlans) : undefined,
        applicableCycles: applicableCycles ? JSON.stringify(applicableCycles) : undefined,
        allowNew: allowNew !== undefined ? Boolean(allowNew) : undefined,
        allowRenewal: allowRenewal !== undefined ? Boolean(allowRenewal) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'PROMO_CODE_UPDATED',
        entity: 'PromotionCode',
        entityId: updated.id,
        details: JSON.stringify({ code: updated.code, isActive }),
      },
    });

    res.json({
      success: true,
      message: `Code promotionnel ${updated.code} mis à jour avec succès.`,
      promo: updated,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 4. SUPPRESSION D'UN CODE PROMO INUTILISÉ
// =========================================================================
router.delete('/promos/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const promo = await req.prisma.promotionCode.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!promo) {
      throw new AppError('Code promotionnel introuvable.', 404);
    }

    if (promo._count.redemptions > 0) {
      // Pour préserver l'intégrité comptable des paiements confirmés, on désactive
      await req.prisma.promotionCode.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: `Le code ${promo.code} a déjà été utilisé sur des transactions réelles. Il a été désactivé pour préserver l'historique comptable.`,
        action: 'deactivated',
      });
    }

    await req.prisma.promotionCode.delete({ where: { id } });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'PROMO_CODE_DELETED',
        entity: 'PromotionCode',
        entityId: id,
        details: JSON.stringify({ code: promo.code }),
      },
    });

    res.json({
      success: true,
      message: `Code promotionnel ${promo.code} supprimé définitivement.`,
      action: 'deleted',
    });
  } catch (error) {
    next(error);
  }
});

export { router as promosAdminRouter };
