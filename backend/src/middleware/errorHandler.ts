import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = (err as any).statusCode || (err instanceof AppError ? err.statusCode : undefined);
  if (status && status < 500) {
    return res.status(status).json({
      error: err.message,
      statusCode: status,
    });
  }

  // Erreurs de validation Zod
  if (err instanceof ZodError || (err as any).name === 'ZodError') {
    const issues = (err as any).issues || (err as any).errors || [];
    const firstMessage = issues?.[0]?.message || 'Données du formulaire invalides.';
    return res.status(400).json({
      error: firstMessage,
      details: issues,
      statusCode: 400,
    });
  }

  // Erreurs spécifiques Prisma
  if ((err as any).code === 'P2002') {
    return res.status(409).json({
      error: 'Un enregistrement avec ces caractéristiques existe déjà.',
      statusCode: 409,
    });
  }

  console.error('Erreur non gérée:', err);
  
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  return res.status(500).json({
    error: isProduction ? 'Une erreur interne est survenue. Veuillez réessayer plus tard.' : (err.message || 'Une erreur interne est survenue.'),
    statusCode: 500,
  });
};

