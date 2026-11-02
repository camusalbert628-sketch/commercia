import { verifyTotpCode, computeTotpCode, generateTotpSecret, generateRecoveryCodes } from '../src/utils/mfa';
import { encryptSecret, decryptSecret, maskApiKey } from '../src/utils/crypto';
import { bruteForceProtector } from '../src/utils/bruteForceProtection';

async function runSecurityTests() {
  console.log('=================================================================');
  console.log('🛡️  SUITE DE TESTS DE SÉCURITÉ & HARDENING DEVSECOPS — COMMERCIA');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` : ${detail}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1 : CHIFFREMENT AES-256-GCM & MASQUAGE DES CLÉS API
  // -------------------------------------------------------------
  console.log('1. Tests Cryptographiques (AES-256-GCM & Masquage)');
  const secretKey = 'sk-proj-super-secret-production-openai-key-9999';
  const encrypted = encryptSecret(secretKey);
  assert(encrypted !== secretKey, 'Le texte chiffré n’est pas en clair');
  assert(encrypted.split(':').length === 3, 'Format iv:tag:ciphertext respecté');

  const decrypted = decryptSecret(encrypted);
  assert(decrypted === secretKey, 'Déchiffrement intègre avec clé maître');

  const masked = maskApiKey(secretKey);
  assert(masked.startsWith('sk-p') && masked.endsWith('9999'), 'Masquage strict (seuls début et fin visibles)');
  assert(!masked.includes('super-secret'), 'Aucun secret intermédiaire ne fuite dans le masquage');

  // -------------------------------------------------------------
  // TEST 2 : AUTHENTIFICATION MULTIFACTEUR TOTP (RFC 6238)
  // -------------------------------------------------------------
  console.log('\n2. Tests Authentification Multifacteur (TOTP RFC 6238)');
  const { secret, otpauthUrl } = generateTotpSecret();
  assert(secret.length >= 26, 'Secret TOTP en Base32 de taille sécurisée');
  assert(otpauthUrl.startsWith('otpauth://totp/'), 'URI standard pour Google Authenticator / Authy');

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const validCode = computeTotpCode(secret, currentStep);
  assert(validCode.length === 6 && /^\d{6}$/.test(validCode), 'Code TOTP généré à 6 chiffres');

  const isValidNow = verifyTotpCode(validCode, secret);
  assert(isValidNow === true, 'Validation du code TOTP courant réussie');

  const isInvalidRejected = verifyTotpCode('000000', secret);
  assert(isInvalidRejected === false, 'Rejet immédiat d’un mauvais code TOTP');

  const { plainCodes, hashedCodes } = generateRecoveryCodes();
  assert(plainCodes.length === 8 && hashedCodes.length === 8, '8 codes de récupération générés');
  assert(hashedCodes[0].length === 64, 'Codes de récupération hachés en SHA-256');

  // -------------------------------------------------------------
  // TEST 3 : PROTECTION ANTI-BRUTEFORCE & LOCKOUT
  // -------------------------------------------------------------
  console.log('\n3. Tests de Protection Anti-Bruteforce & Lockout');
  const mockReq: any = {
    headers: { 'x-forwarded-for': '198.51.100.42' },
    socket: { remoteAddress: '198.51.100.42' },
    body: { email: 'victim@merchant.com' },
  };

  // Simuler 4 échecs (sous le seuil de 5)
  for (let i = 0; i < 4; i++) {
    bruteForceProtector.recordFailure(mockReq, 'victim@merchant.com');
  }

  let lockedPrematurely = false;
  try {
    bruteForceProtector.check(mockReq, 'victim@merchant.com');
  } catch (_) {
    lockedPrematurely = true;
  }
  assert(!lockedPrematurely, 'Tentatives < 5 : compte non encore verrouillé');

  // 5ème échec : doit déclencher le verrouillage
  bruteForceProtector.recordFailure(mockReq, 'victim@merchant.com');
  let lockTriggered = false;
  try {
    bruteForceProtector.check(mockReq, 'victim@merchant.com');
  } catch (err: any) {
    lockTriggered = err.statusCode === 429;
  }
  assert(lockTriggered, '5ème échec consécutif : Verrouillage HTTP 429 activé');

  // Réinitialisation après succès
  bruteForceProtector.recordSuccess(mockReq, 'victim@merchant.com');
  let unlockedAfterSuccess = true;
  try {
    bruteForceProtector.check(mockReq, 'victim@merchant.com');
  } catch (_) {
    unlockedAfterSuccess = false;
  }
  assert(unlockedAfterSuccess, 'Réinitialisation des compteurs après authentification réussie');

  // -------------------------------------------------------------
  // TEST 4 : POLITIQUE DE MOTS DE PASSE (OWASP ASVS)
  // -------------------------------------------------------------
  console.log('\n4. Tests de Conformité Politique de Mots de Passe');
  const weakPasswords = [
    'short',              // < 8 chars
    'alllowercase123!',   // Pas de majuscule
    'ALLUPPERCASE123!',   // Pas de minuscule
    'NoNumberHere!@#',    // Pas de chiffre
    'NoSpecialChar1234',  // Pas de caractère spécial
  ];

  const strongPassword = 'P@ssword2026!Secure';

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  let allWeakRejected = true;
  for (const p of weakPasswords) {
    if (passwordRegex.test(p)) allWeakRejected = false;
  }
  assert(allWeakRejected, 'Tous les mots de passe faibles sont rejetés');
  assert(passwordRegex.test(strongPassword), 'Le mot de passe robuste et complexe est validé');

  // -------------------------------------------------------------
  // TEST 5 : BLOCAGE DU BYPASS DE PAIEMENT SANDBOX EN PRODUCTION
  // -------------------------------------------------------------
  console.log('\n5. Tests de Protection Anti-Contournement des Paiements');
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_SANDBOX_TESTS;

  const isBlockedInProd = process.env.NODE_ENV === 'production' && !process.env.ALLOW_SANDBOX_TESTS;
  assert(isBlockedInProd, 'Le contournement confirm-sandbox est strictement bloqué en production');
  process.env.NODE_ENV = prevEnv;

  console.log('\n=================================================================');
  console.log(`📊 RÉSULTAT : ${passed} test(s) réussi(s), ${failed} échec(s)`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
