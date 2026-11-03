import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getJwtSecret } from '../config/security';
import { emailService, FAIL_CLOSED_EMAIL_ERROR_MESSAGE } from './emailService';
import { AppError } from '../middleware/errorHandler';

export const ADMIN_OTP_LENGTH = 8;
const PBKDF2_ITERATIONS = 15000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

interface PendingChallenge {
  challengeId: string;
  logId?: string;
  userId: string;
  email: string;
  codeHash: string;
  salt: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AdminSecurityService {
  private static challenges = new Map<string, PendingChallenge>(); // Key: userId
  private static rateLimits = new Map<string, { count: number; resetAt: Date }>(); // Key: account or IP
  private static verifyBruteForce = new Map<string, { count: number; resetAt: Date }>(); // Key: account or IP

  /**
   * Réinitialise les compteurs de rate-limit en mémoire (utilisé uniquement par la suite de tests automatisés)
   */
  public static resetRateLimitsForTests() {
    if (process.env.NODE_ENV === 'production') return;
    this.rateLimits.clear();
    this.verifyBruteForce.clear();
    this.challenges.clear();
  }

  private static hashOtpCode(code: string, salt: string): string {
    return crypto
      .pbkdf2Sync(code.trim(), salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString('hex');
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
   * Invalide tous les anciens challenges OTP non utilisés d'un administrateur (en mémoire et en base PostgreSQL).
   */
  private static async invalidatePreviousChallenges(prisma: PrismaClient, adminUserId: string): Promise<void> {
    this.challenges.delete(adminUserId);

    const activeLogs = await prisma.securityAccessLog.findMany({
      where: {
        userId: adminUserId,
        step: 'otp_request',
        status: 'SUCCESS',
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    for (const log of activeLogs) {
      if (!log.metadata) continue;
      try {
        const meta = JSON.parse(log.metadata);
        if (!meta.consumed) {
          await prisma.securityAccessLog.update({
            where: { id: log.id },
            data: {
              metadata: JSON.stringify({
                ...meta,
                consumed: true,
                invalidatedReason: 'SUPERSEDED_BY_NEW_OTP_REQUEST',
                invalidatedAt: new Date().toISOString(),
              }),
            },
          });
        }
      } catch {
        continue;
      }
    }
  }

  /**
   * Vérifie les limites anti-brute-force par compte, par adresse IP et par fenêtre temporelle (15 minutes).
   */
  private static checkBruteForceWindow(key: string, store: Map<string, { count: number; resetAt: Date }>, maxAllowed: number, windowMinutes: number = 15): boolean {
    const now = new Date();
    const record = store.get(key);
    if (record && record.resetAt > now) {
      if (record.count >= maxAllowed) {
        return false;
      }
    }
    return true;
  }

  private static incrementBruteForceWindow(key: string, store: Map<string, { count: number; resetAt: Date }>, windowMinutes: number = 15): void {
    const now = new Date();
    const record = store.get(key);
    if (record && record.resetAt > now) {
      record.count += 1;
    } else {
      store.set(key, { count: 1, resetAt: new Date(now.getTime() + windowMinutes * 60 * 1000) });
    }
  }

  /**
   * Initie un challenge OTP à 8 chiffres envoyé exclusivement sur le Gmail administrateur officiel.
   * POLITIQUE FAIL CLOSED :
   * - Si aucun service d'envoi d'email réel n'est configuré ou si l'envoi échoue, aucun challenge actif n'est créé et une erreur 503 est levée.
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
    emailDelivered: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!user || !user.isAdmin || !user.isActive || user.securityLocked) {
      throw new AppError('Accès interdit. Seul le Super Administrateur actif peut solliciter ce code.', 403);
    }

    const authorizedEmail = await this.getAuthorizedGoogleEmail(prisma);
    const now = new Date();
    const accountRateKey = `otp_req_acc_${adminUserId}`;
    const ipRateKey = `otp_req_ip_${ipAddress || 'unknown'}`;

    // 1. Vérification des limites de demandes par compte et par IP (max 5 demandes / 15 min)
    if (
      !this.checkBruteForceWindow(accountRateKey, this.rateLimits, 5, 15) ||
      !this.checkBruteForceWindow(ipRateKey, this.rateLimits, 8, 15)
    ) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          authMethod: 'otp_gmail',
          status: 'BLOCKED',
          step: 'otp_request',
          ipAddress,
          userAgent,
          failureReason: 'Limite de demandes de renvoi dépassée (protection anti-abus / brute-force)',
        },
      }).catch(() => {});

      throw new AppError(
        'Trop de demandes de code de sécurité. Par mesure de protection, veuillez patienter 15 minutes avant de réessayer.',
        429
      );
    }

    this.incrementBruteForceWindow(accountRateKey, this.rateLimits, 15);
    this.incrementBruteForceWindow(ipRateKey, this.rateLimits, 15);

    // 2. Invalider immédiatement tous les anciens codes non utilisés (règle d'invalidation lors d'un renvoi)
    await this.invalidatePreviousChallenges(prisma, adminUserId);

    // 3. Configuration de validité (5 minutes strictes, 5 tentatives max)
    const config = await prisma.adminSecurityConfig.findUnique({ where: { id: 'singleton' } });
    const expiresInMinutes = config?.otpValidityMinutes || 5;
    const maxAttempts = config?.maxOtpAttempts || 5;

    // 4. Génération cryptographiquement sécurisée (CSPRNG) d'un code à 8 chiffres
    const rawCode = crypto.randomInt(10000000, 100000000).toString();
    const salt = crypto.randomBytes(32).toString('hex');
    const codeHash = this.hashOtpCode(rawCode, salt);

    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    // 5. Envoi réel de l'email transactionnel
    const emailRes = await emailService.sendSecurityCodeEmail({
      recipientEmail: authorizedEmail,
      code: rawCode,
      expiresInMinutes,
      ipAddress,
      userAgent,
      prisma,
    });

    // 6. POLITIQUE FAIL CLOSED : si le service email est absent ou en échec, bloquer immédiatement
    if (!emailRes.success || !emailRes.deliveredRemotely) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: authorizedEmail,
          googleIdVerified: true,
          authMethod: 'otp_gmail',
          status: 'FAILED',
          step: 'otp_request',
          codeSent: false,
          ipAddress,
          userAgent,
          failureReason: 'Politique FAIL CLOSED : service de messagerie non configuré ou indisponible.',
        },
      }).catch(() => {});

      throw new AppError(FAIL_CLOSED_EMAIL_ERROR_MESSAGE, 503);
    }

    // 7. Persistance uniquement du hash PBKDF2-SHA256 et du sel (JAMAIS le code en clair)
    const logRecord = await prisma.securityAccessLog.create({
      data: {
        userId: user.id,
        email: authorizedEmail,
        googleIdVerified: true,
        authMethod: 'otp_gmail',
        status: 'SUCCESS',
        step: 'otp_request',
        codeSent: true,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({
          challengeId,
          expiresInMinutes,
          codeHash,
          salt,
          algorithm: 'PBKDF2-HMAC-SHA256',
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          maxAttempts,
          consumed: false,
          deliveryProvider: emailRes.provider,
        }),
      },
    }).catch(() => null);

    this.challenges.set(adminUserId, {
      challengeId,
      logId: logRecord?.id,
      userId: adminUserId,
      email: authorizedEmail,
      codeHash,
      salt,
      expiresAt,
      attempts: 0,
      maxAttempts,
      consumed: false,
      ipAddress,
      userAgent,
      createdAt: now,
    });

    return {
      challengeId,
      maskedEmail: this.maskEmail(authorizedEmail),
      expiresInMinutes,
      attemptsRemaining: maxAttempts,
      emailDelivered: true,
    };
  }

  /**
   * Charge le challenge depuis la mémoire ou depuis PostgreSQL (pour compatibilité Serverless Vercel)
   */
  private static async resolvePendingChallenge(
    prisma: PrismaClient,
    adminUserId: string,
    challengeId?: string
  ): Promise<PendingChallenge | null> {
    const inMemory = this.challenges.get(adminUserId);
    if (inMemory && !inMemory.consumed && (!challengeId || inMemory.challengeId === challengeId)) {
      return inMemory;
    }

    const recentLogs = await prisma.securityAccessLog.findMany({
      where: {
        userId: adminUserId,
        step: 'otp_request',
        status: 'SUCCESS',
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    for (const log of recentLogs) {
      if (!log.metadata) continue;
      try {
        const meta = JSON.parse(log.metadata);
        if (!meta.codeHash || !meta.salt) continue;
        if (challengeId && meta.challengeId !== challengeId) continue;

        const restored: PendingChallenge = {
          challengeId: meta.challengeId,
          logId: log.id,
          userId: adminUserId,
          email: log.email,
          codeHash: meta.codeHash,
          salt: meta.salt,
          expiresAt: new Date(meta.expiresAt),
          attempts: Number(meta.attempts || 0),
          maxAttempts: Number(meta.maxAttempts || 5),
          consumed: Boolean(meta.consumed),
          ipAddress: log.ipAddress || undefined,
          userAgent: log.userAgent || undefined,
          createdAt: log.timestamp,
        };
        if (!restored.consumed) {
          this.challenges.set(adminUserId, restored);
        }
        return restored;
      } catch {
        continue;
      }
    }

    return null;
  }

  private static async updateChallengeStateInDb(
    prisma: PrismaClient,
    challenge: PendingChallenge,
    consumed: boolean,
    invalidatedReason?: string
  ): Promise<void> {
    challenge.consumed = consumed;
    if (!challenge.logId) return;
    await prisma.securityAccessLog.update({
      where: { id: challenge.logId },
      data: {
        metadata: JSON.stringify({
          challengeId: challenge.challengeId,
          codeHash: challenge.codeHash,
          salt: challenge.salt,
          algorithm: 'PBKDF2-HMAC-SHA256',
          expiresAt: challenge.expiresAt.toISOString(),
          attempts: challenge.attempts,
          maxAttempts: challenge.maxAttempts,
          consumed,
          invalidatedReason: invalidatedReason || undefined,
          updatedAt: new Date().toISOString(),
        }),
      },
    }).catch(() => {});
  }

  /**
   * Permet d'expirer artificiellement un challenge uniquement dans les tests automatisés (NODE_ENV === 'test')
   */
  public static async forceExpireChallengeForTest(prisma: PrismaClient, adminUserId: string, challengeId: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Opération interdite en production.');
    }
    const challenge = await this.resolvePendingChallenge(prisma, adminUserId, challengeId);
    if (challenge) {
      challenge.expiresAt = new Date(Date.now() - 60 * 1000);
      await this.updateChallengeStateInDb(prisma, challenge, false, 'TEST_EXPIRED');
    }
  }

  /**
   * Vérifie exclusivement côté backend le code OTP saisi et crée la session administrative renforcée.
   */
  public static async verifyOtpChallenge(
    prisma: PrismaClient,
    adminUserId: string,
    challengeId: string | undefined,
    candidateCode: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ adminSessionToken: string; csrfToken: string; expiresAt: Date; sessionDurationMinutes: number; user: any }> {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
      include: {
        businesses: { include: { business: true }, where: { isActive: true } },
      },
    });

    if (!user || !user.isAdmin || !user.isActive || user.securityLocked) {
      throw new AppError('Accès interdit. Seul le Super Administrateur peut valider ce challenge.', 403);
    }

    const accountBruteKey = `otp_ver_acc_${adminUserId}`;
    const ipBruteKey = `otp_ver_ip_${ipAddress || 'unknown'}`;

    // Protection brute-force globale par compte et par IP sur fenêtre de 15 minutes
    if (
      !this.checkBruteForceWindow(accountBruteKey, this.verifyBruteForce, 10, 15) ||
      !this.checkBruteForceWindow(ipBruteKey, this.verifyBruteForce, 15, 15)
    ) {
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: user.email,
          authMethod: 'otp_gmail',
          status: 'BLOCKED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: 'Verrouillage temporaire anti-brute-force (trop de tentatives échouées sur 15 min)',
        },
      }).catch(() => {});

      throw new AppError(
        'Trop de tentatives de vérification échouées. Accès verrouillé temporairement pendant 15 minutes.',
        429
      );
    }

    const challenge = await this.resolvePendingChallenge(prisma, adminUserId, challengeId);
    const now = new Date();

    if (!challenge || challenge.consumed || (challengeId && challenge.challengeId !== challengeId)) {
      this.incrementBruteForceWindow(accountBruteKey, this.verifyBruteForce, 15);
      this.incrementBruteForceWindow(ipBruteKey, this.verifyBruteForce, 15);

      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: user.email,
          authMethod: 'otp_gmail',
          status: 'FAILED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: 'Challenge introuvable, déjà utilisé ou invalidé',
        },
      }).catch(() => {});

      throw new AppError('Ce code de sécurité a déjà été utilisé ou n’est plus actif. Veuillez demander un nouveau code.', 400);
    }

    // 1. Vérifier l'expiration (5 minutes)
    if (challenge.expiresAt < now) {
      this.challenges.delete(adminUserId);
      await this.updateChallengeStateInDb(prisma, challenge, true, 'EXPIRED');
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

    // 2. Vérifier le nombre d'essais déjà effectués (max 5)
    if (challenge.attempts >= challenge.maxAttempts) {
      this.challenges.delete(adminUserId);
      await this.updateChallengeStateInDb(prisma, challenge, true, 'MAX_ATTEMPTS_EXCEEDED');
      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: challenge.email,
          authMethod: 'otp_gmail',
          status: 'BLOCKED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: 'Nombre maximal de tentatives dépassé (5/5)',
        },
      }).catch(() => {});

