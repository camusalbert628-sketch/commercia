import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as { userId: string };
    
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

export const requireAdmin = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError('Non authentifié.', 401);
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || !user.isAdmin) {
      throw new AppError('Accès refusé. Droits administrateur requis.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

