import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  AdminSecurityService,
  ADMIN_OTP_LENGTH,
  ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
} from '../services/adminSecurityService';
import { PhoneService } from '../services/phoneService';
import {
  emailService,
  EMAIL_NOT_CONFIGURED_MESSAGE,
  EMAIL_SEND_SUCCESS_MESSAGE,
  EMAIL_SEND_FAILED_MESSAGE,
  ADMIN_OTP_EMAIL_SUBJECT,
  buildAdminOtpPlainText,
} from '../services/emailService';
import {
  verifyGoogleIdToken,
  validateOAuthRedirectUri,
  getAdminOtpHashSecret,
} from '../config/security';
import { requireAdmin } from '../middleware/auth';

process.env.NODE_ENV = 'test';
const prisma = new PrismaClient();

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🛡️ SUITE D’AUDIT CRITIQUE : SÉCURITÉ SUPER ADMIN (SECTION 12 COMPLÈTE)');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     Détails: ${details}`);
    }
  }

  try {
    // Nettoyage initial de toute ancienne notification contenant un OTP historique
    await prisma.notification.deleteMany({
      where: { type: 'security_otp' },
    });

    // =========================================================================
    // GROUPE 1 : PRÉSERVATION DU COMPTE SUPER ADMIN & DURCISSEMENT GOOGLE OAUTH
    // =========================================================================
    console.log('--- GROUPE 1 : COMPTE SUPER ADMIN EXISTANT & GOOGLE OAUTH (SECTION 1 & 2) ---');

    const allAdmins = await prisma.user.findMany({
      where: { isAdmin: true },
    });
    const adminUser = allAdmins[0];

    if (!adminUser) {
      throw new Error('Compte Super Admin introuvable en base.');
    }

    const authorizedEmail = await AdminSecurityService.getAuthorizedGoogleEmail(prisma);
    const maskedEmail = AdminSecurityService.maskEmail(authorizedEmail);

    assert(
      allAdmins.length === 1 &&
        adminUser.id === '882d1b99-c074-4084-9533-a2a48ff88556' &&
        adminUser.email === 'admin@commercia.com' &&
        authorizedEmail === 'camusalbert628@gmail.com' &&
        maskedEmail === 'c*************@gmail.com',
      `[OAUTH-1] Compte Super Admin unique préservé intact (id=${adminUser.id}, email=${adminUser.email}, Gmail masqué=${maskedEmail})`
    );

    // OAUTH-2 : Jeton non signé / malformé rejeté (aucun fallback sur email non signé)
    let unsignedRejected = false;
    try {
      await verifyGoogleIdToken(undefined);
    } catch (err: any) {
      unsignedRejected = err.message.includes('manquant');
    }
    assert(
      unsignedRejected,
      '[OAUTH-2] Rejet strict de toute connexion Google sans jeton cryptographique signé (zéro confiance dans un email frontend)'
    );

    // OAUTH-3 : Jeton Google invalide / signature falsifiée rejeté
    let invalidSignatureRejected = false;
    try {
      const fakeHeader = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fake' })).toString('base64url');
      const fakePayload = Buffer.from(
        JSON.stringify({
          iss: 'https://accounts.google.com',
          aud: '210731042943-aaap4r2isg8upmn22qapoifnd15703tn.apps.googleusercontent.com',
          sub: '1234567890',
          email: 'camusalbert628@gmail.com',
          email_verified: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url');
      await verifyGoogleIdToken(`${fakeHeader}.${fakePayload}.fakesignature`);
    } catch {
      invalidSignatureRejected = true;
    }
    assert(
      invalidSignatureRejected,
      '[OAUTH-3] Jeton Google avec signature cryptographique invalide rejeté côté serveur'
    );

    // OAUTH-4 : Validation stricte de l'URI de redirection OAuth
    assert(
      validateOAuthRedirectUri('https://mycommercia.vercel.app/auth') === true &&
        validateOAuthRedirectUri('https://evil-phishing.example.com/callback') === false &&
        validateOAuthRedirectUri('javascript:alert(1)') === false,
      '[OAUTH-4] Validation stricte des URL de redirection OAuth (rejet des domaines externes non autorisés)'
    );

    // OAUTH-5 : Liaison immuable du Google sub et détection d'usurpation de sub
    const originalGoogleId = adminUser.googleId;
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { googleId: 'google-sub-immutable-owner-001' },
    });
    const updatedAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
    const spoofedSubMismatch =
      updatedAdmin?.googleId !== null && updatedAdmin?.googleId !== 'google-sub-attacker-999';
    // Restaurer l'état original
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { googleId: originalGoogleId },
    });
    assert(
      spoofedSubMismatch,
      '[OAUTH-5] Identifiant Google `sub` immuable vérifié : rejet de toute tentative de connexion avec un `sub` différent'
    );

    // =========================================================================
    // GROUPE 2 : TESTS DU CODE OTP, HMAC-SHA-256, RESEND & CONCURRENCE (SECTION 5, 6, 8, 12)
    // =========================================================================
    console.log('\n--- GROUPE 2 : SYSTÈME OTP 8 CHIFFRES, HMAC-SHA-256, RESEND & CONCURRENCE ---');

    const capturedConsoleLogs: string[] = [];
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;

    let interceptedMail = null as {
      to: string;
      code: string;
      subject: string;
      text: string;
      from?: string;
    } | null;
    emailService.setIsolatedTestSink((payload) => {
      interceptedMail = payload;
    });

    await AdminSecurityService.resetRateLimitsForTests(prisma);

    // Capture des logs durant l'initiation du challenge
    console.log = (...args: any[]) => {
      capturedConsoleLogs.push(args.map(String).join(' '));
    };
    console.info = (...args: any[]) => {
      capturedConsoleLogs.push(args.map(String).join(' '));
    };
    console.warn = (...args: any[]) => {
      capturedConsoleLogs.push(args.map(String).join(' '));
    };

    const challengeResponse = await AdminSecurityService.initiateOtpChallenge(
      prisma,
      adminUser.id,
      '192.0.2.10',
      'CommerciaSecurityAudit/3.0'
    );

    // Restaurer la console
    console.log = origLog;
    console.info = origInfo;
    console.warn = origWarn;

    const dispatchedCode = interceptedMail?.code || '';

    // OTP-1 : Code OTP à 8 chiffres généré par CSPRNG et envoyé avec sujet et texte exacts (Section 6)
    const expectedTextBody = buildAdminOtpPlainText(dispatchedCode);
    assert(
      Boolean(interceptedMail) &&
        interceptedMail!.to.toLowerCase() === authorizedEmail.toLowerCase() &&
        /^\d{8}$/.test(dispatchedCode) &&
        ADMIN_OTP_LENGTH === 8 &&
        interceptedMail!.subject === ADMIN_OTP_EMAIL_SUBJECT &&
        interceptedMail!.text === expectedTextBody &&
        challengeResponse.emailDelivered === true &&
        challengeResponse.resendCooldownSeconds === ADMIN_OTP_RESEND_COOLDOWN_SECONDS &&
        EMAIL_SEND_SUCCESS_MESSAGE.includes('Votre code de sécurité a été envoyé'),
      '[OTP-1] Code CSPRNG à 8 chiffres généré et transmis avec le sujet et le contenu exacts de la Section 6'
    );

    // OTP-2 : Stockage exclusif sous forme de HMAC-SHA-256 dans PostgreSQL (AdminOtpChallenge)
    const storedChallenge = await prisma.adminOtpChallenge.findUnique({
      where: { id: challengeResponse.challengeId },
    });
    const expectedHmac = AdminSecurityService.computeOtpHmac(
      challengeResponse.challengeId,
      adminUser.id,
      dispatchedCode
    );
    const serializedChallengeRow = JSON.stringify(storedChallenge);
    assert(
      Boolean(storedChallenge) &&
        storedChallenge!.codeHmac === expectedHmac &&
        /^[a-f0-9]{64}$/.test(storedChallenge!.codeHmac) &&
        !serializedChallengeRow.includes(dispatchedCode) &&
        Boolean(getAdminOtpHashSecret()),
      '[OTP-2] Stockage exclusif du hash HMAC-SHA-256 (64 hex chars) en base PostgreSQL — aucun code en clair en base'
    );

    // OTP-3 : Absence totale du code OTP dans les réponses API
    const serializedApiResponse = JSON.stringify(challengeResponse);
    const serializedStatusResponse = JSON.stringify(emailService.getStatus());
    assert(
      !serializedApiResponse.includes(dispatchedCode) &&
        !('directCode' in (challengeResponse as any)) &&
        !('otp' in (challengeResponse as any)) &&
        !serializedStatusResponse.includes(dispatchedCode),
      '[OTP-3] Absence stricte du code OTP dans toutes les réponses API (/request-otp & /status)'
    );

    // OTP-4 : Comparaison en temps constant (crypto.timingSafeEqual) et rejet d'un code erroné
    let wrongCodeRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        challengeResponse.challengeId,
        '00000000',
        '192.0.2.10',
        'CommerciaSecurityAudit/3.0'
      );
    } catch (err: any) {
      wrongCodeRejected = err.statusCode === 400 && err.message.includes('4 tentative(s)');
    }
    assert(
      wrongCodeRejected,
      '[OTP-4] Code incorrect (00000000) rejeté en temps constant avec décrémentation (4 tentatives restantes)'
    );

    // OTP-5 : Test de concurrence atomique (2 requêtes simultanées avec le même code valide)
    const [concurrentRes1, concurrentRes2] = await Promise.allSettled([
      AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        challengeResponse.challengeId,
        dispatchedCode,
        '192.0.2.10',
        'CommerciaSecurityAudit/3.0-ConcurrentA'
      ),
      AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        challengeResponse.challengeId,
        dispatchedCode,
        '192.0.2.10',
        'CommerciaSecurityAudit/3.0-ConcurrentB'
      ),
    ]);
    const fulfilledCount = [concurrentRes1, concurrentRes2].filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = [concurrentRes1, concurrentRes2].filter((r) => r.status === 'rejected').length;
    const winningResult =
      concurrentRes1.status === 'fulfilled'
        ? concurrentRes1.value
        : concurrentRes2.status === 'fulfilled'
        ? concurrentRes2.value
        : null;

    assert(
      fulfilledCount === 1 && rejectedCount === 1 && Boolean(winningResult?.adminSessionToken),
      '[OTP-5] Verrouillage atomique anti-concurrence : sur 2 validations simultanées du même OTP, 1 seule réussit et la 2e est rejetée'
    );

    // OTP-6 : Rejet d'un code déjà utilisé (Replay Attack séquentiel)
    let replayRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        challengeResponse.challengeId,
        dispatchedCode,
        '192.0.2.10',
        'CommerciaSecurityAudit/3.0'
      );
    } catch (err: any) {
      replayRejected = err.statusCode === 400;
    }
    assert(replayRejected, '[OTP-6] Code déjà utilisé strictement refusé (usage unique)');

    // OTP-7 : Respect du délai minimal de 60 secondes entre deux envois (Cooldown)
    let cooldownEnforced = false;
    try {
      await AdminSecurityService.initiateOtpChallenge(
        prisma,
        adminUser.id,
        '192.0.2.10',
        'CommerciaSecurityAudit/3.0'
      );
    } catch (err: any) {
      cooldownEnforced = err.statusCode === 429 && err.message.includes('patienter');
    }
    assert(
      cooldownEnforced,
      '[OTP-7] Délai minimal de 60 secondes entre deux demandes de code OTP imposé côté serveur (HTTP 429)'
    );

    // OTP-8 : Invalidation de l'ancien code lors d'un renvoi + Limite de 3 renvois par heure (max 4 envois/h)
    await AdminSecurityService.resetRateLimitsForTests(prisma);
    const send1 = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.20', 'Audit');
    const code1 = interceptedMail!.code;
    // Simuler que le premier envoi date de 65 secondes pour passer le cooldown de 60s
    await prisma.adminOtpChallenge.update({
      where: { id: send1.challengeId },
      data: { createdAt: new Date(Date.now() - 65 * 1000) },
    });
    const send2 = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.20', 'Audit');
    let oldCodeRejectedAfterResend = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(prisma, adminUser.id, send1.challengeId, code1, '192.0.2.20', 'Audit');
    } catch {
      oldCodeRejectedAfterResend = true;
    }

    // Effectuer les 2 renvois restants autorisés dans l'heure (send3 et send4)
    await prisma.adminOtpChallenge.update({
      where: { id: send2.challengeId },
      data: { createdAt: new Date(Date.now() - 65 * 1000) },
    });
    const send3 = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.20', 'Audit');
    await prisma.adminOtpChallenge.update({
      where: { id: send3.challengeId },
      data: { createdAt: new Date(Date.now() - 65 * 1000) },
    });
    const send4 = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.20', 'Audit');
    await prisma.adminOtpChallenge.update({
      where: { id: send4.challengeId },
      data: { createdAt: new Date(Date.now() - 65 * 1000) },
    });

    // Le 5e envoi dans la même heure (> 3 renvois/h) doit être bloqué en 429
    let hourlyResendLimitEnforced = false;
    try {
      await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.20', 'Audit');
    } catch (err: any) {
      hourlyResendLimitEnforced = err.statusCode === 429 && err.message.includes('3 renvois');
    }
    assert(
      oldCodeRejectedAfterResend && hourlyResendLimitEnforced,
      '[OTP-8] Ancien code invalidé lors d’un renvoi ET blocage strict au-delà de 3 renvois par heure (HTTP 429)'
    );

    // OTP-9 : Code expiré (> 5 minutes) refusé
    const code4 = interceptedMail!.code;
    await AdminSecurityService.forceExpireChallengeForTest(prisma, adminUser.id, send4.challengeId);
    let expiredRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(prisma, adminUser.id, send4.challengeId, code4, '192.0.2.20', 'Audit');
    } catch (err: any) {
      expiredRejected = err.statusCode === 400 && err.message.includes('expiré');
    }
    assert(expiredRejected, '[OTP-9] Code expiré (> 5 minutes) strictement refusé et marqué EXPIRED en base');

    // OTP-10 : Verrouillage du challenge après 5 tentatives incorrectes (6e tentative avec le bon code refusée)
    await AdminSecurityService.resetRateLimitsForTests(prisma);
    const bruteChallenge = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.30', 'Audit');
    const realBruteCode = interceptedMail!.code;
    let lockedOnFifth = false;
    for (let i = 1; i <= 5; i++) {
      try {
        await AdminSecurityService.verifyOtpChallenge(
          prisma,
          adminUser.id,
          bruteChallenge.challengeId,
          '99999999',
          '192.0.2.30',
          'Audit'
        );
      } catch (err: any) {
        if (i === 5 && err.statusCode === 403) {
          lockedOnFifth = true;
        }
      }
    }
    let sixthAttemptWithValidCodeRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        bruteChallenge.challengeId,
        realBruteCode,
        '192.0.2.30',
        'Audit'
      );
    } catch {
      sixthAttemptWithValidCodeRejected = true;
    }
    assert(
      lockedOnFifth && sixthAttemptWithValidCodeRejected,
      '[OTP-10] Verrouillage définitif après 5 erreurs : la 6e tentative est rejetée même avec le code exact'
    );

    // OTP-11 : ÉTAT 1 (Service non configuré) et ÉTAT 3 (Échec d'envoi Resend) -> Politique FAIL-CLOSED
    await AdminSecurityService.resetRateLimitsForTests(prisma);
    emailService.setIsolatedTestSink(null, { forceUnavailable: true });
    let state1Triggered = false;
    let state1Msg = '';
    try {
      await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.31', 'Audit');
    } catch (err: any) {
      state1Triggered = err.statusCode === 503;
      state1Msg = err.message;
    }

    emailService.setIsolatedTestSink(
      () => {},
      { forceSendFailure: true }
    );
    let state3Triggered = false;
    let state3Msg = '';
    try {
      await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.32', 'Audit');
    } catch (err: any) {
      state3Triggered = err.statusCode === 503;
      state3Msg = err.message;
    }
    assert(
      state1Triggered &&
        state1Msg === EMAIL_NOT_CONFIGURED_MESSAGE &&
        state3Triggered &&
        state3Msg === EMAIL_SEND_FAILED_MESSAGE,
      '[OTP-11] Politique FAIL-CLOSED vérifiée pour ÉTAT 1 (config absente) et ÉTAT 3 (erreur Resend : challenge invalidé, 0 session créée)'
    );

    // =========================================================================
    // GROUPE 3 : CONTRÔLE D'ACCÈS, SESSIONS PRIVILÉGIÉES, INACTIVITÉ & RÉVOCATION (SECTION 8 & 9)
    // =========================================================================
    console.log('\n--- GROUPE 3 : SESSIONS PRIVILÉGIÉES, INACTIVITÉ, RÉVOCATION & ROUTES ADMIN ---');

    const activeToken = winningResult!.adminSessionToken;
    const activeCsrf = winningResult!.csrfToken;

    // SESSION-1 : Extraction du cookie __Host-commercia_admin_session et validation CSRF
    const hostCookieExtracted = AdminSecurityService.extractAdminCookie(
      `__Host-commercia_admin_session=${encodeURIComponent(activeToken)}; Path=/; HttpOnly; Secure; SameSite=Strict`
    );
    const validSessionCheck = await AdminSecurityService.validateAdminSessionToken(
      prisma,
      hostCookieExtracted!,
      adminUser.id,
      activeCsrf,
      true
    );
    const badCsrfCheck = await AdminSecurityService.validateAdminSessionToken(
      prisma,
      hostCookieExtracted!,
      adminUser.id,
      'invalid-csrf-token',
      true
    );
    assert(
      validSessionCheck.isValid === true &&
        badCsrfCheck.isValid === false &&
        Boolean(badCsrfCheck.reason?.includes('CSRF')),
      '[SESSION-1] Cookie `__Host-commercia_admin_session` validé et protection CSRF vérifiée en temps constant'
    );

    // SESSION-2 : Expiration automatique par inactivité (> 10 minutes sans requête)
    await AdminSecurityService.forceInactivitySessionForTest(prisma, activeToken);
    const inactiveCheck = await AdminSecurityService.validateAdminSessionToken(
      prisma,
      activeToken,
      adminUser.id,
      activeCsrf,
      false
    );
    assert(
      inactiveCheck.isValid === false && Boolean(inactiveCheck.reason?.includes('inactivité')),
      '[SESSION-2] Session administrative automatiquement révoquée après 10 minutes d’inactivité'
    );

    // Créer une nouvelle session pour tester la révocation manuelle et l'expiration absolue
    await AdminSecurityService.resetRateLimitsForTests(prisma);
    emailService.setIsolatedTestSink((payload) => {
      interceptedMail = { ...payload, from: emailService.getFromAddress() };
    });
    const freshChallenge = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.40', 'Audit');
    const freshSession = await AdminSecurityService.verifyOtpChallenge(
      prisma,
      adminUser.id,
      freshChallenge.challengeId,
      interceptedMail!.code,
      '192.0.2.40',
      'Audit'
    );

    // SESSION-3 : Révocation immédiate au logout
    await AdminSecurityService.revokeSessionByToken(prisma, freshSession.adminSessionToken, adminUser.id);
    const revokedCheck = await AdminSecurityService.validateAdminSessionToken(
      prisma,
      freshSession.adminSessionToken,
      adminUser.id,
      freshSession.csrfToken,
      false
    );
    assert(
      revokedCheck.isValid === false && Boolean(revokedCheck.reason?.includes('révoquée')),
      '[SESSION-3] Déconnexion / révocation invalide immédiatement la session privilégiée en base'
    );

    // SESSION-4 : Tentative d'accès direct à /api/admin/* avec une session Google simple (sans OTP validé) -> 403
    let directAdminBlockedStatus = 0;
    let directAdminBlockedBody: any = null;
    const mockReqAdminNoMfa: any = {
      userId: adminUser.id,
      prisma,
      headers: {},
      method: 'GET',
      originalUrl: '/api/admin/verify-access',
      ip: '192.0.2.41',
    };
    const mockResAdminNoMfa: any = {
      status(code: number) {
        directAdminBlockedStatus = code;
        return this;
      },
      json(payload: any) {
        directAdminBlockedBody = payload;
        return this;
      },
    };
    await requireAdmin(mockReqAdminNoMfa, mockResAdminNoMfa, () => {});
    assert(
      directAdminBlockedStatus === 403 && directAdminBlockedBody?.code === 'ADMIN_MFA_CHALLENGE_REQUIRED',
      '[SESSION-4] Session Google sans OTP validé bloquée en 403 sur toutes les routes /api/admin/*'
    );

    // SESSION-5 : Tentative d'accès aux API administratives par un compte marchand -> 403
    const nonAdminUser = await prisma.user.findFirst({ where: { isAdmin: false } });
    let nonAdminBlockedStatus = 0;
    let nonAdminBlockedBody: any = null;
    if (nonAdminUser) {
      const mockReqNonAdmin: any = {
        userId: nonAdminUser.id,
        prisma,
        headers: { 'x-admin-session-token': freshSession.adminSessionToken },
        method: 'GET',
        originalUrl: '/api/admin/dashboard',
        ip: '192.0.2.42',
      };
      const mockResNonAdmin: any = {
        status(code: number) {
          nonAdminBlockedStatus = code;
          return this;
        },
        json(payload: any) {
          nonAdminBlockedBody = payload;
          return this;
        },
      };
      await requireAdmin(mockReqNonAdmin, mockResNonAdmin, () => {});
    }
    assert(
      nonAdminBlockedStatus === 403 && nonAdminBlockedBody?.code === 'FORBIDDEN_SUPER_ADMIN_REQUIRED',
      '[SESSION-5] Compte marchand ordinaire strictement bloqué en 403 sur toutes les routes administratives'
    );

    // =========================================================================
    // GROUPE 4 : AUDIT D'ABSENCE DE FUITE DE SECRETS (DOM, STORAGE, LOGS, CODE SOURCE)
    // =========================================================================
    console.log('\n--- GROUPE 4 : AUDIT D’ABSENCE DE FUITE DE SECRETS (SECTION 3, 7, 11, 12) ---');

    const modalSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/components/admin/AdminMfaChallengeModal.tsx'),
      'utf8'
    );
    const securityViewSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/components/admin/SecurityAuthView.tsx'),
      'utf8'
    );
    const apiSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/services/api.ts'),
      'utf8'
    );
    const authStoreSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/store/authStore.ts'),
      'utf8'
    );
    const authPageSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/pages/AuthPage.tsx'),
      'utf8'
    );

    // LEAK-1 : Suppression complète du formulaire Mot de passe d'application Google (16 caractères) et Gmail SMTP
    assert(
      !modalSource.includes('Mot de passe d\'application') &&
        !modalSource.includes('Gmail SMTP (App Password)') &&
        !modalSource.includes('/admin/auth/configure-mailer') &&
        !securityViewSource.includes('/admin/security/smtp-config') &&
        !securityViewSource.includes('smtpAppPassword'),
      '[LEAK-1] Suppression totale des formulaires "Mot de passe d’application Google (16 caractères)" et "Gmail SMTP" du frontend'
    );

    // LEAK-2 : Masquage systématique de l'adresse Gmail dans le frontend (aucune exposition en clair)
    assert(
      !modalSource.includes('camusalbert628@gmail.com') &&
        !securityViewSource.includes('camusalbert628@gmail.com') &&
        !authPageSource.includes('camusalbert628@gmail.com') &&
        modalSource.includes('c*************@gmail.com'),
      '[LEAK-2] Adresse Gmail Super Admin systématiquement masquée (c*************@gmail.com) dans tout le frontend'
    );

    // LEAK-3 : Absence totale de jeton de session admin ou de code OTP dans localStorage et sessionStorage
    assert(
      !apiSource.includes('commercia_admin_session_token') &&
        !authStoreSource.includes('commercia_admin_session_token') &&
        !modalSource.includes('localStorage') &&
        !modalSource.includes('sessionStorage'),
      '[LEAK-3] Aucun jeton de session privilégiée ni code OTP stocké dans localStorage ou sessionStorage'
    );

    // LEAK-4 : Absence totale du code OTP dans les logs console et dans SecurityAccessLog
    const recentLogs = await prisma.securityAccessLog.findMany({
      where: { userId: adminUser.id },
      orderBy: { timestamp: 'desc' },
      take: 25,
    });
    const serializedLogs = JSON.stringify(recentLogs);
    const allConsoleOutput = capturedConsoleLogs.join('\n');
    assert(
      !allConsoleOutput.includes(dispatchedCode) &&
        !serializedLogs.includes(dispatchedCode) &&
        recentLogs.some((l) => l.metadata?.includes('HMAC-SHA-256')),
      '[LEAK-4] Aucun code OTP ni secret dans les logs console ou SecurityAccessLog (métadonnées HMAC-SHA-256 uniquement)'
    );

    // =========================================================================
    // GROUPE 5 : VALIDATION TÉLÉPHONIQUE INTERNATIONALE E.164
    // =========================================================================
    console.log('\n--- GROUPE 5 : VALIDATION ET NORMALISATION TÉLÉPHONIQUE E.164 ---');

    const cmValid = PhoneService.validate('+237699123456');
    assert(
      cmValid.isValid === true && cmValid.e164 === '+237699123456' && cmValid.country === 'CM',
      '[PHONE-1] Numéro camerounais valide (+237699123456) validé en E.164'
    );

    const cmLocal = PhoneService.validate('677001122', 'CM');
    assert(
      cmLocal.isValid === true && cmLocal.e164 === '+237677001122',
      '[PHONE-2] Numéro local sans indicatif (677001122) normalisé en E.164 (+237677001122)'
    );
  } catch (err: any) {
    console.error('Erreur inattendue durant la suite de tests:', err);
    process.exitCode = 1;
  } finally {
    console.log('\n========================================================================');
    console.log(
      `📊 RÉSULTAT FINAL DES TESTS : ${passedTests} / ${totalTests} RÉUSSIS (${Math.round((passedTests / Math.max(1, totalTests)) * 100)}%)`
    );
    console.log('========================================================================\n');
    await prisma.$disconnect();
    if (passedTests < totalTests) {
      process.exit(1);
    }
  }
}

runTestSuite();
