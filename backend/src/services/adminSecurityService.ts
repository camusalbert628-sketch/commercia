import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getJwtSecret, getAdminOtpHashSecret } from '../config/security';
import {
  emailService,
  EMAIL_NOT_CONFIGURED_MESSAGE,
  EMAIL_SEND_FAILED_MESSAGE,
} from './emailService';
import { AppError } from '../middleware/errorHandler';

export const ADMIN_OTP_LENGTH = 8;
export const ADMIN_OTP_VALIDITY_MINUTES = 5;
export const ADMIN_OTP_MAX_ATTEMPTS = 5;
export const ADMIN_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const ADMIN_OTP_MAX_RESENDS_PER_HOUR = 3; // 1 envoi initial + 3 renvois = 4 envois max par heure
export const ADMIN_SESSION_ABSOLUTE_MINUTES = 60;
export const ADMIN_SESSION_INACTIVITY_MINUTES = 10;

export class AdminSecurityService {
  // Option de test uniquement (strictement inactive en production) pour tester les envois successifs sans attendre 60s
  private static skipCooldownInTest = false;

  public static setSkipCooldownForTests(skip: boolean) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      throw new Error('Opération interdite en production.');
    }
    this.skipCooldownInTest = skip;
  }

  /**
   * Réinitialise les compteurs de rate-limit et challenges en base (utilisé uniquement par la suite de tests automatisés)
   */
  public static async resetRateLimitsForTests(prisma?: PrismaClient) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') return;
    if (prisma) {
      await prisma.adminRateLimit.deleteMany({}).catch(() => {});
      await prisma.adminOtpChallenge.deleteMany({}).catch(() => {});
    }
  }

  /**
   * Calcule l'empreinte HMAC-SHA-256 du code OTP à l'aide du secret serveur dédié (ADMIN_OTP_HASH_SECRET).
   * Liée contextuellement à l'identifiant du challenge et à l'identifiant du Super Admin.
   */
  public static computeOtpHmac(challengeId: string, userId: string, code: string): string {
    const secret = getAdminOtpHashSecret();
    return crypto
      .createHmac('sha256', secret)
      .update(`${challengeId}:${userId}:${code.trim()}`)
      .digest('hex');
  }

  /**
   * Comparaison à temps constant de deux empreintes HMAC-SHA-256 hexadécimales.
   */
  public static verifyOtpHmacConstantTime(candidateHmacHex: string, expectedHmacHex: string): boolean {
    try {
      const bufCandidate = Buffer.from(candidateHmacHex, 'hex');
      const bufExpected = Buffer.from(expectedHmacHex, 'hex');
      if (bufCandidate.length === 0 || bufCandidate.length !== bufExpected.length) {
        return false;
      }
      return crypto.timingSafeEqual(bufCandidate, bufExpected);
    } catch {
      return false;
    }
  }

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
   * Masque l'email pour l'affichage sécurisé (ex: "c*************@gmail.com")
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
   * Vérifie et incrémente un compteur de limitation de débit persistant dans PostgreSQL (compatible Serverless Vercel).
   */
  private static async checkAndIncrementPersistentRateLimit(
    prisma: PrismaClient,
    key: string,
    maxAllowed: number,
    windowSeconds: number,
    lockoutSecondsOnExceed?: number
  ): Promise<{ allowed: boolean; retryAfterSeconds: number; currentCount: number }> {
    const now = new Date();
    const existing = await prisma.adminRateLimit.findUnique({ where: { key } });

    if (existing) {
      if (existing.lockedUntil && existing.lockedUntil > now) {
        const retryAfterSeconds = Math.ceil((existing.lockedUntil.getTime() - now.getTime()) / 1000);
        return { allowed: false, retryAfterSeconds, currentCount: existing.count };
      }

      if (existing.expiresAt > now) {
        if (existing.count >= maxAllowed) {
          const lockedUntil = lockoutSecondsOnExceed
            ? new Date(now.getTime() + lockoutSecondsOnExceed * 1000)
            : existing.expiresAt;
          await prisma.adminRateLimit.update({
            where: { key },
            data: { lockedUntil },
          }).catch(() => {});
          const retryAfterSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
          return { allowed: false, retryAfterSeconds, currentCount: existing.count };
        }

        const updated = await prisma.adminRateLimit.update({
          where: { key },
          data: { count: { increment: 1 } },
        });
        return { allowed: true, retryAfterSeconds: 0, currentCount: updated.count };
      }
    }

    const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
    await prisma.adminRateLimit.upsert({
      where: { key },
      update: {
        count: 1,
        windowStart: now,
        expiresAt,
        lockedUntil: null,
      },
      create: {
        key,
        count: 1,
        windowStart: now,
        expiresAt,
        lockedUntil: null,
      },
    });

    return { allowed: true, retryAfterSeconds: 0, currentCount: 1 };
  }

  /**
   * Invalide tous les anciens challenges OTP en attente d'un administrateur dans PostgreSQL.
   */
  public static async invalidatePreviousChallenges(
    prisma: PrismaClient,
    adminUserId: string,
    reason: string = 'SUPERSEDED_BY_NEW_OTP_REQUEST'
  ): Promise<void> {
    await prisma.adminOtpChallenge.updateMany({
      where: {
        userId: adminUserId,
        status: 'PENDING',
      },
      data: {
        status: 'INVALIDATED',
        invalidatedReason: reason,
      },
    });
  }

  /**
   * Initie un challenge OTP à 8 chiffres envoyé exclusivement via Resend API au Gmail administrateur officiel.
   * POLITIQUE FAIL CLOSED :
   * - Si la configuration Resend est absente, retourne 503 avec l'ÉTAT 1 sans générer ni afficher de code.
   * - Si l'envoi Resend échoue, invalide immédiatement le challenge et retourne 503 avec l'ÉTAT 3.
   * - Le code OTP n'est JAMAIS retourné ni journalisé.
   */
  public static async initiateOtpChallenge(
    prisma: PrismaClient,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    challengeId: string;
    maskedEmail: string;
    expiresInMinutes: number;
    attemptsRemaining: number;
    resendCooldownSeconds: number;
    emailDelivered: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!user || !user.isAdmin || !user.isActive || user.securityLocked) {
      await prisma.securityAccessLog.create({
        data: {
          userId: adminUserId,
          email: user?.email || 'unknown',
          authMethod: 'direct_api',
          status: 'BLOCKED',
          step: 'admin_api_access',
          ipAddress,
          userAgent,
          failureReason: 'Tentative non autorisée de demande OTP Super Admin',
        },
      }).catch(() => {});
      throw new AppError('Accès interdit. Seul le Super Administrateur actif peut solliciter ce code.', 403);
    }

    const authorizedEmail = await this.getAuthorizedGoogleEmail(prisma);
    const now = new Date();

    // Journalisation de la demande OTP (Section 11)
    await prisma.securityAccessLog.create({
      data: {
        userId: user.id,
        email: authorizedEmail,
        googleIdVerified: Boolean(user.googleId),
        authMethod: 'otp_resend',
        status: 'SUCCESS',
        step: 'otp_request',
        codeSent: false,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ event: 'OTP_REQUEST_INITIATED' }),
      },
    }).catch(() => {});

    // 1. ÉTAT 1 — VÉRIFICATION DE LA CONFIGURATION RESEND AVANT TOUTE GÉNÉRATION DE CODE
    if (!emailService.isOperational()) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          googleIdVerified: Boolean(user.googleId),
          authMethod: 'otp_resend',
          status: 'FAILED',
          step: 'otp_send_failed',
          codeSent: false,
          ipAddress,
          userAgent,
          failureReason: 'Configuration Resend absente (RESEND_API_KEY ou ADMIN_OTP_FROM_EMAIL manquant)',
        },
      }).catch(() => {});

      const err = new AppError(EMAIL_NOT_CONFIGURED_MESSAGE, 503);
      (err as any).code = 'EMAIL_NOT_CONFIGURED';
      throw err;
    }

    // 2. Délai obligatoire de 60 secondes avant renvoi (Section 5.3)
    if (!this.skipCooldownInTest) {
      const lastChallenge = await prisma.adminOtpChallenge.findFirst({
        where: {
          userId: adminUserId,
          status: { in: ['PENDING', 'INVALIDATED', 'CONSUMED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastChallenge) {
        const elapsedSeconds = Math.floor((now.getTime() - lastChallenge.createdAt.getTime()) / 1000);
        if (elapsedSeconds < ADMIN_OTP_RESEND_COOLDOWN_SECONDS) {
          const waitSeconds = ADMIN_OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
          await prisma.securityAccessLog.create({
            data: {
              userId: user.id,
              email: authorizedEmail,
              authMethod: 'otp_resend',
              status: 'BLOCKED',
              step: 'rate_limit_triggered',
              ipAddress,
              userAgent,
              failureReason: `Délai avant renvoi non écoulé (${waitSeconds}s restantes sur 60s)`,
            },
          }).catch(() => {});

          throw new AppError(
            `Veuillez patienter ${waitSeconds} seconde(s) avant de demander un nouveau code de sécurité.`,
            429
          );
        }
      }
    }

    // 3. Limitation stricte des renvois : max 3 renvois par heure (soit 4 envois max / heure par compte) + limite par IP
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const sentLastHourCount = await prisma.adminOtpChallenge.count({
      where: {
        userId: adminUserId,
        createdAt: { gte: oneHourAgo },
        status: { not: 'SEND_FAILED' },
      },
    });

    const maxTotalSendsPerHour = 1 + ADMIN_OTP_MAX_RESENDS_PER_HOUR; // 1 initial + 3 renvois = 4
    const ipRateCheck = await this.checkAndIncrementPersistentRateLimit(
      prisma,
      `otp_send_ip:${ipAddress || 'unknown'}`,
      6,
      3600
    );

    if (sentLastHourCount >= maxTotalSendsPerHour || !ipRateCheck.allowed) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'BLOCKED',
          step: 'rate_limit_triggered',
          ipAddress,
          userAgent,
          failureReason: `Limite horaire de renvois OTP atteinte (${sentLastHourCount}/${maxTotalSendsPerHour} sur 1h)`,
        },
      }).catch(() => {});

      throw new AppError(
        'Limite maximale de renvois atteinte (3 renvois maximum par heure). Veuillez réessayer ultérieurement.',
        429
      );
    }

    // 4. Invalider immédiatement tous les anciens challenges non utilisés (Section 5.1 & 5.3)
    await this.invalidatePreviousChallenges(prisma, adminUserId, 'SUPERSEDED_BY_NEW_OTP_REQUEST');

    // 5. Génération CSPRNG d'un code numérique à 8 chiffres et calcul de son empreinte HMAC-SHA-256
    const rawCode = crypto.randomInt(10000000, 100000000).toString();
    const challengeId = crypto.randomUUID();
    const expiresInMinutes = ADMIN_OTP_VALIDITY_MINUTES;
    const maxAttempts = ADMIN_OTP_MAX_ATTEMPTS;
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);
    const codeHmac = this.computeOtpHmac(challengeId, adminUserId, rawCode);

    // 6. Enregistrement du challenge en base de données (uniquement l'empreinte HMAC-SHA-256)
    await prisma.adminOtpChallenge.create({
      data: {
        id: challengeId,
        userId: adminUserId,
        codeHmac,
        status: 'PENDING',
        attempts: 0,
        maxAttempts,
        createdAt: now,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // 7. Transmission de l'e-mail via Resend API
    const emailRes = await emailService.sendSecurityCodeEmail({
      recipientEmail: authorizedEmail,
      code: rawCode,
      expiresInMinutes,
      ipAddress,
      userAgent,
      prisma,
    });

    // 8. ÉTAT 3 — Si l'envoi échoue : invalider immédiatement le challenge créé et bloquer l'accès
    if (!emailRes.success || !emailRes.deliveredRemotely) {
      await prisma.adminOtpChallenge.update({
        where: { id: challengeId },
        data: {
          status: 'SEND_FAILED',
          invalidatedReason: emailRes.errorCode || 'EMAIL_SEND_FAILED',
        },
      }).catch(() => {});

      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          googleIdVerified: Boolean(user.googleId),
          authMethod: 'otp_resend',
          status: 'FAILED',
          step: 'otp_send_failed',
          codeSent: false,
          ipAddress,
          userAgent,
          failureReason: 'Échec de transmission de l’e-mail OTP par le fournisseur Resend.',
        },
      }).catch(() => {});

      const errMsg =
        emailRes.errorCode === 'EMAIL_NOT_CONFIGURED'
          ? EMAIL_NOT_CONFIGURED_MESSAGE
          : EMAIL_SEND_FAILED_MESSAGE;
      const err = new AppError(errMsg, 503);
      (err as any).code = emailRes.errorCode || 'EMAIL_SEND_FAILED';
      throw err;
    }

    // 9. Journalisation du succès d'envoi (SANS jamais journaliser le code OTP)
    await prisma.securityAccessLog.create({
      data: {
        userId: user.id,
        email: authorizedEmail,
        googleIdVerified: Boolean(user.googleId),
        authMethod: 'otp_resend',
        status: 'SUCCESS',
        step: 'otp_send_succeeded',
        codeSent: true,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({
          challengeId,
          expiresInMinutes,
          algorithm: 'HMAC-SHA-256',
          expiresAt: expiresAt.toISOString(),
          maxAttempts,
          deliveryProvider: emailRes.provider,
        }),
      },
    }).catch(() => {});

    return {
      challengeId,
      maskedEmail: this.maskEmail(authorizedEmail),
      expiresInMinutes,
      attemptsRemaining: maxAttempts,
      resendCooldownSeconds: ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
      emailDelivered: true,
    };
  }

  /**
   * Permet d'expirer artificiellement un challenge uniquement dans les tests automatisés (NODE_ENV === 'test')
   */
  public static async forceExpireChallengeForTest(
    prisma: PrismaClient,
    adminUserId: string,
    challengeId: string
  ): Promise<void> {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      throw new Error('Opération interdite en production.');
    }
    await prisma.adminOtpChallenge.updateMany({
      where: { id: challengeId, userId: adminUserId },
      data: {
        expiresAt: new Date(Date.now() - 60 * 1000),
      },
    });
  }

  /**
   * Vérifie exclusivement côté serveur le code OTP saisi, consomme atomiquement le challenge
   * et crée la session administrateur privilégiée.
   */
  public static async verifyOtpChallenge(
    prisma: PrismaClient,
    adminUserId: string,
    challengeId: string | undefined,
    candidateCode: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    adminSessionToken: string;
    csrfToken: string;
    expiresAt: Date;
    sessionDurationMinutes: number;
    user: any;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!user || !user.isAdmin || !user.isActive || user.securityLocked) {
      throw new AppError('Accès interdit. Seul le Super Administrateur peut valider ce challenge.', 403);
    }

    const authorizedEmail = await this.getAuthorizedGoogleEmail(prisma);

    // 1. Protection anti-brute-force persistante par compte et par adresse IP
    const accountRate = await this.checkAndIncrementPersistentRateLimit(
      prisma,
      `otp_verify_acc:${adminUserId}`,
      15,
      900,
      900
    );
    const ipRate = await this.checkAndIncrementPersistentRateLimit(
      prisma,
      `otp_verify_ip:${ipAddress || 'unknown'}`,
      20,
      900,
      900
    );

    if (!accountRate.allowed || !ipRate.allowed) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'BLOCKED',
          step: 'rate_limit_triggered',
          ipAddress,
          userAgent,
          failureReason: 'Verrouillage temporaire anti-brute-force sur la vérification OTP',
        },
      }).catch(() => {});

      throw new AppError(
        'Trop de tentatives de vérification échouées. Accès temporairement verrouillé pendant 15 minutes.',
        429
      );
    }

    // 2. Recherche du challenge en base de données
    const challenge = challengeId
      ? await prisma.adminOtpChallenge.findUnique({ where: { id: challengeId } })
      : await prisma.adminOtpChallenge.findFirst({
          where: { userId: adminUserId },
          orderBy: { createdAt: 'desc' },
        });

    const now = new Date();

    if (!challenge || challenge.userId !== adminUserId) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'FAILED',
          step: 'otp_verify_failed',
          ipAddress,
          userAgent,
          failureReason: 'Challenge OTP introuvable ou non associé au Super Admin',
        },
      }).catch(() => {});

      throw new AppError('Session de vérification invalide ou introuvable. Veuillez demander un nouveau code.', 400);
    }

    // 3. Vérifier si le code a déjà été utilisé ou invalidé (détection de rejeu)
    if (challenge.status === 'CONSUMED' || challenge.validatedAt !== null) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'BLOCKED',
          step: 'otp_replay_attempt',
          ipAddress,
          userAgent,
          failureReason: `Tentative de rejeu d'un code OTP déjà consommé (challengeId: ${challenge.id})`,
        },
      }).catch(() => {});

      throw new AppError('Ce code de sécurité a déjà été utilisé. Veuillez demander un nouveau code.', 400);
    }

    if (challenge.status === 'INVALIDATED' || challenge.status === 'SEND_FAILED') {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'FAILED',
          step: 'otp_verify_failed',
          ipAddress,
          userAgent,
          failureReason: `Tentative d'utilisation d'un ancien code invalidé (${challenge.invalidatedReason || challenge.status})`,
        },
      }).catch(() => {});

      throw new AppError("Cet ancien code n'est plus valide suite à un renvoi. Veuillez saisir le dernier code reçu.", 400);
    }

    // 4. Vérifier que le nombre maximal de tentatives (5) n'est pas déjà atteint
    if (challenge.status === 'LOCKED' || challenge.attempts >= challenge.maxAttempts) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'BLOCKED',
          step: 'otp_verify_failed',
          ipAddress,
          userAgent,
          failureReason: `Tentative sur un challenge verrouillé (${challenge.attempts}/${challenge.maxAttempts} essais)`,
        },
      }).catch(() => {});

      throw new AppError('Nombre maximal de tentatives atteint (5/5). Ce code est définitivement invalidé.', 403);
    }

    // 5. Vérifier la date d'expiration (5 minutes)
    if (challenge.expiresAt <= now || challenge.status === 'EXPIRED') {
      await prisma.adminOtpChallenge.update({
        where: { id: challenge.id },
        data: { status: 'EXPIRED', invalidatedReason: 'EXPIRED' },
      }).catch(() => {});

      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'FAILED',
          step: 'otp_expired',
          ipAddress,
          userAgent,
          failureReason: 'Code OTP expiré (délai de 5 minutes dépassé)',
        },
      }).catch(() => {});

      throw new AppError('Le code de sécurité a expiré. Veuillez demander un nouveau code.', 400);
    }

    // 6. Calcul de l'empreinte HMAC-SHA-256 du code saisi et comparaison à temps constant
    const candidateHmac = this.computeOtpHmac(challenge.id, adminUserId, candidateCode);
    const isCodeValid = this.verifyOtpHmacConstantTime(candidateHmac, challenge.codeHmac);

    if (!isCodeValid) {
      const updatedChallenge = await prisma.adminOtpChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts: { increment: 1 },
        },
      });

      const currentAttempts = updatedChallenge.attempts;
      const remaining = Math.max(0, challenge.maxAttempts - currentAttempts);

      if (currentAttempts >= challenge.maxAttempts) {
        await prisma.adminOtpChallenge.update({
          where: { id: challenge.id },
          data: {
            status: 'LOCKED',
            invalidatedReason: 'MAX_ATTEMPTS_EXCEEDED',
          },
        }).catch(() => {});

        await prisma.securityAccessLog.create({
          data: {
            userId: user.id,
            email: authorizedEmail,
            authMethod: 'otp_resend',
            status: 'BLOCKED',
            step: 'otp_verify_failed',
            ipAddress,
            userAgent,
            failureReason: `Challenge invalidé après ${currentAttempts}/${challenge.maxAttempts} tentatives incorrectes`,
          },
        }).catch(() => {});

        await prisma.commercialAlert.create({
          data: {
            title: 'Alerte Sécurité: Challenge Super Admin verrouillé après 5 échecs',
            message: `5 tentatives incorrectes consécutives ont été détectées sur le challenge OTP Super Admin depuis l'IP ${ipAddress || 'inconnue'}.`,
            priority: 'critical',
            category: 'user_suspended',
            userId: user.id,
            status: 'open',
          },
        }).catch(() => {});

        throw new AppError('Nombre maximal de tentatives atteint (5/5). Ce code est définitivement invalidé.', 403);
      }

      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'FAILED',
          step: 'otp_verify_failed',
          ipAddress,
          userAgent,
          failureReason: `Code OTP incorrect (tentative ${currentAttempts}/${challenge.maxAttempts})`,
        },
      }).catch(() => {});

      throw new AppError(`Code de sécurité incorrect. Il vous reste ${remaining} tentative(s).`, 400);
    }

    // 7. CONSOMMATION ATOMIQUE DU CHALLENGE (Empêche strictement toute validation concurrente / Race Condition)
    const atomicUpdate = await prisma.adminOtpChallenge.updateMany({
      where: {
        id: challenge.id,
        userId: adminUserId,
        status: 'PENDING',
        validatedAt: null,
        attempts: challenge.attempts,
        expiresAt: { gt: now },
      },
      data: {
        status: 'CONSUMED',
        validatedAt: now,
        invalidatedReason: 'CONSUMED_SUCCESSFULLY',
      },
    });

    if (atomicUpdate.count !== 1) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_resend',
          status: 'BLOCKED',
          step: 'otp_replay_attempt',
          ipAddress,
          userAgent,
          failureReason: 'Tentative de validation concurrente ou rejeu détecté (verrouillage atomique)',
        },
      }).catch(() => {});

      throw new AppError('Ce code de sécurité a déjà été utilisé ou consommé.', 400);
    }

    // Réinitialiser le compteur anti-brute-force de vérification après succès légitime
    await prisma.adminRateLimit.deleteMany({
      where: { key: `otp_verify_acc:${adminUserId}` },
    }).catch(() => {});

    // 8. Création de la session administrateur privilégiée distincte
    const config = await prisma.adminSecurityConfig.findUnique({ where: { id: 'singleton' } });
    const sessionDurationMinutes = Math.min(
      config?.sessionDurationMinutes || ADMIN_SESSION_ABSOLUTE_MINUTES,
      240
    );
    const sessionExpiresAt = new Date(now.getTime() + sessionDurationMinutes * 60 * 1000);

    const csrfToken = crypto.randomBytes(32).toString('hex');
    const csrfHash = crypto.createHash('sha256').update(csrfToken).digest('hex');
    const sessionNonce = crypto.randomUUID();

    const adminSessionToken = jwt.sign(
      {
        jti: sessionNonce,
        userId: user.id,
        isAdmin: true,
        adminMfaVerified: true,
        type: 'SUPER_ADMIN_ENHANCED_SESSION',
        csrfHash,
      },
      getJwtSecret(),
      { expiresIn: `${sessionDurationMinutes}m` }
    );

    const tokenHash = crypto.createHash('sha256').update(adminSessionToken).digest('hex');

    const sessionRecord = await prisma.adminSession.create({
      data: {
        userId: user.id,
        tokenHash,
        csrfHash,
        ipAddress,
        userAgent,
        lastActivityAt: now,
        expiresAt: sessionExpiresAt,
        isActive: true,
      },
    });

    // Journalisation de la validation OTP réussie et de la création de session (Section 11)
    await prisma.securityAccessLog.create({
      data: {
        userId: user.id,
        email: authorizedEmail,
        googleIdVerified: true,
        authMethod: 'otp_resend',
        status: 'SUCCESS',
        step: 'otp_verify_succeeded',
        sessionId: sessionRecord.id,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({
          challengeId: challenge.id,
          sessionId: sessionRecord.id,
          sessionDurationMinutes,
          inactivityTimeoutMinutes: ADMIN_SESSION_INACTIVITY_MINUTES,
        }),
      },
    }).catch(() => {});

    await prisma.securityAccessLog.create({
      data: {
        userId: user.id,
        email: authorizedEmail,
        googleIdVerified: true,
        authMethod: 'otp_resend',
        status: 'SUCCESS',
        step: 'admin_session_created',
        sessionId: sessionRecord.id,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({
          sessionId: sessionRecord.id,
          expiresAt: sessionExpiresAt.toISOString(),
        }),
      },
    }).catch(() => {});

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
        emailService
          .sendNewEnvironmentAlert({
            email: authorizedEmail,
            ipAddress,
            userAgent: userAgent || 'Navigateur Web',
          })
          .catch(() => {});
      }
    }

    return {
      adminSessionToken,
      csrfToken,
      expiresAt: sessionExpiresAt,
      sessionDurationMinutes,
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
   * Extrait le cookie HttpOnly (`__Host-commercia_admin_session` ou `commercia_admin_session`) depuis l'en-tête Cookie
   */
  public static extractAdminCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if ((name === '__Host-commercia_admin_session' || name === 'commercia_admin_session') && val) {
        return decodeURIComponent(val);
      }
    }
    return null;
  }

  /**
   * Vérifie la validité d'une session administrative privilégiée côté serveur :
   * - Signature et claims du jeton
   * - Présence et état actif en base PostgreSQL
   * - Durée de vie absolue (expiresAt)
   * - Expiration automatique après période d'inactivité (lastActivityAt)
   * - Vérification du jeton anti-CSRF sur les requêtes mutatives
   */
  public static async validateAdminSessionToken(
    prisma: PrismaClient,
    token: string,
    expectedUserId?: string,
    csrfTokenHeader?: string,
    requireCsrfCheck: boolean = false
  ): Promise<{ isValid: boolean; user?: any; sessionId?: string; reason?: string }> {
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

      const now = new Date();

      // 1. Vérification de la durée de vie absolue
      if (session.expiresAt <= now) {
        await prisma.adminSession.update({
          where: { id: session.id },
          data: { isActive: false, revokedAt: now, revokedReason: 'ABSOLUTE_TIMEOUT' },
        }).catch(() => {});
        return { isValid: false, reason: 'Session administrative expirée.' };
      }

      // 2. Vérification de l'expiration automatique par inactivité (15 minutes)
      const inactivityLimitMs = ADMIN_SESSION_INACTIVITY_MINUTES * 60 * 1000;
      if (session.lastActivityAt && now.getTime() - session.lastActivityAt.getTime() > inactivityLimitMs) {
        await prisma.adminSession.update({
          where: { id: session.id },
          data: { isActive: false, revokedAt: now, revokedReason: 'INACTIVITY_TIMEOUT' },
        }).catch(() => {});
        return { isValid: false, reason: 'Session administrative expirée pour cause d’inactivité.' };
      }

      // 3. Vérification du compte Super Admin en base de données
      if (!session.user || !session.user.isAdmin || !session.user.isActive || session.user.securityLocked) {
        return { isValid: false, reason: 'Compte administrateur inactif ou permissions révoquées.' };
      }

      // 4. Vérification stricte de la protection CSRF pour les opérations mutatives
      const expectedCsrfHash = session.csrfHash || decoded.csrfHash;
      if (requireCsrfCheck && expectedCsrfHash) {
        if (!csrfTokenHeader) {
          return { isValid: false, reason: 'Jeton de protection CSRF manquant.' };
        }
        const providedCsrfHash = crypto.createHash('sha256').update(csrfTokenHeader).digest('hex');
        const bufProvided = Buffer.from(providedCsrfHash, 'hex');
        const bufExpected = Buffer.from(expectedCsrfHash, 'hex');
        if (bufProvided.length !== bufExpected.length || !crypto.timingSafeEqual(bufProvided, bufExpected)) {
          return { isValid: false, reason: 'Jeton de protection CSRF invalide.' };
        }
      }

      // 5. Renouvellement de l'horodatage d'activité
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { lastActivityAt: now },
      }).catch(() => {});

      return { isValid: true, user: session.user, sessionId: session.id };
    } catch (err: any) {
      return { isValid: false, reason: err?.message || 'Token invalide' };
    }
  }

  /**
   * Révoque une session administrative spécifique et journalise l'événement.
   */
  public static async revokeSession(
    prisma: PrismaClient,
    sessionId: string,
    revokedBy: string,
    reason: string = 'MANUAL_REVOCATION'
  ): Promise<boolean> {
    try {
      const updated = await prisma.adminSession.update({
        where: { id: sessionId },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy,
          revokedReason: reason,
        },
      });

      await prisma.securityAccessLog.create({
        data: {
          userId: updated.userId,
          email: 'admin',
          authMethod: 'otp_resend',
          status: 'SUCCESS',
          step: 'admin_session_revoked',
          sessionId: updated.id,
          metadata: JSON.stringify({ revokedBy, reason }),
        },
      }).catch(() => {});

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Révoque une session administrative par son jeton brut (ex: lors de la déconnexion /logout).
   */
  public static async revokeSessionByToken(
    prisma: PrismaClient,
    token: string,
    revokedBy: string
  ): Promise<boolean> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await prisma.adminSession.findUnique({ where: { tokenHash } });
      if (!session) return false;
      return await this.revokeSession(prisma, session.id, revokedBy, 'USER_LOGOUT');
    } catch {
      return false;
    }
  }

  /**
   * Simule une inactivité de plus de 15 minutes uniquement pour les tests automatisés (NODE_ENV === 'test')
   */
  public static async forceInactivitySessionForTest(
    prisma: PrismaClient,
    token: string
  ): Promise<void> {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      throw new Error('Opération interdite en production.');
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.adminSession.updateMany({
      where: { tokenHash },
      data: {
        lastActivityAt: new Date(Date.now() - (ADMIN_SESSION_INACTIVITY_MINUTES + 5) * 60 * 1000),
      },
    });
  }
}
