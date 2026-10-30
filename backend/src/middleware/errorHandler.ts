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
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  // Erreurs de validation Zod
  if (err instanceof ZodError || (err as any).name === 'ZodError') {
    const zodErr = err as ZodError;
    const firstMessage = zodErr.errors?.[0]?.message || 'Données du formulaire invalides.';
    return res.status(400).json({
      error: firstMessage,
      details: zodErr.errors,
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
  
  return res.status(500).json({
    error: err.message || 'Une erreur interne est survenue.',
    statusCode: 500,
  });
};

