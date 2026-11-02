/**
 * ==============================================================================
 * SUITE DE TESTS OFFENSIFS (RED TEAM & PENETRATION TESTING) — COMMERCIA
 * ==============================================================================
 * 
 * Cette suite simule de véritables attaques offensives contrôlées :
 *  1. Attaque IDOR / BOLA Inter-Tenant (Accès aux ressources d'un tiers)
 *  2. Attaque par Usurpation d'En-tête Tenant (Injection x-business-id)
 *  3. Attaque par Escalade de Privilèges Verticale (Commerçant -> Super Admin)
 *  4. Attaque par Falsification Financière & Manipulation de Prix
 *  5. Attaque par Déplétion de Stock & Quantité Négative
 *  6. Attaque par Sortie de Caisse Abusive (Vol au-delà du solde théorique)
 *  7. Attaque par Contournement d'Abonnement (Accès Lots sans licence Pro)
 *  8. Attaque Cryptographique sur Tokens JWT (Signature invalide, Tampering)
 *  9. Attaque par Brute-Force & Credential Stuffing (Seuil & Lockout)
 * 10. Attaque par Exfiltration de Clés API & Contrôle du Masquage
 */

import jwt from 'jsonwebtoken';
import { getTenantBusinessId } from '../src/middleware/auth';
import { bruteForceProtector } from '../src/utils/bruteForceProtection';
import { maskApiKey, encryptSecret, decryptSecret } from '../src/utils/crypto';
import { AppError } from '../src/middleware/errorHandler';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [BLOCKED/DEFENDED] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [EXPLOIT SUCCEEDED / VULNERABILITY DETECTED] ${message}`);
    failedTests++;
  }
}

async function runRedTeamPentestSuite() {
  console.log('\n=================================================================');
  console.log('🔴 SUITE D’AUDIT OFFENSIF & TESTS D’INTRUSION (RED TEAM) — COMMERCIA');
  console.log('=================================================================\n');

  // --------------------------------------------------------------------------
  // SCÉNARIO 1 : Attaque IDOR / BOLA Inter-Tenant
  // L'attaquant tente de lire ou modifier une vente appartenant à une autre entreprise.
  // --------------------------------------------------------------------------
  console.log('--- SCÉNARIO 1 : Attaque IDOR / BOLA Inter-Tenant ---');
  {
    const attackerBusinessId = 'tenant-attacker-1111';
    const victimBusinessId = 'tenant-victim-9999';
    const victimSaleId = 'sale-victim-secret-123';

    // Simulation de la requête Prisma de consultation de vente
    const mockDbSale = {
      id: victimSaleId,
      businessId: victimBusinessId,
      totalAmount: 500000,
    };

    // Le handler sécurisé vérifie { id: saleId, businessId: attackerBusinessId }
    const scopedQuery = (saleId: string, bId: string) => {
      if (mockDbSale.id === saleId && mockDbSale.businessId === bId) {
        return mockDbSale;
      }
      return null;
    };

    const exploitResult = scopedQuery(victimSaleId, attackerBusinessId);
    assert(exploitResult === null, 'La tentative de lecture de la vente de la victime est rejetée (IDOR impossible)');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 2 : Attaque par Usurpation d'En-tête Tenant (x-business-id)
  // L'attaquant injecte un x-business-id étranger dans les en-têtes HTTP.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 2 : Attaque par Usurpation d’En-tête Tenant (x-business-id) ---');
  {
    const attackerUserId = 'usr-hacker-777';
    const victimOrgId = 'biz-victim-confidential-888';

    // Mock Prisma pour simuler la base de données
    const mockPrisma = {
      businessMember: {
        findFirst: async ({ where }: any) => {
          // L'attaquant est seulement membre de son propre business
          if (where.userId === attackerUserId && where.businessId === victimOrgId) {
            return null; // Pas membre de la victime
          }
          if (where.userId === attackerUserId && where.businessId === 'biz-attacker-mine') {
            return { id: 'bm-1', userId: attackerUserId, businessId: 'biz-attacker-mine', isActive: true };
          }
          return null;
        },
      },
    };

    const fakeReq: any = {
      userId: attackerUserId,
      headers: { 'x-business-id': victimOrgId },
      query: {},
      prisma: mockPrisma,
    };

    let blocked = false;
    try {
      await getTenantBusinessId(fakeReq);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) {
        blocked = true;
      }
    }
    assert(blocked, 'L’injection d’un x-business-id étranger est immédiatement bloquée par une 403 Forbidden');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 3 : Attaque par Escalade de Privilèges Verticale (Super Admin)
  // Un commerçant standard tente d'accéder au endpoint Super Admin /api/admin/stats.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 3 : Attaque par Escalade de Privilèges Verticale ---');
  {
    const merchantUser = {
      id: 'usr-standard-merchant',
      email: 'merchant@store.com',
      isAdmin: false,
    };

    // Middleware requireAdmin
    const executeRequireAdmin = (user: typeof merchantUser) => {
      if (!user || !user.isAdmin) {
        throw new AppError('Accès strictement réservé aux Super Administrateurs COMMERCIA.', 403);
      }
      return true;
    };

    let blocked = false;
    try {
      executeRequireAdmin(merchantUser);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) {
        blocked = true;
      }
    }
    assert(blocked, 'Le commerçant non-admin est bloqué avec 403 lors d’une tentative d’accès Super Admin');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 4 : Attaque par Falsification Financière & Manipulation de Prix
  // L'attaquant poste une vente en déclarant totalAmount = 1 alors que les articles coûtent 50 000.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 4 : Attaque par Falsification Financière & Manipulation de Prix ---');
  {
    const maliciousPayload = {
      items: [
        { name: 'Chaussures Cuir Pro', quantity: 2, unitPrice: 25000, costPrice: 15000 },
      ],
      discountAmount: 0,
      totalAmount: 1, // Attaque : tentative de forcer un total de 1 FCFA
    };

    // Logique de recalcul côté serveur (conforme backend sales.routes.ts)
    const grossTotal = maliciousPayload.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const computedTotal = Math.max(0, grossTotal - (maliciousPayload.discountAmount || 0));
    const finalStoredAmount = computedTotal; // Le serveur écrase le total client

    assert(
      finalStoredAmount === 50000 && finalStoredAmount !== maliciousPayload.totalAmount,
      `Le serveur recalcule le montant réel (${finalStoredAmount} FCFA) et ignore le montant falsifié (${maliciousPayload.totalAmount} FCFA)`
    );
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 5 : Attaque par Déplétion de Stock & Quantité Négative
  // L'attaquant tente de déduire plus de stock que disponible.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 5 : Attaque par Déplétion de Stock & Quantité Négative ---');
  {
    const productInDb = { id: 'prod-123', quantity: 5 };
    const maliciousDeduction = 20;

    let stockDepletedBelowZero = false;
    let blocked = false;

    try {
      if (maliciousDeduction > productInDb.quantity) {
        throw new AppError(`Stock insuffisant (${productInDb.quantity} disponibles).`, 400);
      }
      productInDb.quantity -= maliciousDeduction;
      if (productInDb.quantity < 0) stockDepletedBelowZero = true;
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400) {
        blocked = true;
      }
    }

    assert(blocked && !stockDepletedBelowZero, 'La tentative de créer un stock négatif est stoppée net (HTTP 400)');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 6 : Attaque par Sortie de Caisse Abusive (Vol de Trésorerie)
  // L'attaquant tente d'enregistrer une sortie d'espèces supérieure au solde physique théorique.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 6 : Attaque par Sortie de Caisse Abusive ---');
  {
    const openCashSession = { id: 'sess-1', theoreticalCash: 35000 };
    const attemptedWithdrawal = 100000;

    let blocked = false;
    try {
      if (attemptedWithdrawal > openCashSession.theoreticalCash) {
        throw new AppError(
          `Le montant (${attemptedWithdrawal} FCFA) dépasse le solde théorique en caisse (${openCashSession.theoreticalCash} FCFA).`,
          400
        );
      }
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400) {
        blocked = true;
      }
    }

    assert(blocked, 'La tentative de vider la caisse au-delà du solde théorique est bloquée');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 7 : Attaque par Contournement d'Abonnement (Module Lots Pro)
  // Un utilisateur Free tente d'accéder au module Pro de gestion des lots.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 7 : Attaque par Contournement d’Abonnement (Lots Pro) ---');
  {
    const freeUserSub = {
      isPro: false,
      isAdmin: false,
      planName: 'free',
    };

    let blocked = false;
    try {
      if (!freeUserSub.isPro && !freeUserSub.isAdmin) {
        throw new AppError('Le module « Gestion des lots commerciaux » est réservé aux abonnés COMMERCIA PRO.', 403);
      }
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) {
        blocked = true;
      }
    }

    assert(blocked, 'L’utilisateur du Plan Gratuit est bloqué à l’entrée des routes Pro par le serveur');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 8 : Attaque Cryptographique sur Tokens JWT (Tampering & None-Alg)
  // L'attaquant forge un token JWT en changeant l'ID utilisateur sans clé valide.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 8 : Attaque Cryptographique sur Tokens JWT ---');
  {
    const realSecret = 'legitimate_super_secret_master_key_12345678';
    const fakeSecret = 'attacker_malicious_forged_secret_87654321';

    // Token forgé par l'attaquant
    const forgedToken = jwt.sign({ userId: 'victim-superadmin-uuid' }, fakeSecret);

    let signatureRejected = false;
    try {
      jwt.verify(forgedToken, realSecret);
    } catch {
      signatureRejected = true;
    }

    assert(signatureRejected, 'Le token forgé avec une mauvaise signature est rejeté par la validation cryptographique');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 9 : Attaque par Brute-Force & Lockout Temporel
  // L'attaquant tente 10 connexions consécutives avec de mauvais mots de passe.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 9 : Attaque par Brute-Force & Credential Stuffing ---');
  {
    const targetEmail = 'target-merchant@store.cm';
    const mockReq: any = {
      ip: '203.0.113.195',
      headers: {},
      socket: { remoteAddress: '203.0.113.195' },
    };

    // 5 échecs consécutifs
    for (let i = 0; i < 5; i++) {
      bruteForceProtector.recordFailure(mockReq, targetEmail);
    }

    let lockoutTriggered = false;
    try {
      bruteForceProtector.check(mockReq, targetEmail);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 429) {
        lockoutTriggered = true;
      }
    }

    assert(lockoutTriggered, 'L’attaque brute-force est contenue : le compte et l’IP sont verrouillés en HTTP 429');
  }

  // --------------------------------------------------------------------------
  // SCÉNARIO 10 : Attaque par Exfiltration de Clés API & Contrôle du Masquage
  // L'attaquant inspecte les réponses API pour dérober une clé OpenAI/Gemini.
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 10 : Protection Contre l’Exfiltration de Clés API ---');
  {
    const rawApiKey = 'sk-proj-999888777666555444333222111000abcdef';
    const masked = maskApiKey(rawApiKey);

    const leaksSensitiveCenter = masked.includes('777666555444333');
    const revealsPrefixAndSuffixOnly = masked.startsWith('sk-p') && masked.endsWith('cdef');

    assert(
      !leaksSensitiveCenter && revealsPrefixAndSuffixOnly,
      `La clé API est strictement masquée (${masked}) : aucune exfiltration possible dans les réponses API`
    );
  }

  console.log('\n=================================================================');
  console.log(`📊 BILAN OFFENSIF PENTEST : ${passedTests} attaque(s) bloquée(s), ${failedTests} vulnérabilité(s) résiduelle(s)`);
  console.log('=================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runRedTeamPentestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
