import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { getJwtSecret } from '../config/security';

export interface AuthRequest extends Request {
  userId?: string;
  businessId?: string;
  prisma?: any;
  body: any;
  headers: any;
}

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token d\'authentification manquant.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Token invalide ou expiré.', 401));
    }
  }
};

/**
 * Récupère et valide rigoureusement l'entreprise active pour la requête
 * Empêche toute fuite de données entre entreprises (Multi-tenancy isolation)
 */
export const getTenantBusinessId = async (req: AuthRequest): Promise<string> => {
  if (!req.userId) {
    throw new AppError('Non authentifié.', 401);
  }

  // 1. Si un ID d'entreprise spécifique est fourni dans les en-têtes (ex: 'x-business-id')
  const requestedBusinessId = (req.headers['x-business-id'] as string) || (req.query.businessId as string);

  if (requestedBusinessId) {
    const member = await req.prisma.businessMember.findFirst({
      where: {
        userId: req.userId,
        businessId: requestedBusinessId,
        isActive: true,
      },
    });

    if (!member) {
      throw new AppError('Accès non autorisé aux données de cette entreprise.', 403);
    }

    req.businessId = member.businessId;
    return member.businessId;
  }

  // 2. Fallback sécurisé : première entreprise active de l'utilisateur
  const member = await req.prisma.businessMember.findFirst({
    where: { userId: req.userId, isActive: true },
    orderBy: { joinedAt: 'asc' },
  });

  if (!member) {
    throw new AppError('Aucune entreprise active trouvée. Veuillez d\'abord configurer votre activité.', 404);
  }

  req.businessId = member.businessId;
  return member.businessId;
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError('Non authentifié. Jeton de session manquant ou expiré.', 401);
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      throw new AppError('Utilisateur introuvable.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Compte suspendu ou inactif. Accès refusé.', 403);
    }

    if (!user.isAdmin) {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const userAgent = (req.headers['user-agent'] as string) || 'unknown';

      // Journalisation d'audit de sécurité immédiate en base de données
      await req.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'SECURITY_ALERT_UNAUTHORIZED_ADMIN_ACCESS',
          entity: 'AdminEndpoint',
          entityId: req.originalUrl,
          details: JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            ip: clientIp,
            userAgent,
            userEmail: user.email,
            reason: 'Tentative d\'accès à un endpoint Super Admin par un utilisateur non autorisé',
            timestamp: new Date().toISOString(),
          }),
          ipAddress: clientIp,
        },
      }).catch(() => {});

      // Détection de tentatives répétées (bruteforce / escalade de privilèges)
      const recentAttempts = await req.prisma.auditLog.count({
        where: {
          action: 'SECURITY_ALERT_UNAUTHORIZED_ADMIN_ACCESS',
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          userId: user.id,
        },
      }).catch(() => 0);

      if (recentAttempts >= 3) {
        await req.prisma.systemAlert.create({
          data: {
            nature: 'auth_bruteforce_detected',
            title: `Alerte Sécurité: Tentatives répétées d'accès Super Admin (${recentAttempts} requêtes)`,
            severity: 'critical',
            service: 'security',
            description: `Le compte ${user.email} (ID: ${user.id}, IP: ${clientIp}) a tenté d'accéder aux endpoints Super Admin à ${recentAttempts} reprises sans autorisations requises.`,
            status: 'active',
          },
        }).catch(() => {});
      }

      return res.status(403).json({
        error: 'Accès strictement interdit. Cet espace et ses données sont exclusivement réservés au Super Administrateur COMMERCIA.',
        code: 'FORBIDDEN_SUPER_ADMIN_REQUIRED',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

import { getUserSubscriptionDetails } from '../utils/subscriptionUtils';

/**
 * Middleware vérifiant qu'un utilisateur possède un abonnement PRO ou BUSINESS actif.
 * Empêche strictement les comptes gratuits (Free) d'accéder aux API payantes.
 */
export const requireProSubscription = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError('Non authentifié.', 401);
    }

    const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId);

    // Les administrateurs et les comptes Pro actifs ont accès
    if (subDetails.isAdmin || subDetails.isPro) {
      return next();
    }

    throw new AppError(
      'Accès restreint. Cette fonctionnalité requiert un abonnement PRO actif. Veuillez mettre à niveau votre compte.',
      403
    );
  } catch (error) {
    next(error);
  }
};


