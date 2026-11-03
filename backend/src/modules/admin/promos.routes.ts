import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// =========================================================================
// 1. LISTE DES CODES PROMOTIONNELS & STATISTIQUES COMMERCIALES
// =========================================================================
router.get('/promos', async (req: AuthRequest, res: Response, next) => {
  try {
    const promos = await req.prisma.promotionCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        redemptions: {
          orderBy: { redeemedAt: 'desc' },
        },
      },
    });

    const now = new Date();

    const formatted = await Promise.all(
      promos.map(async (p: any) => {
        const uniqueUserIds = new Set(p.redemptions.map((r: any) => r.userId));
        const totalDiscountsGiven = p.redemptions.reduce((sum: number, r: any) => sum + Number(r.discountAmount || 0), 0);

        // Récupération des paiements associés confirmés
        const paymentIds = p.redemptions.map((r: any) => r.paymentId).filter(Boolean) as string[];
        const associatedPayments = paymentIds.length > 0
          ? await req.prisma.payment.findMany({
              where: { id: { in: paymentIds }, status: 'completed' },
            })
          : [];

        let associatedGross = 0;
        let associatedNet = 0;
        for (const pay of associatedPayments as any[]) {
          associatedGross += Number(pay.amount || 0);
          associatedNet += Number(pay.amount || 0) - Number(pay.providerFee || 0) - Number(pay.refundedAmount || 0);
        }

        const isExpired = p.validUntil ? new Date(p.validUntil).getTime() < now.getTime() : false;
        const isQuotaReached = p.currentUses >= p.maxUses;

        let statusText = 'Actif';
        if (!p.isActive) statusText = 'Désactivé';
        else if (isExpired) statusText = 'Expiré';
        else if (isQuotaReached) statusText = 'Quota atteint';

        // Détails des utilisateurs ayant utilisé le code
        const userDetails = await req.prisma.user.findMany({
          where: { id: { in: Array.from(uniqueUserIds) as string[] } },
          select: { id: true, firstName: true, lastName: true, email: true },
        });

        const usersMap = new Map<string, any>(userDetails.map((u: any) => [u.id, u]));

        const redemptionsList = p.redemptions.map((r: any) => {
          const user = usersMap.get(r.userId);
          return {
            id: r.id,
            userId: r.userId,
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Inconnu',
            userEmail: user?.email || 'Inconnu',
            discountAmount: r.discountAmount,
            redeemedAt: r.redeemedAt.toISOString(),
          };
        });

        return {
          id: p.id,
          code: p.code,
          description: p.description,
          discountType: p.discountType,
          discountValue: p.discountValue,
          minOrderAmount: p.minOrderAmount,
          maxDiscount: p.maxDiscount,
          maxUses: p.maxUses,
          currentUses: p.currentUses,
          maxUsesPerUser: p.maxUsesPerUser,
          validFrom: p.validFrom.toISOString(),
          validUntil: p.validUntil ? p.validUntil.toISOString() : null,
          applicablePlans: p.applicablePlans ? JSON.parse(p.applicablePlans) : ['pro', 'business'],
          applicableCycles: p.applicableCycles ? JSON.parse(p.applicableCycles) : ['monthly', 'yearly'],
          isActive: p.isActive,
          statusText,
          stats: {
            totalUses: p.currentUses,
            uniqueUsersCount: uniqueUserIds.size,
            confirmedPaymentsCount: associatedPayments.length,
            totalDiscountsGiven,
            associatedGrossTurnover: associatedGross,
            associatedNetRevenue: associatedNet,
            lastUsedAt: p.redemptions[0]?.redeemedAt ? p.redemptions[0].redeemedAt.toISOString() : null,
          },
          redemptionsList,
        };
      })
    );

    res.json({ promos: formatted });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. CRÉATION D'UN CODE PROMO AVEC RÈGLES DE VALIDATION STRICTES
// =========================================================================
router.post('/promos', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      maxUses,
      maxUsesPerUser,
      validFrom,
      validUntil,
      applicablePlans,
      applicableCycles,
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

    const newPromo = await req.prisma.promotionCode.create({
      data: {
        code: cleanCode,
        description: description?.trim() || null,
        discountType: discountType === 'fixed' ? 'fixed' : 'percent',
        discountValue: value,
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        maxUses: Math.max(1, Number(maxUses) || 100),
        maxUsesPerUser: Math.max(1, Number(maxUsesPerUser) || 1),
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        applicablePlans: Array.isArray(applicablePlans) ? JSON.stringify(applicablePlans) : '["pro","business"]',
        applicableCycles: Array.isArray(applicableCycles) ? JSON.stringify(applicableCycles) : '["monthly","yearly"]',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'PROMO_CODE_CREATED',
        entity: 'PromotionCode',
        entityId: newPromo.id,
        details: JSON.stringify({ code: cleanCode, discountType, discountValue: value }),
      },
    });

    res.status(201).json({
      success: true,
      message: `Code promotionnel ${cleanCode} créé avec succès !`,
      promo: newPromo,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. MODIFICATION OU DÉSACTIVATION D'UN CODE PROMO
// =========================================================================
router.put('/promos/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const {
      description,
      discountValue,
      maxUses,
      maxUsesPerUser,
      validUntil,
      applicablePlans,
      applicableCycles,
      isActive,
    } = req.body || {};

    const updated = await req.prisma.promotionCode.update({
      where: { id },
      data: {
        description: description !== undefined ? description : undefined,
        discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
        maxUses: maxUses !== undefined ? Number(maxUses) : undefined,
        maxUsesPerUser: maxUsesPerUser !== undefined ? Number(maxUsesPerUser) : undefined,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
        applicablePlans: applicablePlans ? JSON.stringify(applicablePlans) : undefined,
        applicableCycles: applicableCycles ? JSON.stringify(applicableCycles) : undefined,
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
      message: `Code promotionnel ${updated.code} mis à jour.`,
      promo: updated,
    });
  } catch (error) {
    next(error);
  }
});

export { router as promosAdminRouter };
