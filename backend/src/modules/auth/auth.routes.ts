import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';
import { getJwtSecret, getJwtRefreshSecret, verifyGoogleIdToken } from '../../config/security';
import { bruteForceProtector, loginBruteForceMiddleware } from '../../utils/bruteForceProtection';
import { encryptSecret, decryptSecret } from '../../utils/crypto';
import { generateTotpSecret, verifyTotpCode, generateRecoveryCodes } from '../../utils/mfa';

const router = Router();

// Validation schemas conformes OWASP ASVS V2.1
const registerSchema = z.object({
  email: z.string().email('Format email invalide').max(100),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)'),
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  phone: z.string().max(25).optional(),
  avatarUrl: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Format email invalide').max(100),
  password: z.string().min(1, 'Mot de passe requis'),
  totpCode: z.string().optional(),
});

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    getJwtSecret(),
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
  );
  const refreshToken = jwt.sign(
    { userId },
    getJwtRefreshSecret(),
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existing = await req.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppError('Un compte avec cet email existe déjà.', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    
    const user = await req.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone || null,
        avatarUrl: data.avatarUrl || null,
      },
    });

    // Create free subscription
    let freePlan = await req.prisma.plan.findUnique({ where: { name: 'free' } });
    if (!freePlan) {
      freePlan = await req.prisma.plan.create({
        data: {
          name: 'free',
          displayName: 'Gratuit',
          description: 'Fonctions essentielles pour démarrer',
          priceMonthly: 0,
          priceYearly: 0,
          features: JSON.stringify(['Ventes', 'Dépenses', 'Dashboard', 'Historique limité', 'Statistiques simples']),
          limits: JSON.stringify({ salesPerMonth: 100, aiQueries: 0, historyDays: 30 }),
          sortOrder: 0,
        },
      });
    }

    await req.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'free',
      },
    });

    const tokens = generateTokens(user.id);
    
    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await req.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(201).json({
      message: 'Compte créé avec succès ! Bienvenue sur COMMERCIA 👋',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        currency: user.currency,
        isAdmin: user.isAdmin,
        mfaEnabled: user.mfaEnabled,
        businesses: [],
        subscription: {
          planName: 'free',
          planDisplayName: 'Gratuit',
          status: 'free',
          isPro: false,
          features: JSON.parse(freePlan.features || '[]'),
        },
      },
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// POST /api/auth/login — Authentification renforcée avec protection anti-bruteforce et MFA
router.post('/login', loginBruteForceMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const emailLower = data.email.toLowerCase().trim();

    // Vérifier les tentatives infructueuses préalables
    bruteForceProtector.check(req, emailLower);

    const user = await req.prisma.user.findUnique({
      where: { email: emailLower },
      include: {
        businesses: {
          include: { business: true },
          where: { isActive: true },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user || !user.isActive) {
      bruteForceProtector.recordFailure(req, emailLower);
      throw new AppError('Email ou mot de passe incorrect.', 401);
    }

    // Vérification rigoureuse du hash par bcrypt (ZÉRO MOT DE PASSE EN CLAIR NI BYPASS)
    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      bruteForceProtector.recordFailure(req, emailLower);
      throw new AppError('Email ou mot de passe incorrect.', 401);
    }

    // Vérification MFA / TOTP si activé sur le compte
    if (user.mfaEnabled) {
      if (!data.totpCode) {
        return res.status(200).json({
          requiresMfa: true,
          message: 'Vérification multifacteur requise. Veuillez saisir le code TOTP à 6 chiffres.',
        });
      }

      const decryptedSecret = decryptSecret(user.mfaSecret || '');
      const isMfaValid = verifyTotpCode(data.totpCode, decryptedSecret);

      if (!isMfaValid) {
        bruteForceProtector.recordFailure(req, emailLower);
        throw new AppError('Code de sécurité TOTP invalide ou expiré.', 401);
      }
    }

    // Réinitialisation des tentatives après succès
    bruteForceProtector.recordSuccess(req, emailLower);

    const tokens = generateTokens(user.id);
    
    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await req.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Log the login
    await req.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entity: 'user',
        entityId: user.id,
      },
    });

    const subDetails = await getUserSubscriptionDetails(req.prisma, user.id);

    res.json({
      message: `Bienvenue ${user.firstName} ! 👋`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        currency: user.currency,
        isAdmin: user.isAdmin,
        businesses: user.businesses.map((bm: any) => ({
          id: bm.business.id,
          name: bm.business.name,
          sector: bm.business.sector,
          profileId: bm.business.profileId || bm.business.sector || 'epicerie_alimentation',
          trackingMode: bm.business.trackingMode,
          currency: bm.business.currency || 'XAF',
          activeModules: bm.business.activeModules ? JSON.parse(bm.business.activeModules) : [],
          salesChannels: bm.business.salesChannels ? JSON.parse(bm.business.salesChannels) : ['boutique'],
          role: bm.role,
        })),
        subscription: {
          planName: subDetails.planName,
          planDisplayName: subDetails.planDisplayName,
          status: subDetails.status,
          isPro: subDetails.isPro,
          endDate: subDetails.endDate,
          daysRemaining: subDetails.daysRemaining,
          features: subDetails.features,
        },
      },
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// POST /api/auth/google
const googleAuthSchema = z.object({
  credential: z.string().optional(),
  email: z.string().email('Email Google invalide').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

router.post('/google', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = googleAuthSchema.parse(req.body);
    
    // Vérification cryptographique stricte du jeton Google
    const verifiedUser = await verifyGoogleIdToken(data.credential, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      avatarUrl: data.avatarUrl,
    });

    const email = verifiedUser.email;

    let user = await req.prisma.user.findUnique({
      where: { email },
      include: {
        businesses: {
          include: { business: true },
          where: { isActive: true },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user) {
      const dummyPassword = await bcrypt.hash('GOOGLE_AUTH_' + Date.now(), 10);
      const created = await req.prisma.user.create({
        data: {
          email,
          passwordHash: dummyPassword,
          firstName: verifiedUser.firstName,
          lastName: verifiedUser.lastName,
          avatarUrl: verifiedUser.avatarUrl || null,
          emailVerified: verifiedUser.emailVerified,
        },
      });

      let freePlan = await req.prisma.plan.findUnique({ where: { name: 'free' } });
      if (!freePlan) {
        freePlan = await req.prisma.plan.create({
          data: {
            name: 'free',
            displayName: 'Gratuit',
            description: 'Fonctions essentielles pour démarrer',
            priceMonthly: 0,
            priceYearly: 0,
            features: JSON.stringify(['Ventes', 'Dépenses', 'Dashboard']),
            limits: JSON.stringify({ salesPerMonth: 100, aiQueries: 0, historyDays: 30 }),
            sortOrder: 0,
          },
        });
      }

      await req.prisma.subscription.create({
        data: {
          userId: created.id,
          planId: freePlan.id,
          status: 'active',
        },
      });

      user = await req.prisma.user.findUnique({
        where: { id: created.id },
        include: {
          businesses: {
            include: { business: true },
            where: { isActive: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
      });
    }

    if (!user || !user.isActive) {
      throw new AppError('Ce compte utilisateur est désactivé.', 403);
    }

    const tokens = generateTokens(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await req.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const subDetails = await getUserSubscriptionDetails(req.prisma, user.id);

    res.json({
      message: `Connexion Google réussie ! Bienvenue ${user.firstName} 👋`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        currency: user.currency,
        isAdmin: user.isAdmin,
        businesses: user.businesses.map((bm: any) => ({
          id: bm.business.id,
          name: bm.business.name,
          sector: bm.business.sector,
          profileId: bm.business.profileId || bm.business.sector || 'epicerie_alimentation',
          trackingMode: bm.business.trackingMode,
          currency: bm.business.currency || 'XAF',
          activeModules: bm.business.activeModules ? JSON.parse(bm.business.activeModules) : [],
          salesChannels: bm.business.salesChannels ? JSON.parse(bm.business.salesChannels) : ['boutique'],
          role: bm.role,
        })),
        subscription: {
          planName: subDetails.planName,
          planDisplayName: subDetails.planDisplayName,
          status: subDetails.status,
          isPro: subDetails.isPro,
          endDate: subDetails.endDate,
          daysRemaining: subDetails.daysRemaining,
          features: subDetails.features,
        },
      },
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Token de rafraîchissement manquant.', 400);
    }

    const storedToken = await req.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Token de rafraîchissement invalide ou expiré.', 401);
    }

    // Delete old token safely
    await req.prisma.refreshToken.deleteMany({ where: { id: storedToken.id } });

    const tokens = generateTokens(storedToken.userId);
    
    // Save new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await req.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.userId,
        expiresAt,
      },
    });

    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        businesses: {
          include: { business: true },
          where: { isActive: true },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (!user) {
      throw new AppError('Utilisateur non trouvé.', 404);
    }

    const subDetails = await getUserSubscriptionDetails(req.prisma, user.id);

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      currency: user.currency,
      isAdmin: user.isAdmin,
      businesses: user.businesses.map((bm: any) => ({
        id: bm.business.id,
        name: bm.business.name,
        sector: bm.business.sector,
        profileId: bm.business.profileId || bm.business.sector || 'epicerie_alimentation',
        trackingMode: bm.business.trackingMode,
        currency: bm.business.currency || 'XAF',
        activeModules: bm.business.activeModules ? JSON.parse(bm.business.activeModules) : [],
        salesChannels: bm.business.salesChannels ? JSON.parse(bm.business.salesChannels) : ['boutique'],
        role: bm.role,
      })),
      subscription: {
        planName: subDetails.planName,
        planDisplayName: subDetails.planDisplayName,
        status: subDetails.status,
        isPro: subDetails.isPro,
        endDate: subDetails.endDate,
        daysRemaining: subDetails.daysRemaining,
        features: subDetails.features,
        limits: subDetails.limits,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile (mettre à jour prénom, nom, téléphone - la photo reste exclusivement celle de la création)
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const updated = await req.prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    });

    res.json({
      message: 'Profil et photo mis à jour avec succès !',
      user: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        locale: updated.locale,
        currency: updated.currency,
        isAdmin: updated.isAdmin,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// POST /api/auth/business (create/onboard business)
router.post('/business', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessSchema = z.object({
      name: z.string().min(1, 'Nom de l\'activité requis'),
      sector: z.string().min(1, 'Secteur requis'),
      profileId: z.string().optional(),
      secondarySectors: z.array(z.string()).optional(),
      trackingMode: z.string().default('avec_stock'),
      activeModules: z.array(z.string()).optional(),
      salesChannels: z.array(z.string()).optional(),
      dailySalesEstimate: z.string().optional(),
      city: z.string().optional(),
      currency: z.string().optional(),
      customSector: z.string().optional(),
      businessDescription: z.string().optional(),
    }).passthrough();
    
    const data = businessSchema.parse(req.body);

    const { getBusinessProfile } = require('../../config/businessProfiles');
    const profileId = data.profileId || (data.sector ? data.sector : 'epicerie_alimentation');
    const profile = getBusinessProfile(profileId);

    const activeModules = data.activeModules && data.activeModules.length > 0
      ? data.activeModules
      : profile.recommendedModules;

    const salesChannels = data.salesChannels && data.salesChannels.length > 0
      ? data.salesChannels
      : ['boutique'];

    const business = await req.prisma.business.create({
      data: {
        name: data.name,
        sector: data.sector,
        profileId: profile.id,
        activeModules: JSON.stringify(activeModules),
        salesChannels: JSON.stringify(salesChannels),
        trackingMode: data.trackingMode || profile.defaultTrackingMode,
        dailySalesEstimate: data.dailySalesEstimate || null,
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
            enableCredits: (data.trackingMode || profile.defaultTrackingMode) === 'complet' || (data.trackingMode || profile.defaultTrackingMode) === 'avec_credit',
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // Create tailored expense categories from profile
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
          businessId: business.id,
          name: cat.name,
          icon: cat.icon,
        },
      });
    }

    res.status(201).json({
      message: 'Activité créée avec succès ! 🎉',
      business: {
        id: business.id,
        name: business.name,
        sector: business.sector,
        profileId: business.profileId,
        trackingMode: business.trackingMode,
        activeModules,
        salesChannels,
        currency: business.currency,
        settings: business.settings,
        profileConfig: profile,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ===================== MFA / TOTP ENDPOINTS =====================

// POST /api/auth/mfa/generate — Générer un nouveau secret TOTP pour l'utilisateur connecté
router.post('/mfa/generate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { secret, otpauthUrl } = generateTotpSecret();
    const { plainCodes, hashedCodes } = generateRecoveryCodes();

    // Stocker temporairement le secret chiffré AES-256 en attente de vérification
    await req.prisma.user.update({
      where: { id: req.userId },
      data: {
        mfaSecret: encryptSecret(secret),
        mfaRecoveryCodes: JSON.stringify(hashedCodes),
      },
    });

    res.json({
      secret,
      otpauthUrl,
      recoveryCodes: plainCodes,
      message: 'Scannez le QR Code ou saisissez la clé secrète dans votre application TOTP (Google Authenticator, Authy, etc.).',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/enable — Confirmer le premier code TOTP et activer définitivement le MFA
router.post('/mfa/enable', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body || {};
    if (!code || !/^\d{6}$/.test(code)) {
      throw new AppError('Code TOTP à 6 chiffres obligatoire.', 400);
    }

    const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.mfaSecret) {
      throw new AppError('Configuration MFA non initialisée.', 400);
    }

    const plainSecret = decryptSecret(user.mfaSecret);
    const isValid = verifyTotpCode(code, plainSecret);

    if (!isValid) {
      throw new AppError('Code de validation incorrect. Assurez-vous que l’horloge de votre appareil est synchronisée.', 400);
    }

    await req.prisma.user.update({
      where: { id: req.userId },
      data: { mfaEnabled: true },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'MFA_ENABLED',
        entity: 'User',
        entityId: req.userId,
      },
    });

    res.json({ message: 'Authentification multifacteur (MFA) activée avec succès sur votre compte ! 🛡️' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/disable — Désactiver le MFA (exige confirmation du mot de passe actuel)
router.post('/mfa/disable', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      throw new AppError('Mot de passe requis pour désactiver le MFA.', 400);
    }

    const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
    const isPasswordValid = await bcrypt.compare(password, user?.passwordHash || '');
    if (!isPasswordValid) {
      throw new AppError('Mot de passe incorrect. Action refusée.', 403);
    }

    await req.prisma.user.update({
      where: { id: req.userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
      },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'MFA_DISABLED',
        entity: 'User',
        entityId: req.userId,
      },
    });

    res.json({ message: 'MFA désactivé sur votre compte.' });
  } catch (error) {
    next(error);
  }
});

// ===================== GESTION DES SESSIONS ET DÉCONNEXION MULTI-APPAREILS =====================

// POST /api/auth/logout-all — Révoquer toutes les sessions actives et déconnecter tous les appareils
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await req.prisma.refreshToken.deleteMany({
      where: { userId: req.userId },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'LOGOUT_ALL_SESSIONS',
        entity: 'User',
        entityId: req.userId,
      },
    });

    res.json({ message: 'Toutes les sessions actives ont été révoquées avec succès.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/sessions — Consulter la liste des sessions actives
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await req.prisma.refreshToken.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      totalSessions: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };

