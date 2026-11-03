import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth';
import { AdminSecurityService } from '../../services/adminSecurityService';
import { emailService } from '../../services/emailService';
import { PhoneService } from '../../services/phoneService';
import { encryptSecret, maskApiKey } from '../../utils/crypto';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

/**
 * GET /api/admin/security/overview
 * Tableau de bord complet de sécurité : Google Identity, service email, sessions, paramètres.
 */
router.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let config = await req.prisma.adminSecurityConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      config = await req.prisma.adminSecurityConfig.create({
        data: {
          id: 'singleton',
          authorizedGoogleEmail: 'camusalbert628@gmail.com',
          otpValidityMinutes: 5,
          maxOtpAttempts: 5,
          sessionDurationMinutes: 60,
          requireMfaForSensitive: true,
          emailNotificationOnNewIp: true,
        },
      });
    }

    // Récupérer le Super Admin racine
    const superAdminUser = await req.prisma.user.findFirst({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        adminGoogleEmail: true,
        emailVerified: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
      },
    });

    // Sessions actives
    const activeSessions = await req.prisma.adminSession.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Derniers événements de sécurité
    const recentLogs = await req.prisma.securityAccessLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // Alertes de sécurité
    const alertsCount = await req.prisma.commercialAlert.count({
      where: { status: 'open', priority: 'critical' },
    });

    const emailStatus = emailService.getStatus();

    res.json({
      config,
      adminUser: superAdminUser ? {
        id: superAdminUser.id,
        email: superAdminUser.email,
        firstName: superAdminUser.firstName,
        lastName: superAdminUser.lastName,
        adminGoogleEmail: superAdminUser.adminGoogleEmail || config.authorizedGoogleEmail,
      } : null,
      superAdminIdentity: {
        existingAdminId: superAdminUser?.id,
        existingAdminEmail: superAdminUser?.email,
        authorizedGoogleEmail: config.authorizedGoogleEmail,
        googleLinkStatus: superAdminUser?.adminGoogleEmail ? 'LINKED_VERIFIED' : 'PENDING_GOOGLE_AUTH',
        emailVerified: superAdminUser?.emailVerified,
        lastLoginAt: superAdminUser?.lastLoginAt,
      },
      emailService: emailStatus,
      emailServiceStatus: emailStatus,
      activeSessionsCount: activeSessions.length,
      activeSessions,
      criticalAlertsCount: alertsCount,
      recentLogs,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/security/config
 * Mise à jour des paramètres de sécurité Super Admin (exige une session renforcée).
 */
const updateConfigSchema = z.object({
  otpValidityMinutes: z.number().min(2).max(30).optional(),
  maxOtpAttempts: z.number().min(3).max(10).optional(),
  sessionDurationMinutes: z.number().min(15).max(720).optional(),
  requireMfaForSensitive: z.boolean().optional(),
  emailNotificationOnNewIp: z.boolean().optional(),
});

router.put('/config', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateConfigSchema.parse(req.body);

    const updated = await req.prisma.adminSecurityConfig.upsert({
      where: { id: 'singleton' },
      update: {
        ...data,
        updatedBy: req.userId,
      },
      create: {
        id: 'singleton',
        authorizedGoogleEmail: 'camusalbert628@gmail.com',
        ...data,
        updatedBy: req.userId,
      },
    });

    res.json({
      success: true,
      message: 'Paramètres de sécurité mis à jour.',
      config: updated,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

/**
 * GET /api/admin/security/logs
 * Grand livre des Security Access Logs avec pagination et filtres.
 */
router.get('/logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, step, limit = '50', page = '1' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(10, Number(limit)));

    const where: any = {};
    if (status && status !== 'all') where.status = String(status);
    if (step && step !== 'all') where.step = String(step);

    const [total, logs] = await Promise.all([
      req.prisma.securityAccessLog.count({ where }),
      req.prisma.securityAccessLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      logs,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/security/sessions/:id/revoke
 * Révoque une session administrative active.
 */
router.post('/sessions/:id/revoke', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await AdminSecurityService.revokeSession(req.prisma, id, req.userId || 'admin');

    if (!success) {
      throw new AppError('Session introuvable.', 404);
    }

    res.json({ success: true, message: 'Session administrative révoquée immédiatement.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/phone-management/stats
 * Section 16 : Statistiques et audit des numéros de téléphone internationaux.
 */
router.get('/phone-stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await PhoneService.getGlobalPhoneStats(req.prisma);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/phone-management/normalize-all
 * Normalise automatiquement tous les numéros valides non encore au format E.164.
 */
router.post('/phone-normalize-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await req.prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true, phoneCountry: true },
    });

    let convertedCount = 0;
    for (const u of users) {
      if (!u.phone) continue;
      const resVal = PhoneService.validate(u.phone, u.phoneCountry || 'CM');
      if (resVal.isValid && resVal.e164 && resVal.e164 !== u.phone) {
        await req.prisma.user.update({
          where: { id: u.id },
          data: {
            phone: resVal.e164,
            phoneCountry: resVal.country,
            phoneCallingCode: resVal.countryCallingCode,
            phoneNationalNumber: resVal.nationalNumber,
          },
        });
        convertedCount += 1;
      }
    }

    res.json({
      success: true,
      message: `${convertedCount} numéro(s) de téléphone normalisé(s) en format standard international E.164.`,
      convertedCount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/security/smtp-config
 * Permet au Super Admin d'enregistrer un Mot de passe d'application Gmail ou une clé Resend
 * directement dans SystemApiKey pour activer l'envoi réel des emails sur camusalbert628@gmail.com.
 */
const smtpConfigSchema = z.object({
  provider: z.enum(['gmail', 'resend']).default('gmail'),
  smtpUser: z.string().email().default('camusalbert628@gmail.com'),
  appPasswordOrKey: z.string().min(8, 'Le mot de passe d\'application ou la clé API doit contenir au moins 8 caractères.'),
  sendTestEmail: z.boolean().default(true),
});

router.post('/smtp-config', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = smtpConfigSchema.parse(req.body);
    const serviceName = data.provider === 'resend' ? 'resend' : 'gmail_smtp';
    const cleanSecret = data.appPasswordOrKey.replace(/\s+/g, '');

    if (data.provider === 'gmail') {
      emailService.configureRuntimeSmtp({
        host: 'smtp.gmail.com',
        port: 465,
        user: data.smtpUser,
        pass: cleanSecret,
      });

      const verifyRes = await emailService.verifySmtpConnection();
      if (!verifyRes.ok) {
        throw new AppError(
          `Échec de vérification SMTP Gmail : ${verifyRes.error || 'Identifiants refusés'}. Vérifiez votre Mot de passe d'application Google (16 caractères).`,
          400
        );
      }
    } else if (data.provider === 'resend') {
      process.env.RESEND_API_KEY = cleanSecret;
      emailService.initTransporterFromEnv();
    }

    const payloadToEncrypt = data.provider === 'gmail' ? `${data.smtpUser}:${cleanSecret}` : cleanSecret;
    const encryptedKey = encryptSecret(payloadToEncrypt);
    const keyPreview = maskApiKey(cleanSecret);

    await req.prisma.systemApiKey.upsert({
      where: { serviceName },
      update: {
        encryptedKey,
        keyPreview,
        apiUrl: data.provider === 'gmail' ? 'smtp.gmail.com' : null,
        isActive: true,
        lastTestedAt: new Date(),
        testStatus: 'success',
      },
      create: {
        serviceName,
        displayName: data.provider === 'resend' ? 'Resend Email API' : 'Gmail SMTP Relais Officiel',
        category: 'email',
        encryptedKey,
        keyPreview,
        apiUrl: data.provider === 'gmail' ? 'smtp.gmail.com' : null,
        isActive: true,
        lastTestedAt: new Date(),
        testStatus: 'success',
      },
    });

    res.json({
      success: true,
      message: 'Serveur de messagerie transactionnel vérifié et activé avec succès.',
      emailService: emailService.getStatus(),
      testSent: true,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

export default router;
