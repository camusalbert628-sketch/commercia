import crypto from 'crypto';
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import {
  AdminSecurityService,
  ADMIN_OTP_LENGTH,
  ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
} from '../../services/adminSecurityService';
import {
  emailService,
  EMAIL_SEND_SUCCESS_MESSAGE,
  EMAIL_NOT_CONFIGURED_MESSAGE,
} from '../../services/emailService';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Middleware local : vérifie côté serveur que l'utilisateur est authentifié et possède le rôle Super Admin en base de données
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
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const userAgent = (req.headers['user-agent'] as string) || 'unknown';
      await req.prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: user.email,
          authMethod: 'direct_api',
          status: 'BLOCKED',
          step: 'admin_api_access',
          ipAddress: clientIp,
          userAgent,
          failureReason: 'Tentative d’accès non autorisée à /api/admin-auth par un compte marchand',
        },
      }).catch(() => {});
      throw new AppError('Accès réservé exclusivement au Super Administrateur.', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin-auth/status
 * Vérifie l'état actuel de la session administrative privilégiée et la disponibilité de Resend API.
 */
router.get('/status', authenticate, requireBasicAdminIdentity, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cookieToken = AdminSecurityService.extractAdminCookie(req.headers.cookie);
    const adminToken =
      cookieToken ||
      (req.headers['x-admin-session-token'] as string) ||
      (req.headers['x-admin-token'] as string);

    const authorizedEmail = await AdminSecurityService.getAuthorizedGoogleEmail(req.prisma);
    const maskedEmail = AdminSecurityService.maskEmail(authorizedEmail);
    const emailStatus = emailService.getStatus();

    if (!adminToken) {
      return res.json({
        isVerified: false,
        requiresChallenge: true,
        maskedEmail,
        authorizedEmail: maskedEmail,
        otpDigits: ADMIN_OTP_LENGTH,
        resendCooldownSeconds: ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
        emailService: {
          isConfigured: emailStatus.isConfigured,
          provider: emailStatus.provider,
          unavailableMessage: emailStatus.isConfigured ? null : EMAIL_NOT_CONFIGURED_MESSAGE,
        },
      });
    }

    const validation = await AdminSecurityService.validateAdminSessionToken(req.prisma, adminToken, req.userId);

    res.json({
      isVerified: validation.isValid,
      requiresChallenge: !validation.isValid,
      maskedEmail,
      authorizedEmail: maskedEmail,
      otpDigits: ADMIN_OTP_LENGTH,
      resendCooldownSeconds: ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
      reason: validation.reason,
      emailService: {
        isConfigured: emailStatus.isConfigured,
        provider: emailStatus.provider,
        unavailableMessage: emailStatus.isConfigured ? null : EMAIL_NOT_CONFIGURED_MESSAGE,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin-auth/request-otp
 * Déclenche la génération d'un code OTP CSPRNG à 8 chiffres et son envoi via Resend API
 * à l'adresse Gmail autorisée du Super Admin.
 * POLITIQUE FAIL CLOSED :
 * - Ne retourne JAMAIS le code OTP dans la réponse JSON.
 * - Retourne une erreur 503 si Resend n'est pas configuré (ÉTAT 1) ou si l'envoi échoue (ÉTAT 3).
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
      state: 'SENT',
      message: EMAIL_SEND_SUCCESS_MESSAGE,
      challengeId: challenge.challengeId,
      maskedEmail: challenge.maskedEmail,
      expiresInMinutes: challenge.expiresInMinutes,
      attemptsRemaining: challenge.attemptsRemaining,
      resendCooldownSeconds: challenge.resendCooldownSeconds,
      otpDigits: ADMIN_OTP_LENGTH,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin-auth/verify-otp
 * Valide exclusivement côté backend le code OTP à 8 chiffres saisi, consomme atomiquement le challenge
 * et crée la session administrateur privilégiée.
 */
const verifyOtpSchema = z.object({
  challengeId: z.string().min(1, 'Identifiant du challenge de sécurité manquant'),
  code: z
    .string()
    .trim()
    .regex(/^\d{8}$/, 'Le code de sécurité doit contenir exactement 8 chiffres'),
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

    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const maxAgeMs = result.sessionDurationMinutes * 60 * 1000;

    // Cookie de session administrative privilégiée (__Host- en HTTPS production + cookie standard compatible)
    if (isProd) {
      res.cookie('__Host-commercia_admin_session', result.adminSessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: maxAgeMs,
        path: '/',
      });
    }

    res.cookie('commercia_admin_session', result.adminSessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: maxAgeMs,
      path: '/',
    });

    // Cookie CSRF associé pour les requêtes mutatives
    res.cookie('commercia_admin_csrf', result.csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: maxAgeMs,
      path: '/',
    });

    res.json({
      success: true,
      message: 'Authentification renforcée confirmée. Bienvenue dans la console Super Admin.',
      adminSessionToken: result.adminSessionToken,
      csrfToken: result.csrfToken,
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
 * Révoque immédiatement la session administrative privilégiée côté serveur et détruit les cookies.
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cookieToken = AdminSecurityService.extractAdminCookie(req.headers.cookie);
    const adminToken =
      cookieToken ||
      (req.headers['x-admin-session-token'] as string) ||
      (req.headers['x-admin-token'] as string);

    if (adminToken) {
      const tokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
      const sessions = await req.prisma.adminSession.findMany({
        where: { tokenHash, isActive: true },
      });

      for (const s of sessions) {
        await AdminSecurityService.revokeSession(req.prisma, s.id, req.userId || 'self', 'USER_LOGOUT');
      }
    }

    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    if (isProd) {
      res.clearCookie('__Host-commercia_admin_session', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
    }
    res.clearCookie('commercia_admin_session', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
    res.clearCookie('commercia_admin_csrf', {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    res.json({ success: true, message: 'Session administrative fermée et révoquée avec succès.' });
  } catch (err) {
    next(err);
  }
});

export default router;
