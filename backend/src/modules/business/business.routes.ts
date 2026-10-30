import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getBusinessProfile } from '../../config/businessProfiles';

const router = Router();

// GET /api/business/current
router.get('/current', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = req.headers['x-business-id'] as string;
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
    const businessId = req.headers['x-business-id'] as string;
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

    const updatePayload: any = {};
    if (data.name) updatePayload.name = data.name;
    if (data.profileId) updatePayload.profileId = data.profileId;
    if (data.trackingMode) updatePayload.trackingMode = data.trackingMode;
    if (data.activeModules) updatePayload.activeModules = JSON.stringify(data.activeModules);
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

export { router as businessRouter };