      throw new AppError('Nombre maximal de tentatives atteint (5/5). Ce code est définitivement invalidé.', 403);
    }

    // 3. Comparaison cryptographique à temps constant du hash PBKDF2-HMAC-SHA256
    const candidateHash = this.hashOtpCode(candidateCode, challenge.salt);
    const bufCandidate = Buffer.from(candidateHash, 'hex');
    const bufExpected = Buffer.from(challenge.codeHash, 'hex');
    const isCodeValid =
      bufCandidate.length === bufExpected.length &&
      crypto.timingSafeEqual(bufCandidate, bufExpected);

    if (!isCodeValid) {
      challenge.attempts += 1;
      this.incrementBruteForceWindow(accountBruteKey, this.verifyBruteForce, 15);
      this.incrementBruteForceWindow(ipBruteKey, this.verifyBruteForce, 15);

      const remaining = challenge.maxAttempts - challenge.attempts;
      await this.updateChallengeStateInDb(
        prisma,
        challenge,
        remaining <= 0,
        remaining <= 0 ? 'MAX_ATTEMPTS_EXCEEDED' : undefined
      );

      await prisma.securityAccessLog.create({
        data: {
          userId: user.id,
          email: challenge.email,
          authMethod: 'otp_gmail',
          status: remaining <= 0 ? 'BLOCKED' : 'FAILED',
          step: 'otp_verify',
          ipAddress,
          userAgent,
          failureReason: `Code incorrect (tentative ${challenge.attempts}/${challenge.maxAttempts})`,
        },
      }).catch(() => {});

      if (remaining <= 0) {
        this.challenges.delete(adminUserId);
        await prisma.commercialAlert.create({
          data: {
            title: 'Alerte Sécurité: Challenge Super Admin verrouillé après 5 échecs',
            message: `5 tentatives incorrectes consécutives pour valider le code Super Admin sur ${challenge.email} depuis l'IP ${ipAddress || 'inconnue'}.`,
            priority: 'critical',
            category: 'user_suspended',
            userId: user.id,
            status: 'open',
          },
        }).catch(() => {});

        throw new AppError('Nombre maximal de tentatives atteint (5/5). Ce code est définitivement invalidé.', 403);
      }

      throw new AppError(`Code de sécurité incorrect. Il vous reste ${remaining} tentative(s).`, 400);
    }

    // 4. CODE VALIDE : Invalidation immédiate et définitive du challenge (Usage unique strict)
    this.challenges.delete(adminUserId);
    await this.updateChallengeStateInDb(prisma, challenge, true, 'CONSUMED_SUCCESSFULLY');

    // 5. Création de la session administrative distincte + Jeton CSRF
    const config = await prisma.adminSecurityConfig.findUnique({ where: { id: 'singleton' } });
    const sessionDurationMinutes = config?.sessionDurationMinutes || 60;
    const sessionExpiresAt = new Date(now.getTime() + sessionDurationMinutes * 60 * 1000);

    const csrfToken = crypto.randomBytes(24).toString('hex');
    const csrfHash = crypto.createHash('sha256').update(csrfToken).digest('hex');

    const adminSessionToken = jwt.sign(
      {
        userId: user.id,
        email: challenge.email,
        isAdmin: true,
        adminMfaVerified: true,
        type: 'SUPER_ADMIN_ENHANCED_SESSION',
        csrfHash,
        ip: ipAddress,
      },
      getJwtSecret(),
      { expiresIn: `${sessionDurationMinutes}m` }
    );

    const tokenHash = crypto.createHash('sha256').update(adminSessionToken).digest('hex');

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
   * Extrait le cookie HttpOnly `commercia_admin_session` depuis l'en-tête Cookie brut
   */
  public static extractAdminCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (name === 'commercia_admin_session' && val) {
        return decodeURIComponent(val);
      }
    }
    return null;
  }

  /**
   * Vérifie la validité d'une session administrative renforcée à partir de son token (Cookie HttpOnly ou Header)
   * et contrôle le jeton CSRF si fourni.
   */
  public static async validateAdminSessionToken(
    prisma: PrismaClient,
    token: string,
    expectedUserId?: string,
    csrfTokenHeader?: string,
    requireCsrfCheck: boolean = false
  ): Promise<{ isValid: boolean; user?: any; reason?: string }> {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;

      if (!decoded || !decoded.adminMfaVerified || decoded.type !== 'SUPER_ADMIN_ENHANCED_SESSION') {
        return { isValid: false, reason: 'Type de session ou claim MFA manquant.' };
      }

      if (expectedUserId && decoded.userId !== expectedUserId) {
        return { isValid: false, reason: 'Identifiant utilisateur non concordant.' };
      }

      if (requireCsrfCheck && decoded.csrfHash && csrfTokenHeader) {
        const providedCsrfHash = crypto.createHash('sha256').update(csrfTokenHeader).digest('hex');
        if (providedCsrfHash !== decoded.csrfHash) {
          return { isValid: false, reason: 'Jeton de protection CSRF invalide.' };
        }
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
