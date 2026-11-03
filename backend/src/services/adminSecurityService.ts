import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getJwtSecret } from '../config/security';
import { emailService } from './emailService';
import { AppError } from '../middleware/errorHandler';

interface PendingChallenge {
  challengeId: string;
  userId: string;
  email: string;
  codeHash: string;
  salt: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AdminSecurityService {
  private static challenges = new Map<string, PendingChallenge>(); // Key: userId
  private static rateLimits = new Map<string, { count: number; resetAt: Date }>(); // Key: IP or email

  /**
   * Récupère l'adresse Google autorisée officielle pour le Super Admin.
   * Toujours déterminée côté serveur depuis la base ou l'environnement (JAMAIS modifiable par le client frontend).
   */
  public static async getAuthorizedGoogleEmail(prisma: PrismaClient): Promise<string> {
    const config = await prisma.adminSecurityConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (config?.authorizedGoogleEmail) {
      return config.authorizedGoogleEmail.toLowerCase().trim();
    }

    const envEmail = process.env.SUPER_ADMIN_GOOGLE_EMAIL || 'camusalbert628@gmail.com';
    return envEmail.toLowerCase().trim();
  }

  /**
   * Masque l'email pour l'affichage sécurisé (ex: "c*********@gmail.com")
   */
  public static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    const firstChar = local.charAt(0);
    const maskedLocal = firstChar + '*'.repeat(Math.max(local.length - 1, 4));
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Vérifie si un email donné correspond exactement à l'adresse Google autorisée du Super Admin.
   */
  public static async isAuthorizedSuperAdminEmail(prisma: PrismaClient, email: string): Promise<boolean> {
    const authorized = await this.getAuthorizedGoogleEmail(prisma);
    return email.toLowerCase().trim() === authorized.toLowerCase().trim();
  }

  /**
   * Initie un challenge OTP envoyé sur le Gmail administrateur officiel.
   */
  public static async initiateOtpChallenge(
    prisma: PrismaClient,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ challengeId: string; maskedEmail: string; expiresInMinutes: number }> {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!user || !user.isAdmin) {
      throw new AppError('Accès interdit. Seul le Super Administrateur peut solliciter ce code.', 403);
    }

    const authorizedEmail = await this.getAuthorizedGoogleEmail(prisma);

    // Rate Limiting : max 4 demandes par 10 minutes
    const rateKey = `otp_req_${adminUserId}_${ipAddress || 'unknown'}`;
    const now = new Date();
    const existingRate = this.rateLimits.get(rateKey);

    if (existingRate && existingRate.resetAt > now) {
      if (existingRate.count >= 4) {
        await prisma.securityAccessLog.create({
          data: {
            userId: user.id,
            email: authorizedEmail,
            authMethod: 'otp_gmail',
            status: 'BLOCKED',
            step: 'otp_request',
            ipAddress,
            userAgent,
            failureReason: 'Rate limit dépassé (trop de demandes de code)',
          },
        }).catch(() => {});

        throw new AppError('Trop de demandes de code de sécurité. Veuillez patienter 10 minutes.', 429);
      }
      existingRate.count += 1;
    } else {
      this.rateLimits.set(rateKey, { count: 1, resetAt: new Date(now.getTime() + 10 * 60 * 1000) });
    }

    // Récupérer la configuration (durée de validité)
    const config = await prisma.adminSecurityConfig.findUnique({ where: { id: 'singleton' } });
    const expiresInMinutes = config?.otpValidityMinutes || 5;
    const maxAttempts = config?.maxOtpAttempts || 5;

    // Génération cryptographique aléatoire d'un code à 6 chiffres
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = crypto.createHmac('sha256', salt).update(rawCode).digest('hex');

    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    // Enregistrer le challenge en mémoire (invalide automatiquement tout ancien challenge pour ce user)
    this.challenges.set(adminUserId, {
      challengeId,
      userId: adminUserId,
      email: authorizedEmail,
      codeHash,
      salt,
      expiresAt,
      attempts: 0,
      maxAttempts,
      ipAddress,
      userAgent,
      createdAt: now,
    });

    // Envoi effectif de l'email via le service transactionnel
    const emailRes = await emailService.sendSecurityCodeEmail({
      recipientEmail: authorizedEmail,
      code: rawCode,
      expiresInMinutes,
      ipAddress,
      userAgent,
    });

    // Enregistrement dans les logs de sécurité d'accès
    await prisma.securityAccessLog.create({
      data: {
        userId: user.id,
        email: authorizedEmail,
        googleIdVerified: true,
        authMethod: 'otp_gmail',
        status: 'SUCCESS',
        step: 'otp_request',
        codeSent: emailRes.success,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ challengeId, expiresInMinutes }),
      },
    }).catch(() => {});

    return {
      challengeId,
      maskedEmail: this.maskEmail(authorizedEmail),
      expiresInMinutes,
    };
  }

  /**
   * Vérifie le code OTP saisi et crée la session administrative renforcée.
   */
  public static async verifyOtpChallenge(
    prisma: PrismaClient,
    adminUserId: string,
    challengeId: string,
    candidateCode: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ adminSessionToken: string; expiresAt: Date; user: any }> {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
      include: {
        businesses: { include: { business: true }, where: { isActive: true } },
      },
    });

    if (!user || !user.isAdmin) {
      throw new AppError('Accès interdit. Seul le Super Administrateur peut valider ce challenge.', 403);
    }

    const challenge = this.challenges.get(adminUserId);
    const now = new Date();

    if (!challenge || challenge.challengeId !== challengeId) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: user.email,
          authMethod: 'otp_gmail',
          status: 'FAILED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: 'Aucun challenge actif ou challenge ID non reconnu',
        },
      }).catch(() => {});

      throw new AppError('Ce challenge de sécurité n’est plus actif. Veuillez demander un nouveau code.', 400);
    }

    // Vérifier l'expiration (5 minutes)
    if (challenge.expiresAt < now) {
      this.challenges.delete(adminUserId);
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: challenge.email,
          authMethod: 'otp_gmail',
          status: 'FAILED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: 'Code expiré (délai de 5 minutes dépassé)',
        },
      }).catch(() => {});

      throw new AppError('Le code de confirmation a expiré. Veuillez solliciter un nouveau code.', 400);
    }

    // Vérifier le nombre d'essais (max 5)
    if (challenge.attempts >= challenge.maxAttempts) {
      this.challenges.delete(adminUserId);
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: challenge.email,
          authMethod: 'otp_gmail',
          status: 'BLOCKED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: 'Trop de tentatives incorrectes (compte bloqué temporairement)',
        },
      }).catch(() => {});

      // Déclencher une alerte commerciale/sécurité
      await prisma.commercialAlert.create({
        data: {
          title: 'Alerte Sécurité: Challenge Super Admin bloqué',
          message: `5 tentatives incorrectes consécutives pour valider le code Super Admin sur ${challenge.email} depuis l'IP ${ipAddress || 'inconnue'}.`,
          priority: 'critical',
          category: 'user_suspended',
          userId: user.id,
          status: 'open',
        },
      }).catch(() => {});

      throw new AppError('Nombre maximal de tentatives atteint (5/5). Ce challenge est définitivement invalidé.', 403);
    }

    // Comparaison cryptographique sécurisée à temps constant
    const candidateHash = crypto.createHmac('sha256', challenge.salt).update(candidateCode.trim()).digest('hex');
    const isCodeValid = crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(challenge.codeHash));

    if (!isCodeValid) {
      challenge.attempts += 1;
      const remaining = challenge.maxAttempts - challenge.attempts;

      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: challenge.email,
          authMethod: 'otp_gmail',
          status: 'FAILED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: `Code incorrect (${challenge.attempts}/${challenge.maxAttempts})`,
        },
      }).catch(() => {});

      if (remaining <= 0) {
        this.challenges.delete(adminUserId);
        throw new AppError('Code incorrect. Vous avez épuisé toutes vos tentatives.', 403);
      }

      throw new AppError(`Code incorrect. Il vous reste ${remaining} tentative(s).`, 400);
    }

    // CODE VALIDE ! Invalidation immédiate du challenge (usage unique strict)
    this.challenges.delete(adminUserId);

    // Création de la session administrative renforcée
    const config = await prisma.adminSecurityConfig.findUnique({ where: { id: 'singleton' } });
    const sessionDurationMinutes = config?.sessionDurationMinutes || 60;
    const sessionExpiresAt = new Date(now.getTime() + sessionDurationMinutes * 60 * 1000);

    // Génération du token JWT spécifique d'administration renforcée
    const adminSessionToken = jwt.sign(
      {
        userId: user.id,
        email: challenge.email,
        isAdmin: true,
        adminMfaVerified: true,
        type: 'SUPER_ADMIN_ENHANCED_SESSION',
        ip: ipAddress,
      },
      getJwtSecret(),
      { expiresIn: `${sessionDurationMinutes}m` }
    );

    const tokenHash = crypto.createHash('sha256').update(adminSessionToken).digest('hex');

    // Sauvegarde de la session en base de données PostgreSQL Neon
    const sessionRecord = await prisma.adminSession.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt: sessionExpiresAt,
        isActive: true,
      },
    });

    // Journalisation du succès dans SecurityAccessLog
    await prisma.securityAccessLog.create({
      data: {
        userId: user.id,
        email: challenge.email,
        googleIdVerified: true,
        authMethod: 'otp_gmail',
        status: 'SUCCESS',
        step: 'otp_verify',
        sessionId: sessionRecord.id,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ sessionId: sessionRecord.id, sessionDurationMinutes }),
      },
    }).catch(() => {});

    // Notification si nouvelle IP
    if (config?.emailNotificationOnNewIp && ipAddress) {
      const priorLog = await prisma.securityAccessLog.findFirst({
        where: {
          userId: user.id,
          ipAddress,
          status: 'SUCCESS',
          id: { not: sessionRecord.id },
        },
      });

      if (!priorLog) {
        emailService.sendNewEnvironmentAlert({
          email: challenge.email,
          ipAddress,
          userAgent: userAgent || 'Navigateur Web',
        }).catch(() => {});
      }
    }

    return {
      adminSessionToken,
      expiresAt: sessionExpiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    };
  }

  /**
   * Vérifie la validité d'une session administrative renforcée à partir de son token.
   */
  public static async validateAdminSessionToken(
    prisma: PrismaClient,
    token: string,
    expectedUserId?: string
  ): Promise<{ isValid: boolean; user?: any; reason?: string }> {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;

      if (!decoded || !decoded.adminMfaVerified || decoded.type !== 'SUPER_ADMIN_ENHANCED_SESSION') {
        return { isValid: false, reason: 'Type de session ou claim MFA manquant.' };
      }

      if (expectedUserId && decoded.userId !== expectedUserId) {
        return { isValid: false, reason: 'Identifiant utilisateur non concordant.' };
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await prisma.adminSession.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!session || !session.isActive) {
        return { isValid: false, reason: 'Session administrative révoquée ou introuvable.' };
      }

      if (session.expiresAt < new Date()) {
        return { isValid: false, reason: 'Session administrative expirée.' };
      }

      if (!session.user || !session.user.isAdmin || !session.user.isActive) {
        return { isValid: false, reason: 'Compte administrateur inactif ou permissions révoquées.' };
      }

      return { isValid: true, user: session.user };
    } catch (err: any) {
      return { isValid: false, reason: err?.message || 'Token invalide' };
    }
  }

  /**
   * Révoque une session administrative spécifique.
   */
  public static async revokeSession(prisma: PrismaClient, sessionId: string, revokedBy: string): Promise<boolean> {
    try {
      await prisma.adminSession.update({
        where: { id: sessionId },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
