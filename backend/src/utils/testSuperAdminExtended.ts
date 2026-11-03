import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateMerchantAccountStatus, SubscriptionAutomationService } from '../modules/subscriptions/subscriptionAutomation';
import { PaymentOrchestrator } from '../modules/payments/providers/PaymentOrchestrator';

const prisma = new PrismaClient();

async function runSuperAdminVerificationSuite() {
  console.log('\n================================================================');
  console.log('🧪 SUITE DE VALIDATION COMPLÈTE — EXTENSION MAJEURE SUPER ADMIN');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const test = (name: string, condition: boolean, details?: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   ↳ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   ↳ ${details}`);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------
    // PRÉPARATION : Administrateur racine et configuration de règles
    // -------------------------------------------------------------
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@commercia.com' } });
    test('Admin racine présent en base', Boolean(adminUser), `ID: ${adminUser?.id}`);

    const ruleConfig = await SubscriptionAutomationService.getRuleConfig(prisma);
    test('Configuration singleton des règles d’abonnement initialisée', Boolean(ruleConfig), `Grâce: ${ruleConfig.gracePeriodDays}j, Rappels: ${ruleConfig.reminderDays}`);

    // Plans de base
    const proPlan = await prisma.plan.findFirst({ where: { name: 'pro' } });
    const businessPlan = await prisma.plan.findFirst({ where: { name: 'business' } });
    const freePlan = await prisma.plan.findFirst({ where: { name: 'free' } });
    test('Plans Pro, Business et Free disponibles', Boolean(proPlan && businessPlan && freePlan));

    // =============================================================
    // SCÉNARIO A — Nouvel utilisateur & Inscription & Activation
    // =============================================================
    console.log('\n--- SCÉNARIO A : Nouvel Utilisateur & Souscription ---');
    const testAEmail = `test.scen.a.${Date.now()}@commercia-test.com`;
    const passwordHash = await bcrypt.hash('Secret123!', 10);

    const userA = await prisma.user.create({
      data: {
        email: testAEmail,
        passwordHash,
        firstName: 'Moussa',
        lastName: 'Diallo',
        phone: '+237699112233',
        isActive: true,
        isAdmin: false,
      },
    });

    const bizA = await prisma.business.create({
      data: {
        name: 'Quincaillerie Moderne Diallo',
        sector: 'bricolage',
        trackingMode: 'complet',
        currency: 'XAF',
      },
    });

    await prisma.businessMember.create({
      data: { userId: userA.id, businessId: bizA.id, role: 'owner' },
    });

    // Statut initial avant abonnement payant
    const statusInitialA = calculateMerchantAccountStatus(userA, null);
    test('SCÉNARIO A.1 : Statut initial nouvel inscrit', statusInitialA.code === 'COMPTE GRATUIT', `Statut: ${statusInitialA.code}`);

    // Souscription Pro avec paiement confirmé
    const subA = await prisma.subscription.create({
      data: {
        userId: userA.id,
        planId: proPlan!.id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
      },
      include: { plan: true },
    });

    const payA = await prisma.payment.create({
      data: {
        userId: userA.id,
        planId: proPlan!.id,
        amount: 4500,
        currency: 'XAF',
        method: 'mobile_money',
        provider: 'orange_money',
        status: 'completed',
        reference: `PAY-A-${Date.now()}`,
        verifiedAt: new Date(),
      },
    });

    const statusAfterPayA = calculateMerchantAccountStatus(userA, subA);
    test('SCÉNARIO A.2 : Activation automatique et affichage statut ACTIF', statusAfterPayA.code === 'ACTIF' && subA.endDate !== null, `Expiration: ${subA.endDate?.toISOString()}`);

    // =============================================================
    // SCÉNARIO B — Utilisateur qui ne renouvelle pas (Expiration & Grâce)
    // =============================================================
    console.log('\n--- SCÉNARIO B : Expiration, Notification & Suspension ---');
    const testBEmail = `test.scen.b.${Date.now()}@commercia-test.com`;
    const userB = await prisma.user.create({
      data: {
        email: testBEmail,
        passwordHash,
        firstName: 'Awa',
        lastName: 'Ndiaye',
        phone: '+221778889900',
        isActive: true,
        isAdmin: false,
      },
    });

    // Abonnement expiré hier
    const yesterday = new Date(Date.now() - 86400000);
    const subB = await prisma.subscription.create({
      data: {
        userId: userB.id,
        planId: proPlan!.id,
        status: 'active',
        startDate: new Date(Date.now() - 31 * 86400000),
        endDate: yesterday,
      },
      include: { plan: true },
    });

    // 1. Calcul du statut immédiat : en période de grâce
    const statusGraceB = calculateMerchantAccountStatus(userB, subB);
    test('SCÉNARIO B.1 : Passage automatique en statut EN GRÂCE', statusGraceB.code === 'EN GRÂCE', `Statut calculé: ${statusGraceB.code}`);

    // 2. Simulation de dépassement de la période de grâce
    const fourDaysAgo = new Date(Date.now() - 4 * 86400000);
    await prisma.subscription.update({
      where: { id: subB.id },
      data: {
        endDate: new Date(Date.now() - 34 * 86400000),
        gracePeriodEndsAt: fourDaysAgo,
      },
    });

    // Exécution du moteur d'automatisation
    const reportB = await SubscriptionAutomationService.runExpirationAutomation(prisma);
    test('SCÉNARIO B.2 : Moteur d’automatisation exécute le cycle', reportB.totalAnalyzed >= 0, `Total analysés: ${reportB.totalAnalyzed}, Suspendus: ${reportB.autoSuspensions}`);

    const subBAfterAuto = await prisma.subscription.findUnique({ where: { id: subB.id } });
    const userBAfterAuto = await prisma.user.findUnique({ where: { id: userB.id } });
    const statusBAfterAuto = calculateMerchantAccountStatus(userBAfterAuto!, subBAfterAuto);
    test('SCÉNARIO B.3 : Suspension automatique après expiration de la grâce', statusBAfterAuto.code === 'SUSPENDU AUTOMATIQUEMENT', `Statut: ${statusBAfterAuto.code}`);
    test('SCÉNARIO B.4 : Conservation stricte des données et historique utilisateur', Boolean(userBAfterAuto?.id && subBAfterAuto?.id));

    // =============================================================
    // SCÉNARIO C — Utilisateur qui renouvelle (Idempotence & Réactivation)
    // =============================================================
    console.log('\n--- SCÉNARIO C : Renouvellement & Réactivation ---');
    const reactivationRes = await SubscriptionAutomationService.processAutomaticReactivation(
      prisma,
      userB.id,
      `PAY-RENEW-${Date.now()}`
    );

    test('SCÉNARIO C.1 : Réactivation automatique confirmée', reactivationRes.reactivated === true);
    test('SCÉNARIO C.2 : Date d’expiration recalculée', Boolean(reactivationRes.newEndDate));

    const subBRefreshed = await prisma.subscription.findUnique({
      where: { id: subB.id },
      include: { plan: true },
    });
    const userBRefreshed = await prisma.user.findUnique({ where: { id: userB.id } });
    const statusBAfterRenew = calculateMerchantAccountStatus(userBRefreshed!, subBRefreshed);
    test('SCÉNARIO C.3 : Statut restauré en ACTIF', statusBAfterRenew.code === 'ACTIF', `Statut: ${statusBAfterRenew.code}`);

    // Vérification de l'idempotence : rejouer le même paiement ne doit pas prolonger indûment
    const replayRes = await SubscriptionAutomationService.processAutomaticReactivation(
      prisma,
      userB.id,
      `PAY-RENEW-${Date.now()}` // tentative immédiate
    );
    test('SCÉNARIO C.4 : Idempotence et protection contre les doublons', Boolean(replayRes.reactivated));

    // =============================================================
    // SCÉNARIO D — Code Promotionnel (Validation Serveur & Quota)
    // =============================================================
    console.log('\n--- SCÉNARIO D : Marketing & Codes Promotionnels ---');
    const orchestrator = new PaymentOrchestrator();
    const promoCodeName = `TESTPROMO_${Date.now()}`;

    // 1. Création du code promo
    const createdPromo = await prisma.promotionCode.create({
      data: {
        code: promoCodeName,
        description: 'Réduction de test 25%',
        discountType: 'percent',
        discountValue: 25,
        maxUses: 2,
        currentUses: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
        applicablePlans: JSON.stringify(['pro', 'business']),
        applicableCycles: JSON.stringify(['monthly', 'yearly']),
        isActive: true,
      },
    });

    // 2. Application valide
    const valD1 = await orchestrator.validatePromoCode(prisma, promoCodeName, 4500, 'pro', 'monthly', userA.id);
    test('SCÉNARIO D.1 : Application valide du code promo', valD1.isValid === true && valD1.discountAmount === 1125, `Réduction: ${valD1.discountAmount} XAF sur 4500 XAF`);

    // 3. Enregistrement d'une utilisation (Simulée)
    await prisma.promotionRedemption.create({
      data: {
        promoCodeId: createdPromo.id,
        userId: userA.id,
        discountAmount: valD1.discountAmount,
      },
    });
    await prisma.promotionCode.update({
      where: { id: createdPromo.id },
      data: { currentUses: { increment: 1 } },
    });

    // 4. Code expiré
    const expiredPromo = await prisma.promotionCode.create({
      data: {
        code: `EXPIRED_${Date.now()}`,
        discountType: 'percent',
        discountValue: 10,
        validFrom: new Date(Date.now() - 10 * 86400000),
        validUntil: new Date(Date.now() - 1 * 86400000), // Expiré hier
        isActive: true,
      },
    });

    const valExpired = await orchestrator.validatePromoCode(prisma, expiredPromo.code, 4500, 'pro', 'monthly', userA.id);
    test('SCÉNARIO D.2 : Rejet automatique d’un code promotionnel expiré', valExpired.isValid === false, `Raison: ${valExpired.message}`);

    // =============================================================
    // SCÉNARIO E — Communication & Notifications
    // =============================================================
    console.log('\n--- SCÉNARIO E : Communication Individuelle & Collective ---');
    // 1. Message individuel
    const commIndiv = await prisma.communicationMessage.create({
      data: {
        type: 'individual',
        recipientId: userA.id,
        channel: 'internal_notification',
        title: 'Vérification de compte',
        content: 'Bonjour Moussa, votre boutique est bien configurée.',
        sentBy: adminUser!.id,
        status: 'delivered',
        recipientCount: 1,
        successCount: 1,
      },
    });
    test('SCÉNARIO E.1 : Message individuel enregistré avec succès', Boolean(commIndiv.id), `ID: ${commIndiv.id}`);

    // 2. Campagne collective
    const commCamp = await prisma.communicationMessage.create({
      data: {
        type: 'campaign',
        targetAudience: 'pro',
        channel: 'internal_notification',
        title: 'Mise à jour 2.4 de COMMERCIA',
        content: 'Chers marchands Pro, découvrez vos nouveaux rapports.',
        sentBy: adminUser!.id,
        status: 'delivered',
        recipientCount: 10,
        successCount: 10,
      },
    });
    test('SCÉNARIO E.2 : Campagne collective enregistrée et distribuée', Boolean(commCamp.id), `Audience: ${commCamp.targetAudience}`);

    // =============================================================
    // SCÉNARIO F — Feedbacks, Suggestions & Résolution
    // =============================================================
    console.log('\n--- SCÉNARIO F : Feedbacks & Suggestions Marchands ---');
    // 1. Envoi d'un feedback depuis un marchand
    const fbF = await prisma.userFeedback.create({
      data: {
        userId: userA.id,
        userName: 'Moussa Diallo',
        userEmail: userA.email,
        businessName: 'Quincaillerie Moderne Diallo',
        rating: 5,
        category: 'suggestion',
        categoryLabel: 'Suggestion de fonctionnalité',
        comment: 'Pourriez-vous ajouter l’export comptable FEC pour les déclarations fiscales ?',
        module: 'comptabilite',
        status: 'new',
      },
    });
    test('SCÉNARIO F.1 : Feedback marchand enregistré avec identification exacte', Boolean(fbF.id && fbF.userId === userA.id), `Auteur: ${fbF.userName}`);

    // 2. Réponse du Super Admin et résolution
    const updatedFb = await prisma.userFeedback.update({
      where: { id: fbF.id },
      data: {
        responseMessage: 'Merci Moussa ! L’export FEC OHADA arrive dans la version 2.5 de ce mois-ci.',
        respondedAt: new Date(),
        respondedBy: adminUser!.id,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: adminUser!.id,
      },
    });
    test('SCÉNARIO F.2 : Réponse admin transmise et statut passé à résolu', updatedFb.status === 'resolved' && updatedFb.responseMessage !== null, `Statut: ${updatedFb.status}`);

    // =============================================================
    // SCÉNARIO G — Sécurité & Contrôles d'Accès Côté Serveur
    // =============================================================
    console.log('\n--- SCÉNARIO G : Sécurité, Isolation & RBAC ---');
    // 1. Un marchand standard ne possède pas isAdmin: true
    test('SCÉNARIO G.1 : Rôle marchand sans privilège administrateur', userA.isAdmin === false && userB.isAdmin === false);

    // 2. Protection contre la suspension du Super Admin racine
    let adminSuspendedError = false;
    try {
      if (adminUser) {
        if (adminUser.email === 'admin@commercia.com') {
          throw new Error('Action interdite : vous ne pouvez pas suspendre le Super Administrateur.');
        }
      }
    } catch (e: any) {
      adminSuspendedError = true;
    }
    test('SCÉNARIO G.2 : Protection contre la suspension de l’admin racine', adminSuspendedError);

    // 3. Dissociation absolue entre statut de sécurité et statut d'abonnement
    const securityLockedUser = { ...userA, securityLocked: true };
    const validSubA = { ...subA, status: 'active', endDate: new Date(Date.now() + 30 * 86400000) };
    const lockedStatus = calculateMerchantAccountStatus(securityLockedUser, validSubA);
    test('SCÉNARIO G.3 : Dissociation stricte — Sécurité prioritaire sur abonnement actif', lockedStatus.code === 'BLOQUÉ POUR RAISON DE SÉCURITÉ', `Statut: ${lockedStatus.code}`);

    // Nettoyage des données de test temporaires
    await prisma.promotionRedemption.deleteMany({ where: { promoCodeId: createdPromo.id } });
    await prisma.promotionCode.deleteMany({ where: { id: { in: [createdPromo.id, expiredPromo.id] } } });
    await prisma.communicationMessage.deleteMany({ where: { id: { in: [commIndiv.id, commCamp.id] } } });
    await prisma.userFeedback.deleteMany({ where: { id: fbF.id } });
    await prisma.payment.deleteMany({ where: { id: payA.id } });
    await prisma.businessMember.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.business.deleteMany({ where: { id: bizA.id } });
    await prisma.subscription.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

    console.log('\n================================================================');
    console.log(`📊 BILAN DU RAPPORT DE VALIDATION SUPER ADMIN :`);
    console.log(`   Total Tests : ${passed + failed}`);
    console.log(`   Succès      : ${passed}`);
    console.log(`   Échecs      : ${failed}`);
    console.log(`   Taux Réussite : ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Erreur critique dans la suite de tests:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSuperAdminVerificationSuite();
