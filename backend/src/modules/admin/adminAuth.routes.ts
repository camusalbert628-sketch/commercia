import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AdminSecurityService, ADMIN_OTP_LENGTH } from '../../services/adminSecurityService';
import { emailService } from '../../services/emailService';
import { encryptSecret, maskApiKey } from '../../utils/crypto';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Middleware local : vérifie que l'utilisateur est authentifié et possède le drapeau isAdmin en base
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
 * Vérifie l'état actuel de la session administrative renforcée et la disponibilité du service email.
 */
router.get('/status', authenticate, requireBasicAdminIdentity, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await emailService.ensureDynamicConfigLoaded(req.prisma);
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
        emailService: {
          isConfigured: emailStatus.isConfigured,
          provider: emailStatus.provider,
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
      reason: validation.reason,
      emailService: {
        isConfigured: emailStatus.isConfigured,
        provider: emailStatus.provider,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin-auth/request-otp
 * Déclenche l'envoi d'un code OTP sécurisé à 8 chiffres sur le Gmail officiel du Super Admin.
 * POLITIQUE FAIL CLOSED :
 * - Ne retourne JAMAIS le code OTP dans la réponse JSON.
 * - Retourne une erreur 503 si aucun service d'envoi réel n'est configuré ou si l'envoi échoue.
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
      message: "Un code de sécurité vient d'être envoyé à votre adresse Gmail administrateur.",
      challengeId: challenge.challengeId,
      maskedEmail: challenge.maskedEmail,
      expiresInMinutes: challenge.expiresInMinutes,
      attemptsRemaining: challenge.attemptsRemaining,
      otpDigits: ADMIN_OTP_LENGTH,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin-auth/verify-otp
 * Valide exclusivement côté backend le code OTP à 8 chiffres saisi et délivre la session administrative renforcée.
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

    const isProd = process.env.NODE_ENV === 'production';
    const maxAgeMs = result.sessionDurationMinutes * 60 * 1000;

    // Cookie de session administrative HttpOnly, Secure, SameSite
    res.cookie('commercia_admin_session', result.adminSessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: maxAgeMs,
      path: '/api',
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
 * POST /api/admin-auth/configure-mailer
 * Permet à l'administrateur système d'enregistrer ses identifiants SMTP Gmail / OAuth2 / Resend chiffrés AES-256-GCM.
 * Ne crée AUCUNE session administrative et n'expose AUCUN code OTP.
 */
const configureMailerSchema = z.object({
  provider: z.enum(['gmail_smtp', 'resend', 'brevo']).default('gmail_smtp'),
  smtpUser: z.string().email().default('camusalbert628@gmail.com'),
  secretOrAppPassword: z.string().min(8, "La clé ou le mot de passe d'application doit contenir au moins 8 caractères."),
  smtpHost: z.string().default('smtp.gmail.com'),
});

router.post('/configure-mailer', authenticate, requireBasicAdminIdentity, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = configureMailerSchema.parse(req.body);
    const cleanSecret = data.secretOrAppPassword.replace(/\s+/g, '');

    if (data.provider === 'gmail_smtp') {
      emailService.configureRuntimeSmtp({
        host: data.smtpHost,
        port: 465,
        user: data.smtpUser,
        pass: cleanSecret,
      });

      const verifyRes = await emailService.verifySmtpConnection();
      if (!verifyRes.ok) {
        throw new AppError(
          `Échec de connexion au serveur SMTP (${data.smtpHost}:465) : ${verifyRes.error || 'Identifiants refusés'}. Assurez-vous d'utiliser un Mot de passe d'application Google à 16 caractères.`,
          400
        );
      }
    } else if (data.provider === 'resend') {
      process.env.RESEND_API_KEY = cleanSecret;
      emailService.initTransporterFromEnv();
    } else if (data.provider === 'brevo') {
      process.env.BREVO_API_KEY = cleanSecret;
      emailService.initTransporterFromEnv();
    }

    const payloadToEncrypt = data.provider === 'gmail_smtp' ? `${data.smtpUser}:${cleanSecret}` : cleanSecret;
    const encryptedKey = encryptSecret(payloadToEncrypt);
    const keyPreview = maskApiKey(cleanSecret);

    await req.prisma.systemApiKey.upsert({
      where: { serviceName: data.provider },
      update: {
        encryptedKey,
        keyPreview,
        apiUrl: data.provider === 'gmail_smtp' ? data.smtpHost : null,
        isActive: true,
        lastTestedAt: new Date(),
        testStatus: 'success',
      },
      create: {
        serviceName: data.provider,
        displayName: data.provider === 'gmail_smtp' ? 'Gmail SMTP Transactionnel' : data.provider.toUpperCase(),
        category: 'email',
        encryptedKey,
        keyPreview,
        apiUrl: data.provider === 'gmail_smtp' ? data.smtpHost : null,
        isActive: true,
        lastTestedAt: new Date(),
        testStatus: 'success',
      },
    });

    res.json({
      success: true,
      message: 'Service de messagerie transactionnel vérifié et activé. Vous pouvez maintenant demander l’envoi de votre code de sécurité sur Gmail.',
      emailService: emailService.getStatus(),
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
 * Révoque immédiatement la session administrative renforcée et supprime les cookies.
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cookieToken = AdminSecurityService.extractAdminCookie(req.headers.cookie);
    const adminToken =
      cookieToken ||
      (req.headers['x-admin-session-token'] as string) ||
      (req.headers['x-admin-token'] as string);

    if (adminToken) {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
      await req.prisma.adminSession.updateMany({
        where: { tokenHash },
        data: { isActive: false, revokedAt: new Date(), revokedBy: req.userId || 'self' },
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('commercia_admin_session', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api',
    });
    res.clearCookie('commercia_admin_csrf', {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    res.json({ success: true, message: 'Session administrative fermée avec succès.' });
  } catch (err) {
    next(err);
  }
});

export default router;
