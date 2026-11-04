import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { AdminSecurityService, ADMIN_OTP_LENGTH } from '../services/adminSecurityService';
import { PhoneService } from '../services/phoneService';
import { emailService, FAIL_CLOSED_EMAIL_ERROR_MESSAGE } from '../services/emailService';
import { requireAdmin } from '../middleware/auth';

process.env.NODE_ENV = 'test';
const prisma = new PrismaClient();

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🛡️ SUITE D’AUDIT CRITIQUE : SÉCURITÉ OTP SUPER ADMIN (14 TESTS) & E.164');
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

    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (!adminUser) {
      throw new Error('Compte Super Admin introuvable en base.');
    }

    const authorizedEmail = await AdminSecurityService.getAuthorizedGoogleEmail(prisma);

    // Interception des logs console pour prouver l'absence totale du code OTP dans les logs (Test 6)
    const capturedConsoleLogs: string[] = [];
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;

    let interceptedMail = null as { to: string; code: string; subject: string } | null;
    emailService.setIsolatedTestSink((payload) => {
      interceptedMail = payload;
    });

    AdminSecurityService.resetRateLimitsForTests();

    console.log('--- GROUPE 1 : LES 14 TESTS DE SÉCURITÉ OBLIGATOIRES (SECTION 8) ---');

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
      'CommerciaSecurityAudit/2.0'
    );

    // Restaurer la console
    console.log = origLog;
    console.info = origInfo;
    console.warn = origWarn;

    const dispatchedCode = interceptedMail?.code || '';

    // TEST 1 : Envoi d'un code OTP de 8 chiffres vers l'adresse Gmail autorisée
    assert(
      Boolean(interceptedMail) &&
      interceptedMail!.to.toLowerCase() === authorizedEmail.toLowerCase() &&
      /^\d{8}$/.test(dispatchedCode) &&
      ADMIN_OTP_LENGTH === 8,
      `[TEST 1] Envoi du code OTP cryptographique à 8 chiffres vers Gmail (${authorizedEmail})`
    );

    // TEST 2 : Absence totale de code OTP dans les réponses API
    const serializedApiResponse = JSON.stringify(challengeResponse);
    const serializedStatusResponse = JSON.stringify(emailService.getStatus());
    assert(
      !serializedApiResponse.includes(dispatchedCode) &&
      !('directCode' in (challengeResponse as any)) &&
      !serializedStatusResponse.includes(dispatchedCode),
      '[TEST 2] Absence stricte du code OTP dans toutes les réponses API (initiateOtpChallenge & getStatus)'
    );

    // TEST 3 : Absence de code et de mécanisme d'exposition dans le DOM / composants React
    const modalSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/components/admin/AdminMfaChallengeModal.tsx'),
      'utf8'
    );
    const securityViewSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/components/admin/SecurityAuthView.tsx'),
      'utf8'
    );
    assert(
      !modalSource.includes('directCode') &&
      !modalSource.includes('CANAL DIRECT') &&
      !modalSource.includes('Insérer & Valider') &&
      !modalSource.includes('handleAutoFillDirectCode') &&
      !securityViewSource.includes('Canal Direct Sécurisé'),
      '[TEST 3] Absence totale de code OTP, d’encadré Canal Direct et d’auto-insertion dans le DOM React'
    );

    // TEST 4 : Absence de code dans localStorage
    const apiSource = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/services/api.ts'),
      'utf8'
    );
    assert(
      !modalSource.includes('localStorage.setItem') &&
      !apiSource.includes('directCode'),
      '[TEST 4] Absence totale de stockage du code OTP dans localStorage'
    );

    // TEST 5 : Absence de code dans sessionStorage
    assert(
      !modalSource.includes('sessionStorage.setItem') &&
      !modalSource.includes('directCode'),
      '[TEST 5] Absence totale de stockage du code OTP dans sessionStorage'
    );

    // TEST 6 : Absence de code dans les logs serveur ET dans les enregistrements PostgreSQL
    const latestDbLog = await prisma.securityAccessLog.findFirst({
      where: { userId: adminUser.id, step: 'otp_request' },
      orderBy: { timestamp: 'desc' },
    });
    const otpNotificationsCount = await prisma.notification.count({
      where: { type: 'security_otp' },
    });
    const allConsoleOutput = capturedConsoleLogs.join('\n');
    assert(
      !allConsoleOutput.includes(dispatchedCode) &&
      Boolean(latestDbLog?.metadata) &&
      !latestDbLog!.metadata!.includes(dispatchedCode) &&
      latestDbLog!.metadata!.includes('PBKDF2-HMAC-SHA256') &&
      otpNotificationsCount === 0,
      '[TEST 6] Absence totale du code OTP dans les logs console, SecurityAccessLog (hash PBKDF2 seul) et Notifications'
    );

    // TEST 8 : Code incorrect rejeté avec décrémentation des tentatives
    let wrongCodeRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        challengeResponse.challengeId,
        '00000000',
        '192.0.2.10',
        'CommerciaSecurityAudit/2.0'
      );
    } catch (err: any) {
      wrongCodeRejected = err.statusCode === 400 && err.message.includes('4 tentative(s)');
    }
    assert(wrongCodeRejected, '[TEST 8] Code incorrect (00000000) rejeté côté serveur (4 tentatives restantes)');

    // TEST 7 : Code correct validé côté serveur + émission de session renforcée et jeton CSRF
    const verifiedSession = await AdminSecurityService.verifyOtpChallenge(
      prisma,
      adminUser.id,
      challengeResponse.challengeId,
      dispatchedCode,
      '192.0.2.10',
      'CommerciaSecurityAudit/2.0'
    );
    const cookieExtracted = AdminSecurityService.extractAdminCookie(
      `commercia_admin_session=${encodeURIComponent(verifiedSession.adminSessionToken)}; Path=/api; HttpOnly`
    );
    const sessionCheck = await AdminSecurityService.validateAdminSessionToken(
      prisma,
      cookieExtracted!,
      adminUser.id,
      verifiedSession.csrfToken,
      true
    );
    assert(
      Boolean(verifiedSession.adminSessionToken) &&
      Boolean(verifiedSession.csrfToken) &&
      sessionCheck.isValid === true,
      '[TEST 7] Code correct à 8 chiffres validé côté serveur, cookie HttpOnly & jeton CSRF vérifiés'
    );

    // TEST 10 : Code réutilisé (Replay Attack) ET invalidation d'un ancien code lors d'un renvoi
    let replayRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        challengeResponse.challengeId,
        dispatchedCode,
        '192.0.2.10',
        'CommerciaSecurityAudit/2.0'
      );
    } catch (err: any) {
      replayRejected = err.statusCode === 400;
    }

    // Tester également qu'un renvoi invalide le code précédent
    AdminSecurityService.resetRateLimitsForTests();
    const firstSend = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.11', 'Audit');
    const firstCode = interceptedMail!.code;
    const secondSend = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.11', 'Audit');
    let supersededRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(prisma, adminUser.id, firstSend.challengeId, firstCode, '192.0.2.11', 'Audit');
    } catch {
      supersededRejected = true;
    }
    assert(
      replayRejected && supersededRejected && secondSend.challengeId !== firstSend.challengeId,
      '[TEST 10] Code déjà utilisé refusé (usage unique) et ancien code invalidé lors d’un renvoi'
    );

    // TEST 9 : Code expiré (> 5 minutes) refusé
    const secondCode = interceptedMail!.code;
    await AdminSecurityService.forceExpireChallengeForTest(prisma, adminUser.id, secondSend.challengeId);
    let expiredRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        secondSend.challengeId,
        secondCode,
        '192.0.2.11',
        'Audit'
      );
    } catch (err: any) {
      expiredRejected = err.statusCode === 400 && err.message.includes('expiré');
    }
    assert(expiredRejected, '[TEST 9] Code expiré (> 5 minutes) strictement refusé et invalidé');

    // TEST 11 : Dépassement du nombre maximal de tentatives (5 échecs consécutifs)
    AdminSecurityService.resetRateLimitsForTests();
    const bruteChallenge = await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.12', 'Audit');
    const realBruteCode = interceptedMail!.code;
    let lockedOnFifth = false;
    for (let i = 1; i <= 5; i++) {
      try {
        await AdminSecurityService.verifyOtpChallenge(
          prisma,
          adminUser.id,
          bruteChallenge.challengeId,
          '99999999',
          '192.0.2.12',
          'Audit'
        );
      } catch (err: any) {
        if (i === 5 && err.statusCode === 403) {
          lockedOnFifth = true;
        }
      }
    }
    // Même avec le vrai code après les 5 échecs, le challenge doit rester définitivement invalidé
    let validCodeAfterLockRejected = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser.id,
        bruteChallenge.challengeId,
        realBruteCode,
        '192.0.2.12',
        'Audit'
      );
    } catch {
      validCodeAfterLockRejected = true;
    }
    assert(
      lockedOnFifth && validCodeAfterLockRejected,
      '[TEST 11] Verrouillage définitif du challenge après 5 tentatives incorrectes (même le vrai code est rejeté ensuite)'
    );

    // TEST 12 : Service email indisponible => Politique FAIL CLOSED stricte
    AdminSecurityService.resetRateLimitsForTests();
    emailService.setIsolatedTestSink(null, { forceUnavailable: true });
    let failClosedTriggered = false;
    let failClosedMessage = '';
    try {
      await AdminSecurityService.initiateOtpChallenge(prisma, adminUser.id, '192.0.2.13', 'Audit');
    } catch (err: any) {
      failClosedTriggered = err.statusCode === 503;
      failClosedMessage = err.message;
    }
    assert(
      failClosedTriggered && failClosedMessage === FAIL_CLOSED_EMAIL_ERROR_MESSAGE,
      `[TEST 12] Politique FAIL CLOSED vérifiée en l'absence de service email (HTTP 503 : "${failClosedMessage.slice(0, 65)}...")`
    );

    // TEST 13 : Tentative d'accès direct à /admin sans session administrative renforcée
    let directAdminBlockedStatus = 0;
    let directAdminBlockedBody: any = null;
    const mockReqAdminNoMfa: any = {
      userId: adminUser.id,
      prisma,
      headers: {},
      method: 'GET',
      originalUrl: '/api/admin/verify-access',
      ip: '192.0.2.14',
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
    await requireAdmin(mockReqAdminNoMfa, mockResAdminNoMfa, () => { });
    assert(
      directAdminBlockedStatus === 403 && directAdminBlockedBody?.code === 'ADMIN_MFA_CHALLENGE_REQUIRED',
      '[TEST 13] Tentative d’accès direct à /admin avec un JWT simple (sans MFA validé) bloquée en 403'
    );

    // TEST 14 : Tentative d'appel direct aux API administratives par un compte non-admin
    const nonAdminUser = await prisma.user.findFirst({ where: { isAdmin: false } });
    let nonAdminBlockedStatus = 0;
    let nonAdminBlockedBody: any = null;
    if (nonAdminUser) {
      const mockReqNonAdmin: any = {
        userId: nonAdminUser.id,
        prisma,
        headers: { 'x-admin-session-token': verifiedSession.adminSessionToken },
        method: 'GET',
        originalUrl: '/api/admin/dashboard',
        ip: '192.0.2.15',
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
      await requireAdmin(mockReqNonAdmin, mockResNonAdmin, () => { });
    }
    assert(
      nonAdminBlockedStatus === 403 && nonAdminBlockedBody?.code === 'FORBIDDEN_SUPER_ADMIN_REQUIRED',
      '[TEST 14] Tentative d’appel direct aux API administratives par un utilisateur non-admin rejetée en 403'
    );

    // Révoquer la session de test créée
    const dbSession = await prisma.adminSession.findFirst({
      where: { userId: adminUser.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (dbSession) {
      await AdminSecurityService.revokeSession(prisma, dbSession.id, adminUser.id);
    }

    // -------------------------------------------------------------
    // GROUPE 2 : SYSTÈME INTERNATIONAL DE NUMÉROS DE TÉLÉPHONE (E.164)
    // -------------------------------------------------------------
    console.log('\n--- GROUPE 2 : VALIDATION ET NORMALISATION TÉLÉPHONIQUE E.164 ---');

    const cmValid = PhoneService.validate('+237699123456');
    assert(
      cmValid.isValid === true && cmValid.e164 === '+237699123456' && cmValid.country === 'CM',
      'Numéro camerounais valide (+237699123456) validé en E.164'
    );

    const cmLocal = PhoneService.validate('677001122', 'CM');
    assert(
      cmLocal.isValid === true && cmLocal.e164 === '+237677001122',
      'Numéro local sans indicatif (677001122) normalisé en E.164 (+237677001122)'
    );

    const cmIncomplete = PhoneService.validate('+237699');
    assert(cmIncomplete.isValid === false, 'Numéro camerounais incomplet (+237699) refusé');

    const ciValid = PhoneService.validate('+2250701020304');
    assert(ciValid.isValid === true && ciValid.country === 'CI', 'Numéro ivoirien (+2250701020304) validé');

    const snValid = PhoneService.validate('+221771234567');
    assert(snValid.isValid === true && snValid.country === 'SN', 'Numéro sénégalais (+221771234567) validé');

    const frValid = PhoneService.validate('+33612345678');
    assert(frValid.isValid === true && frValid.country === 'FR', 'Numéro français (+33612345678) validé');
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
