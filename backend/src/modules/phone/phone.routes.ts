import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth';
import { PhoneService } from '../../services/phoneService';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

/**
 * POST /api/phone/validate
 * Analyse et valide un numéro sans persistance.
 */
const validateSchema = z.object({
  phone: z.string().min(1, 'Numéro requis'),
  country: z.string().length(2).optional(),
});

router.post('/validate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = validateSchema.parse(req.body);
    const result = PhoneService.validate(data.phone, data.country || 'CM');
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

/**
 * POST /api/phone/send-otp
 * Initie la vérification d'un numéro par code SMS à 6 chiffres.
 */
const sendOtpSchema = z.object({
  phone: z.string().min(1, 'Numéro requis'),
  country: z.string().length(2).optional(),
});

router.post('/send-otp', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = sendOtpSchema.parse(req.body);
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

    const result = await PhoneService.sendVerificationOtp(
      req.prisma,
      data.phone,
      data.country || 'CM',
      req.userId,
      clientIp
    );

    res.json({
      success: true,
      message: `Code de vérification envoyé à ${result.maskedPhone}`,
      ...result,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

/**
 * POST /api/phone/verify-otp
 * Valide le code SMS et passe le numéro au statut VÉRIFIÉ.
 */
const verifyOtpSchema = z.object({
  phone: z.string().min(1, 'Numéro requis'),
  code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
});

router.post('/verify-otp', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = verifyOtpSchema.parse(req.body);
    const result = await PhoneService.verifyOtp(
      req.prisma,
      data.phone,
      data.code,
      req.userId
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

export default router;
