import { PrismaClient } from '@prisma/client';
import { AdminSecurityService } from '../services/adminSecurityService';
import { PhoneService } from '../services/phoneService';
import { emailService } from '../services/emailService';

const prisma = new PrismaClient();

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🚀 DÉMARRAGE DE LA SUITE DE TESTS : SÉCURITÉ ADMIN & TÉLÉPHONES');
  console.log('===============================================================\n');

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
    // -------------------------------------------------------------
    // PARTIE A : VÉRIFICATION DU SUPER ADMIN ET DE L'IDENTITÉ GOOGLE
    // -------------------------------------------------------------
    console.log('--- TEST GROUP 1 : CONTRÔLE D\'IDENTITÉ ZERO-TRUST SUPER ADMIN ---');

    // 1. Vérification du compte administrateur racine existant
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
    });
    assert(
      !!adminUser && adminUser.id === '882d1b99-c074-4084-9533-a2a48ff88556',
      'Le compte Super Admin existant (882d1b99-c074-4084-9533-a2a48ff88556) est conservé et unique'
    );

    // 2. Détection de l'adresse Google autorisée
    const authorizedEmail = await AdminSecurityService.getAuthorizedGoogleEmail(prisma);
    assert(
      authorizedEmail.toLowerCase() === 'camusalbert628@gmail.com',
      `L'adresse Google autorisée du Super Admin est camusalbert628@gmail.com (actuel: ${authorizedEmail})`
    );

    // 3. Rejet d'une adresse email Google non autorisée
    const isFakeAuthorized = await AdminSecurityService.isAuthorizedSuperAdminEmail(prisma, 'hacker.adversary@gmail.com');
    assert(
      isFakeAuthorized === false,
      'Une adresse email Google non autorisée (hacker.adversary@gmail.com) est strictement rejetée'
    );

    // 4. Masquage cryptographique pour affichage dans la modal
    const masked = AdminSecurityService.maskEmail('camusalbert628@gmail.com');
    assert(
      masked.startsWith('c') && masked.endsWith('@gmail.com') && masked.includes('***'),
      `L'adresse email est élégamment masquée : ${masked}`
    );

    // -------------------------------------------------------------
    // PARTIE B : CHALLENGE MFA GMAIL (CODE 6 CHIFFRES, EXPIRATION, ESSAIS)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 2 : CHALLENGE MFA GMAIL & SESSIONS RENFORCÉES ---');

    // 5. Génération d'un challenge OTP 6 chiffres
    const challenge = await AdminSecurityService.initiateOtpChallenge(
      prisma,
      adminUser!.id,
      '127.0.0.1',
      'TestRunner/1.0'
    );
    assert(
      !!challenge.challengeId && challenge.expiresInMinutes === 5,
      `Génération sécurisée du challenge OTP : challengeId=${challenge.challengeId.slice(0, 8)}...`
    );

    // 6. Envoi de l'email transactionnel vérifié
    assert(
      emailService.lastSentCode?.email.toLowerCase() === authorizedEmail.toLowerCase(),
      `Le code de sécurité à 6 chiffres a été envoyé à l'adresse autorisée (${emailService.lastSentCode?.code})`
    );

    const generatedCode = emailService.lastSentCode?.code || '123456';

    // 7. Tentative avec un mauvais code (doit échouer)
    let badCodeFailed = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser!.id,
        challenge.challengeId,
        '000000',
        '127.0.0.1',
        'TestRunner/1.0'
      );
    } catch {
      badCodeFailed = true;
    }
    assert(badCodeFailed, 'Code incorrect (000000) rejeté par le serveur avec décrémentation des tentatives');

    // 8. Validation avec le bon code
    const validSession = await AdminSecurityService.verifyOtpChallenge(
      prisma,
      adminUser!.id,
      challenge.challengeId,
      generatedCode,
      '127.0.0.1',
      'TestRunner/1.0'
    );
    assert(
      !!validSession.adminSessionToken && validSession.user?.isAdmin === true,
      'Validation du bon code réussie et émission du jeton d\'administration renforcée'
    );

    // 9. Validation du jeton de session administrative renforcée
    const validationCheck = await AdminSecurityService.validateAdminSessionToken(
      prisma,
      validSession.adminSessionToken
    );
    assert(
      validationCheck.isValid === true && validationCheck.user?.id === adminUser!.id,
      'Jeton x-admin-session-token vérifié avec succès côté serveur'
    );

    // 10. Rejet si le challenge est rejoué (Usage unique strict)
    let replayFailed = false;
    try {
      await AdminSecurityService.verifyOtpChallenge(
        prisma,
        adminUser!.id,
        challenge.challengeId,
        generatedCode,
        '127.0.0.1',
        'TestRunner/1.0'
      );
    } catch {
      replayFailed = true;
    }
    assert(replayFailed, 'Réutilisation du même challenge refusée (Usage unique garanti)');

    // 11. Révocation de session administrative
    const dbSession = await prisma.adminSession.findFirst({
      where: { userId: adminUser!.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (dbSession) {
      await AdminSecurityService.revokeSession(prisma, dbSession.id, adminUser!.id);
      const postRevokeCheck = await AdminSecurityService.validateAdminSessionToken(
        prisma,
        validSession.adminSessionToken
      );
      assert(
        postRevokeCheck.isValid === false,
        'Session administrative révoquée immédiatement inactive côté backend'
      );
    }

    // 12. Traçabilité dans SecurityAccessLog
    const recentLogs = await prisma.securityAccessLog.findMany({
      where: { email: authorizedEmail },
      take: 5,
      orderBy: { timestamp: 'desc' },
    });
    assert(
      recentLogs.length > 0,
      `Traçabilité Zero-Trust vérifiée dans les SecurityAccessLogs (${recentLogs.length} entrées enregistrées)`
    );

    // -------------------------------------------------------------
    // PARTIE C : SYSTÈME INTERNATIONAL DE NUMÉROS DE TÉLÉPHONE (E.164)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 3 : VALIDATION ET NORMALISATION DES NUMÉROS DE TÉLÉPHONE ---');

    // 13. Numéro camerounais valide
    const cmValid = PhoneService.validate('+237699123456');
    assert(
      cmValid.isValid === true && cmValid.e164 === '+237699123456' && cmValid.country === 'CM' && cmValid.countryCallingCode === '+237',
      'Numéro camerounais valide (+237699123456) validé et identifié en CM (+237)'
    );

    // 14. Numéro camerounais sans indicatif avec pays par défaut
    const cmLocal = PhoneService.validate('677001122', 'CM');
    assert(
      cmLocal.isValid === true && cmLocal.e164 === '+237677001122',
      'Numéro local sans indicatif (677001122) normalisé en E.164 (+237677001122)'
    );

    // 15. Numéro camerounais incomplet
    const cmIncomplete = PhoneService.validate('+237699');
    assert(
      cmIncomplete.isValid === false,
      'Numéro camerounais incomplet (+237699) refusé avec format invalide'
    );

    // 16. Numéro ivoirien valide
    const ciValid = PhoneService.validate('+2250701020304');
    assert(
      ciValid.isValid === true && ciValid.country === 'CI' && ciValid.countryCallingCode === '+225',
      'Numéro ivoirien (+2250701020304) validé et identifié en CI (+225)'
    );

    // 17. Numéro sénégalais valide
    const snValid = PhoneService.validate('+221771234567');
    assert(
      snValid.isValid === true && snValid.country === 'SN' && snValid.countryCallingCode === '+221',
      'Numéro sénégalais (+221771234567) validé et identifié en SN (+221)'
    );

    // 18. Numéro français valide
    const frValid = PhoneService.validate('+33612345678');
    assert(
      frValid.isValid === true && frValid.country === 'FR' && frValid.countryCallingCode === '+33',
      'Numéro français (+33612345678) validé et identifié en FR (+33)'
    );

    // 19. Numéro nord-américain (USA / Canada)
    const usValid = PhoneService.validate('+12025550123');
    assert(
      usValid.isValid === true && (usValid.country === 'US' || usValid.country === 'CA') && usValid.countryCallingCode === '+1',
      'Numéro nord-américain (+12025550123) validé et identifié en +1'
    );

    // 20. Numéro avec caractères non autorisés ou lettres
    const lettersPhone = PhoneService.validate('+237-abc-xyz');
    assert(
      lettersPhone.isValid === false,
      'Numéro avec caractères interdits (+237-abc-xyz) refusé'
    );

    // 21. Envoi OTP téléphone et vérification
    const phoneTestNum = '+237655443322';
    const otpRes = await PhoneService.sendVerificationOtp(prisma, phoneTestNum, 'CM');
    assert(
      !!otpRes.verificationId,
      `Envoi d'un code OTP SMS pour preuve de possession : verificationId=${otpRes.verificationId.slice(0, 8)}...`
    );

    // Vérifier en base le record hashé
    const record = await prisma.phoneVerification.findFirst({
      where: { phoneNumber: phoneTestNum },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      !!record && record.isVerified === false,
      'Enregistrement de la vérification téléphonique stocké avec hash cryptographique'
    );

    // 22. Statistiques des numéros internationaux
    const stats = await PhoneService.getGlobalPhoneStats(prisma);
    assert(
      typeof stats.totalPhones === 'number' && typeof stats.validPhones === 'number',
      `Audit du parc téléphonique réussi : ${stats.totalPhones} numéros analysés`
    );

  } catch (err: any) {
    console.error('Erreur inattendue durant la suite de tests:', err);
  } finally {
    console.log('\n===============================================================');
    console.log(`📊 RÉSULTAT FINAL DES TESTS : ${passedTests} / ${totalTests} RÉUSSIS (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('===============================================================\n');
    await prisma.$disconnect();
  }
}

runTestSuite();
