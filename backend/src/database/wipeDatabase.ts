import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeDatabase() {
  console.log('🧹 [COMMERCIA] Début de la réinitialisation complète de la base de données...');

  try {
    // 1. Suppression dans l'ordre pour respecter les contraintes de clés étrangères
    console.log('⏳ Suppression des données métiers...');

    // Mobile money & Service orders & Food prep
    await prisma.mobileMoneyOperation.deleteMany({});
    await prisma.serviceOrderPayment.deleteMany({});
    await prisma.serviceOrderCost.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.mealPreparation.deleteMany({});
    await prisma.recipeIngredient.deleteMany({});
    await prisma.recipe.deleteMany({});

    // Commercial lots & friperie
    await prisma.lotStockMovement.deleteMany({});
    await prisma.lotExpense.deleteMany({});
    await prisma.lotSaleItem.deleteMany({});
    await prisma.lotSale.deleteMany({});
    await prisma.lotItem.deleteMany({});
    await prisma.commercialLotCampaign.deleteMany({});

    // Caisses
    await prisma.cashMovement.deleteMany({});
    await prisma.cashSession.deleteMany({});

    // Ventes, Items & Factures
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.invoice.deleteMany({});

    // Clients, Dettes & Paiements
    await prisma.customerPayment.deleteMany({});
    await prisma.customerDebt.deleteMany({});
    await prisma.customer.deleteMany({});

    // Stocks & Produits
    await prisma.inventoryMovement.deleteMany({});
    await prisma.product.deleteMany({});

    // Dépenses & Catégories
    await prisma.expense.deleteMany({});
    await prisma.expenseCategory.deleteMany({});

    // Analytics, Snapshots, Campagnes de croissance
    await prisma.analyticsEvent.deleteMany({});
    await prisma.dashboardSnapshot.deleteMany({});
    await prisma.acquisitionCampaign.deleteMany({});
    await prisma.acquisitionChannel.deleteMany({});

    // Notifications, AI & Logs
    await prisma.notification.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.aIInsight.deleteMany({});
    await prisma.aIMessage.deleteMany({});
    await prisma.aIConversation.deleteMany({});

    // Abonnements & Paiements
    await prisma.payment.deleteMany({});
    await prisma.subscriptionEvent.deleteMany({});
    await prisma.subscription.deleteMany({});

    // Entreprises & Membres
    await prisma.businessSettings.deleteMany({});
    await prisma.businessMember.deleteMany({});
    await prisma.business.deleteMany({});

    // Tokens & Utilisateurs
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✅ Toutes les données utilisateurs, comptes et entreprises ont été purgées avec succès !');

    // 2. Initialisation des 3 Plans de référence du système (Free, Pro, Business)
    console.log('📦 Initialisation des plans d\'abonnement standards...');
    const plans = [
      {
        name: 'free',
        displayName: 'Gratuit',
        description: 'Pour démarrer et tester la gestion simplifiée',
        priceMonthly: 0,
        priceYearly: 0,
        features: JSON.stringify([
          '15 ventes par jour',
          'Vente comptoir express & Dépenses',
          'Carnet clients & dettes de base',
          'Gestion de stock simple',
          'Calcul du bénéfice journalier',
        ]),
        limits: JSON.stringify({ salesPerDay: 15, aiQueries: 0, multiShop: false }),
        sortOrder: 1,
      },
      {
        name: 'pro',
        displayName: 'Pro',
        description: 'Ventes illimitées et modules spécialisés métier',
        priceMonthly: 4500,
        priceYearly: 45000,
        features: JSON.stringify([
          'Ventes & dépenses illimitées',
          'Modules Métiers (Lots Friperie, Restauration/Portions, Atelier/Devis, Mobile Money)',
          'Gestion complète des créances & relances',
          'Suivi de trésorerie prévisionnelle',
          'Gestion des livraisons & coursier',
          'Copilote IA COMMERCIA',
        ]),
        limits: JSON.stringify({ salesPerDay: -1, aiQueries: -1, multiShop: false }),
        sortOrder: 2,
      },
      {
        name: 'business',
        displayName: 'Business Multi-Activités',
        description: 'Pour entrepreneurs avec plusieurs points de vente ou collaborateurs',
        priceMonthly: 12000,
        priceYearly: 120000,
        features: JSON.stringify([
          'Tout le plan Pro',
          'Multi-boutiques & points de vente',
          'Comptes caissiers & permissions',
          'Consolidation multi-activités',
          'Support prioritaire 7j/7',
        ]),
        limits: JSON.stringify({ salesPerDay: -1, aiQueries: -1, multiShop: true }),
        sortOrder: 3,
      },
    ];

    for (const p of plans) {
      await prisma.plan.upsert({
        where: { name: p.name },
        update: p,
        create: p,
      });
    }

    // 3. Vérification des comptes
    const [userCount, bizCount, prodCount, saleCount, expCount, custCount] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.product.count(),
      prisma.sale.count(),
      prisma.expense.count(),
      prisma.customer.count(),
    ]);

    console.log('\n📊 ÉTAT FINAL DE LA BASE DE DONNÉES :');
    console.log(`- Utilisateurs : ${userCount}`);
    console.log(`- Entreprises / Boutiques : ${bizCount}`);
    console.log(`- Produits : ${prodCount}`);
    console.log(`- Ventes : ${saleCount}`);
    console.log(`- Dépenses : ${expCount}`);
    console.log(`- Clients : ${custCount}`);
    console.log('✨ La base de données est 100% vierge et prête pour de nouvelles inscriptions.');
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

wipeDatabase();
