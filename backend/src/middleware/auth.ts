import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
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
