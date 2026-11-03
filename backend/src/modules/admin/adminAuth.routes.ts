import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AdminSecurityService } from '../../services/adminSecurityService';
import { emailService } from '../../services/emailService';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Middleware local : vérifie que l'utilisateur est authentifié et possède le drapeau isAdmin
const requireBasicAdminIdentity = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError('Non authentifié. Veuillez vous connecter.', 401);
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, isAdmin: true, isActive: true, securityLocked: true },
    });

    if (!user || !user.isActive || user.securityLocked) {
      throw new AppError('Compte administrateur inactif ou verrouillé.', 403);
    }

    if (!user.isAdmin) {
      throw new AppError('Accès réservé exclusivement au Super Administrateur.', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin-auth/status
 * Vérifie l'état actuel de la session administrative renforcée.
 */
router.get('/status', authenticate, requireBasicAdminIdentity, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminToken = (req.headers['x-admin-session-token'] as string) || (req.headers['x-admin-token'] as string);
    const authorizedEmail = await AdminSecurityService.getAuthorizedGoogleEmail(req.prisma);
    const maskedEmail = AdminSecurityService.maskEmail(authorizedEmail);
    const emailStatus = emailService.getStatus();

    if (!adminToken) {
      return res.json({
        isVerified: false,
        requiresChallenge: true,
        maskedEmail,
        authorizedEmail: maskedEmail,
        emailService: emailStatus,
      });
    }

    const validation = await AdminSecurityService.validateAdminSessionToken(req.prisma, adminToken, req.userId);

    res.json({
      isVerified: validation.isValid,
      requiresChallenge: !validation.isValid,
      maskedEmail,
      authorizedEmail: maskedEmail,
      reason: validation.reason,
      emailService: emailStatus,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin-auth/request-otp
 * Déclenche l'envoi d'un code OTP sécurisé à 6 chiffres sur le Gmail officiel du Super Admin.
 */
router.post('/request-otp', authenticate, requireBasicAdminIdentity, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    const challenge = await AdminSecurityService.initiateOtpChallenge(
      req.prisma,
      req.userId!,
      clientIp,
      userAgent
    );

    res.json({
      success: true,
      message: challenge.emailDelivered
        ? `Un code de sécurité à 6 chiffres a été envoyé à votre adresse ${challenge.maskedEmail}.`
        : `Code de sécurité généré via le Canal Direct Sécurisé COMMERCIA (aucun serveur SMTP externe configuré).`,
      challengeId: challenge.challengeId,
      maskedEmail: challenge.maskedEmail,
      expiresInMinutes: challenge.expiresInMinutes,
      attemptsRemaining: challenge.attemptsRemaining,
      emailDelivered: challenge.emailDelivered,
      deliveryProvider: challenge.deliveryProvider,
      directCode: challenge.directCode,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin-auth/verify-otp
 * Valide le code OTP saisi et délivre le jeton de session administrative renforcée.
 */
const verifyOtpSchema = z.object({
  challengeId: z.string().optional(),
  code: z.string().trim().length(6, 'Le code doit contenir exactement 6 chiffres'),
});

router.post('/verify-otp', authenticate, requireBasicAdminIdentity, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = verifyOtpSchema.parse(req.body);
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    const result = await AdminSecurityService.verifyOtpChallenge(
      req.prisma,
      req.userId!,
      data.challengeId,
      data.code,
      clientIp,
      userAgent
    );

    res.json({
      success: true,
      message: 'Authentification renforcée confirmée. Bienvenue dans la console Super Admin.',
      token: result.adminSessionToken,
      adminSessionToken: result.adminSessionToken,
      expiresAt: result.expiresAt,
      user: result.user,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

/**
 * POST /api/admin-auth/logout
 * Révoque immédiatement la session administrative renforcée.
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminToken = (req.headers['x-admin-session-token'] as string) || (req.headers['x-admin-token'] as string);
    if (adminToken) {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
      await req.prisma.adminSession.updateMany({
        where: { tokenHash },
        data: { isActive: false, revokedAt: new Date(), revokedBy: req.userId || 'self' },
      });
    }

    res.json({ success: true, message: 'Session administrative fermée avec succès.' });
  } catch (err) {
    next(err);
  }
});

export default router;
