import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existing = await req.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new AppError('Un compte avec cet email existe déjà.', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    
    const user = await req.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
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
        status: 'active',
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
        locale: user.locale,
        currency: user.currency,
        isAdmin: user.isAdmin,
        businesses: [],
        subscription: {
          planName: freePlan.name,
          planDisplayName: freePlan.displayName,
          status: 'active',
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

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const user = await req.prisma.user.findUnique({
      where: { email: data.email },
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
      throw new AppError('Email ou mot de passe incorrect.', 401);
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Email ou mot de passe incorrect.', 401);
    }

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

    res.json({
      message: `Bienvenue ${user.firstName} ! 👋`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        locale: user.locale,
        currency: user.currency,
        isAdmin: user.isAdmin,
        businesses: user.businesses.map((bm: any) => ({
          id: bm.business.id,
          name: bm.business.name,
          sector: bm.business.sector,
          role: bm.role,
        })),
        subscription: user.subscription ? {
          planName: user.subscription.plan.name,
          planDisplayName: user.subscription.plan.displayName,
          status: user.subscription.status,
          features: JSON.parse(user.subscription.plan.features || '[]'),
        } : null,
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

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale,
      currency: user.currency,
      isAdmin: user.isAdmin,
      businesses: user.businesses.map((bm: any) => ({
        id: bm.business.id,
        name: bm.business.name,
        sector: bm.business.sector,
        role: bm.role,
      })),
      subscription: user.subscription ? {
        planName: user.subscription.plan.name,
        planDisplayName: user.subscription.plan.displayName,
        status: user.subscription.status,
        features: JSON.parse(user.subscription.plan.features),
      } : null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/business (create/onboard business)
router.post('/business', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessSchema = z.object({
      name: z.string().min(1, 'Nom de l\'activité requis'),
      sector: z.string().min(1, 'Secteur requis'),
      trackingMode: z.string().default('simple'),
      dailySalesEstimate: z.string().optional(),
    });
    
    const data = businessSchema.parse(req.body);

    const business = await req.prisma.business.create({
      data: {
        name: data.name,
        sector: data.sector,
        trackingMode: data.trackingMode,
        dailySalesEstimate: data.dailySalesEstimate || null,
        members: {
          create: {
            userId: req.userId!,
            role: 'owner',
          },
        },
        settings: {
          create: {
            enableStock: data.trackingMode === 'avec_stock' || data.trackingMode === 'complet',
            enableCredits: data.trackingMode === 'avec_credit' || data.trackingMode === 'complet',
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // Create default expense categories
    const defaultCategories = [
      { name: 'Marchandise', icon: '🏬' },
      { name: 'Transport', icon: '🚒' },
      { name: 'Loyer', icon: '🏠' },
      { name: 'Électricité', icon: '💡' },
      { name: 'Téléphone / Internet', icon: '📱' },
      { name: 'Salaires', icon: '👥' },
      { name: 'Livraison', icon: '📦' },
      { name: 'Autre', icon: '📋' },
    ];

    for (const cat of defaultCategories) {
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
        trackingMode: business.trackingMode,
        settings: business.settings,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

export { router as authRouter };
