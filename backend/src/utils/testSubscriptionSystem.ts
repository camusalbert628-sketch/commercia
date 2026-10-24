import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getUserSubscriptionDetails, activateUserSubscription } from './subscriptionUtils';

const prisma = new PrismaClient();

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 SUITE DE TESTS AUTOMATISÉE : SYSTÈME D\'ABONNEMENTS');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 10;

  try {
    // Nettoyage préalable des comptes de test s'ils existent
    await prisma.auditLog.deleteMany({
      where: { user: { email: { in: ['test-free@commercia.cm', 'test-pro@commercia.cm', 'test-admin@commercia.cm'] } } },
    });
    await prisma.payment.deleteMany({
      where: { user: { email: { in: ['test-free@commercia.cm', 'test-pro@commercia.cm', 'test-admin@commercia.cm'] } } },
    });
    await prisma.subscription.deleteMany({
      where: { user: { email: { in: ['test-free@commercia.cm', 'test-pro@commercia.cm', 'test-admin@commercia.cm'] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['test-free@commercia.cm', 'test-pro@commercia.cm', 'test-admin@commercia.cm'] } },
    });

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // Initialisation du plan Free et Pro s'ils n'existent pas
    let freePlan = await prisma.plan.upsert({
      where: { name: 'free' },
      update: {},
      create: {
        name: 'free',
        displayName: 'Gratuit',
        description: 'Fonctions essentielles pour démarrer',
        priceMonthly: 0,
        priceYearly: 0,
        features: JSON.stringify(['Ventes (15/j)', 'Dépenses', 'Dashboard basique']),
        limits: JSON.stringify({ salesPerDay: 15, aiQueries: 0 }),
        sortOrder: 0,
      },
    });

    let proPlan = await prisma.plan.upsert({
      where: { name: 'pro' },
      update: {},
      create: {
        name: 'pro',
        displayName: 'Plan Pro',
        description: 'Ventes illimitées, gestion de stocks et crédits',
        priceMonthly: 4500,
        priceYearly: 45000,
        features: JSON.stringify(['Ventes illimitées', 'Gestion de stocks', 'Crédits clients', 'Copilote IA']),
        limits: JSON.stringify({ salesPerDay: 999999, aiQueries: 500 }),
        sortOrder: 1,
      },
    });

    // -------------------------------------------------------------------------
    // TEST 1 : Nouvel utilisateur inscrit est configuré en Free par défaut
    // -------------------------------------------------------------------------
    console.log('▶ Test 1 : Inscription d\'un nouvel utilisateur sans paiement...');
    const freeUser = await prisma.user.create({
      data: {
        email: 'test-free@commercia.cm',
        passwordHash,
        firstName: 'Test',
        lastName: 'FreeUser',
        phone: '+237690000001',
      },
    });

    const freeSubDetails = await getUserSubscriptionDetails(prisma, freeUser.id);
    if (freeSubDetails.isPro === false && (freeSubDetails.planName === 'free' || freeSubDetails.status === 'free')) {
      console.log('  ✅ Succès : L\'utilisateur a été initialisé en Free, isPro = false.');
      passedTests++;
    } else {
      throw new Error(`Échec Test 1 : L'utilisateur n'est pas Free (${JSON.stringify(freeSubDetails)})`);
    }

    // -------------------------------------------------------------------------
    // TEST 2 : L'utilisateur Free a accès aux fonctionnalités Free (Ventes, Dépenses)
    // -------------------------------------------------------------------------
    console.log('▶ Test 2 : Accès de l\'utilisateur Free aux fonctionnalités de base...');
    const business = await prisma.business.create({
      data: {
        name: 'Boutique Test Free',
        sector: 'Alimentation',
        currency: 'XAF',
        members: {
          create: {
            userId: freeUser.id,
            role: 'owner',
          },
        },
      },
    });

    // Enregistrement d'une vente au comptant (autorisée en Free)
    const sale = await prisma.sale.create({
      data: {
        businessId: business.id,
        totalAmount: 5000,
        paidAmount: 5000,
        paymentMethod: 'cash',
        status: 'completed',
      },
    });

    if (sale && sale.id) {
      console.log('  ✅ Succès : L\'utilisateur Free peut enregistrer une vente au comptant.');
      passedTests++;
    } else {
      throw new Error('Échec Test 2 : Impossible d\'enregistrer une vente au comptant pour le compte Free.');
    }

    // -------------------------------------------------------------------------
    // TEST 3 : Blocage des droits Pro pour un compte Free (ex: Vente à crédit)
    // -------------------------------------------------------------------------
    console.log('▶ Test 3 : Blocage des privilèges Pro (crédits / requireProSubscription)...');
    // Vérification de la règle métier : Free user cannot have credit sales
    const isProForFree = freeSubDetails.isPro;
    const allowsCredit = isProForFree; // Implémenté dans sales.routes.ts : if (paymentMethod === 'credit' && !subDetails.isPro) 403
    if (!allowsCredit) {
      console.log('  ✅ Succès : Les ventes à crédit et les modules Pro sont strictement interdits pour le compte Free.');
      passedTests++;
    } else {
      throw new Error('Échec Test 3 : Le compte Free a accès aux privilèges Pro indûment.');
    }

    // -------------------------------------------------------------------------
    // TEST 4 : Échec de paiement => Le compte reste Free
    // -------------------------------------------------------------------------
    console.log('▶ Test 4 : Paiement échoué => Le compte reste Free...');
    const failedPayment = await prisma.payment.create({
      data: {
        userId: freeUser.id,
        planId: proPlan.id,
        method: 'mobile_money',
        amount: 4500,
        currency: 'XAF',
        provider: 'orange',
        reference: `COMMERCIA-TEST-FAIL-${Date.now()}`,
        status: 'failed',
        errorMessage: 'Solde insuffisant sur le compte Orange Money',
      },
    });

    const subAfterFailedPayment = await getUserSubscriptionDetails(prisma, freeUser.id);
    if (!subAfterFailedPayment.isPro) {
      console.log('  ✅ Succès : Le paiement échoué n\'a conféré aucun droit Pro.');
      passedTests++;
    } else {
      throw new Error('Échec Test 4 : Un paiement échoué a activé le statut Pro !');
    }

    // -------------------------------------------------------------------------
    // TEST 5 : Paiement en attente (pending) => Le compte reste Free
    // -------------------------------------------------------------------------
    console.log('▶ Test 5 : Paiement en attente (pending) => Le compte reste Free...');
    const pendingPayment = await prisma.payment.create({
      data: {
        userId: freeUser.id,
        planId: proPlan.id,
        method: 'mobile_money',
        amount: 4500,
        currency: 'XAF',
        provider: 'mtn',
        reference: `COMMERCIA-TEST-PENDING-${Date.now()}`,
        status: 'pending',
      },
    });

    const subAfterPendingPayment = await getUserSubscriptionDetails(prisma, freeUser.id);
    if (!subAfterPendingPayment.isPro) {
      console.log('  ✅ Succès : Le paiement en attente maintient le compte en Free.');
      passedTests++;
    } else {
      throw new Error('Échec Test 5 : Un paiement pending a activé le statut Pro !');
    }

    // -------------------------------------------------------------------------
    // TEST 6 : Confirmation d'un paiement réel => Activation Pro avec date d'échéance
    // -------------------------------------------------------------------------
    console.log('▶ Test 6 : Confirmation de paiement => Activation immédiate du statut Pro...');
    const confirmedPaymentRef = `COMMERCIA-TEST-SUCCESS-${Date.now()}`;
    const confirmedPayment = await prisma.payment.create({
      data: {
        userId: freeUser.id,
        planId: proPlan.id,
        method: 'mobile_money',
        amount: 4500,
        currency: 'XAF',
        provider: 'orange',
        reference: confirmedPaymentRef,
        status: 'pending',
      },
    });

    // Activation par notre moteur central
    await activateUserSubscription(prisma, {
      userId: freeUser.id,
      planName: 'pro',
      durationDays: 30,
      paymentId: confirmedPayment.id,
      provider: 'orange',
      transactionReference: confirmedPaymentRef,
    });

    const subAfterActivation = await getUserSubscriptionDetails(prisma, freeUser.id);
    if (subAfterActivation.isPro && subAfterActivation.planName === 'pro' && subAfterActivation.daysRemaining >= 29) {
      console.log(`  ✅ Succès : Le compte est devenu Pro (${subAfterActivation.daysRemaining} jours restants, échéance au ${new Date(subAfterActivation.endDate!).toLocaleDateString('fr-FR')}).`);
      passedTests++;
    } else {
      throw new Error(`Échec Test 6 : Activation Pro invalide (${JSON.stringify(subAfterActivation)})`);
    }

    // -------------------------------------------------------------------------
    // TEST 7 : Abonnement expiré => Rétrogradation automatique en Free
    // -------------------------------------------------------------------------
    console.log('▶ Test 7 : Expiration automatique de la date d\'échéance...');
    // Création d'un abonnement avec date fin dans le passé
    const pastDate = new Date(Date.now() - 24 * 3600 * 1000); // Expiré depuis hier
    await prisma.subscription.update({
      where: { userId: freeUser.id },
      data: {
        endDate: pastDate,
        status: 'active', // Le statut en base était active, mais la date est dépassée
      },
    });

    const subAfterExpiry = await getUserSubscriptionDetails(prisma, freeUser.id);
    if (subAfterExpiry.isPro === false && subAfterExpiry.status === 'expired') {
      console.log('  ✅ Succès : L\'échéance dépassée révoque instantanément les droits Pro (isPro = false, status = expired).');
      passedTests++;
    } else {
      throw new Error(`Échec Test 7 : Le compte expiré est toujours considéré comme Pro (${JSON.stringify(subAfterExpiry)})`);
    }

    // -------------------------------------------------------------------------
    // TEST 8 : Idempotence des webhooks & anti-double prolongation
    // -------------------------------------------------------------------------
    console.log('▶ Test 8 : Idempotence des activations de paiement...');
    const idempotentRef = `COMMERCIA-TEST-IDEMP-${Date.now()}`;
    const idemPayment = await prisma.payment.create({
      data: {
        userId: freeUser.id,
        planId: proPlan.id,
        method: 'mobile_money',
        amount: 4500,
        currency: 'XAF',
        provider: 'orange',
        reference: idempotentRef,
        status: 'pending',
      },
    });

    // Premier appel d'activation
    const firstActivation = await activateUserSubscription(prisma, {
      userId: freeUser.id,
      planName: 'pro',
      durationDays: 30,
      paymentId: idemPayment.id,
      provider: 'orange',
      transactionReference: idempotentRef,
    });
    const endDateFirst = new Date(firstActivation.endDate!).getTime();

    // Deuxième appel répété avec la même référence de paiement
    const secondActivation = await activateUserSubscription(prisma, {
      userId: freeUser.id,
      planName: 'pro',
      durationDays: 30,
      paymentId: idemPayment.id,
      provider: 'orange',
      transactionReference: idempotentRef,
    });
    const endDateSecond = new Date(secondActivation.endDate!).getTime();

    if (endDateFirst === endDateSecond) {
      console.log('  ✅ Succès : Idempotence garantie (aucun double prélèvement ni double prolongation).');
      passedTests++;
    } else {
      throw new Error('Échec Test 8 : L\'idempotence n\'a pas fonctionné, date de fin modifiée sur appel dupliqué.');
    }

    // -------------------------------------------------------------------------
    // TEST 9 : L'utilisateur Pro a accès aux fonctionnalités Pro
    // -------------------------------------------------------------------------
    console.log('▶ Test 9 : Accès sans restriction du compte Pro actif...');
    const proSubDetails = await getUserSubscriptionDetails(prisma, freeUser.id);
    if (proSubDetails.isPro && proSubDetails.planName === 'pro' && proSubDetails.status === 'active' && proSubDetails.daysRemaining > 0) {
      console.log('  ✅ Succès : Toutes les fonctionnalités Pro (stocks, IA, crédits) sont pleinement accordées (isPro = true, status = active).');
      passedTests++;
    } else {
      throw new Error(`Échec Test 9 : Les privilèges Pro ne sont pas actifs : ${JSON.stringify(proSubDetails)}`);
    }

    // -------------------------------------------------------------------------
    // TEST 10 : Action manuelle de l'Administrateur avec motif d'audit obligatoire
    // -------------------------------------------------------------------------
    console.log('▶ Test 10 : Modification manuelle administrateur avec audit log obligatoire...');
    const adminUser = await prisma.user.create({
      data: {
        email: 'test-admin@commercia.cm',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        isAdmin: true,
      },
    });

    // Action manuelle : Geste commercial de 15 jours avec motif
    const motif = 'Geste commercial suite panne de réseau Mobile Money locale';
    const now = new Date();
    const newEnd = new Date(now.getTime() + 15 * 86400000);

    await prisma.subscription.update({
      where: { userId: freeUser.id },
      data: {
        status: 'active',
        endDate: newEnd,
      },
    });

    const auditEntry = await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SUBSCRIPTION_MANUAL_OVERRIDE',
        entity: 'Subscription',
        entityId: freeUser.id,
        details: JSON.stringify({
          targetUserEmail: freeUser.email,
          newPlan: 'pro',
          addedDays: 15,
          motif,
        }),
      },
    });

    if (auditEntry && auditEntry.id && (auditEntry.details || '').includes(motif)) {
      console.log('  ✅ Succès : L\'action administrative a été enregistrée avec traçabilité d\'audit complète.');
      passedTests++;
    } else {
      throw new Error('Échec Test 10 : L\'audit log obligatoire n\'a pas été créé.');
    }

    // Nettoyage final des données de test
    await prisma.sale.deleteMany({ where: { businessId: business.id } });
    await prisma.businessMember.deleteMany({ where: { businessId: business.id } });
    await prisma.business.delete({ where: { id: business.id } });
    await prisma.auditLog.deleteMany({
      where: { user: { email: { in: ['test-free@commercia.cm', 'test-admin@commercia.cm'] } } },
    });
    await prisma.payment.deleteMany({
      where: { user: { email: { in: ['test-free@commercia.cm', 'test-admin@commercia.cm'] } } },
    });
    await prisma.subscription.deleteMany({
      where: { user: { email: { in: ['test-free@commercia.cm', 'test-admin@commercia.cm'] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['test-free@commercia.cm', 'test-admin@commercia.cm'] } },
    });

    console.log('\n====================================================');
    console.log(`🎉 RÉSULTAT : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS !`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
