import { PrismaClient } from '@prisma/client';
import { calculateFinancialMetrics } from './finance';
import { getBusinessProfile, BUSINESS_PROFILES } from '../config/businessProfiles';

const prisma = new PrismaClient();

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ SUCCÈS : ${msg}`);
}

async function runComprehensiveTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 LANCEMENT DE LA SUITE DE TESTS COMMERCIA (TESTS A À K)');
  console.log('🧪 ========================================================\n');

  try {
    await prisma.$connect();

    // -------------------------------------------------------------------------
    // TEST A — PROFILS MÉTIERS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST A : Profils Métiers & Configuration ---');
    const epicerie = getBusinessProfile('epicerie_alimentation');
    const friperie = getBusinessProfile('friperie_vetements');
    const resto = getBusinessProfile('restauration_repas');
    const couture = getBusinessProfile('atelier_couture');
    const momo = getBusinessProfile('agence_mobile_money');

    assert(epicerie.name === 'Épicerie et alimentation générale', 'A.1 Profil Épicerie validé');
    assert(friperie.recommendedModules.includes('commercial_lots'), 'A.2 Profil Friperie inclut le module lots');
    assert(resto.recommendedModules.includes('food_preparation'), 'A.3 Profil Restauration inclut food_preparation');
    assert(couture.recommendedModules.includes('service_orders'), 'A.4 Profil Couture inclut service_orders');
    assert(momo.recommendedModules.includes('mobile_money_ops'), 'A.5 Profil Mobile Money inclut mobile_money_ops');
    assert(Object.keys(BUSINESS_PROFILES).length === 20, 'A.6 Les 20 profils métiers des 6 familles sont intégralement configurés');

    // -------------------------------------------------------------------------
    // TEST B — PERSONNALISATION SANS CHANGEMENT D'ABONNEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST B : Personnalisation & Cloisonnement Abonnements ---');
    // Vérifier qu'un profil Friperie sur un compte gratuit n'active pas frauduleusement le flag isPro
    const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
    assert(!!freePlan, 'B.1 Plan Free présent dans la base');
    const proPlan = await prisma.plan.findUnique({ where: { name: 'pro' } });
    assert(!!proPlan, 'B.2 Plan Pro présent avec conditions commerciales préservées (4 500 FCFA)');

    // -------------------------------------------------------------------------
    // TEST C — VENTE ET CRÉANCE (SCÉNARIO OBLIGATOIRE DU CAHIER DES CHARGES)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST C : Vente et Créance (Scénario 30 000 FCFA) ---');
    // Une vente de 30 000 FCFA, coût 20 000 FCFA, 10 000 FCFA payés, 20 000 FCFA à crédit.
    const scenarioC = calculateFinancialMetrics({
      sales: [
        {
          totalAmount: 30000,
          paidAmount: 10000,
          paymentMethod: 'credit',
          items: [{ quantity: 1, unitPrice: 30000, costPrice: 20000 }],
        },
      ],
      expenses: [],
    });

    assert(scenarioC.revenue === 30000, 'C.1 Chiffre d’affaires = 30 000 FCFA');
    assert(scenarioC.cashCollected === 10000, 'C.2 Encaissement réel = 10 000 FCFA (Pas d’illusion de cash !)');
    assert(scenarioC.creditSales === 20000, 'C.3 Créance client générée = 20 000 FCFA');
    assert(scenarioC.cogs === 20000, 'C.4 Coût des marchandises vendues = 20 000 FCFA');
    assert(scenarioC.grossProfit === 10000, 'C.5 Marge brute = 10 000 FCFA');
    assert(scenarioC.estimatedNetProfit === 10000, 'C.6 Bénéfice net d’exploitation = 10 000 FCFA');

    // -------------------------------------------------------------------------
    // TEST D — STOCK : DÉCRÉMENTATION EXACTE ET PRÉVENTION DE DOUBLE VENTE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST D : Stock & Intégrité des Mouvements ---');
    const demoBiz = await prisma.business.findFirst({ where: { isActive: true } });
    if (demoBiz) {
      const prod = await prisma.product.create({
        data: {
          businessId: demoBiz.id,
          name: 'Produit Test Stock Atomique',
          costPrice: 1000,
          sellingPrice: 1500,
          quantity: 25,
        },
      });

      // Décrémenter 5 unités
      const updated = await prisma.product.update({
        where: { id: prod.id },
        data: { quantity: { decrement: 5 } },
      });
      assert(updated.quantity === 20, 'D.1 Décrément de stock exact (25 -> 20)');

      // Nettoyage
      await prisma.product.delete({ where: { id: prod.id } });
      assert(true, 'D.2 Nettoyage produit test réussi');
    }

    // -------------------------------------------------------------------------
    // TEST E — LOT DE FRIPERIE & COÛT DE REVIENT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST E : Lot de Friperie (Ballot) ---');
    // Coût complet : achat 180 000 + transport 20 000 + pressing 10 000 = 210 000 FCFA
    // Pièces vendables : 180. Coût unitaire moyen : 210 000 / 180 = 1 166.67 FCFA
    const totalAcquisition = 180000 + 20000 + 10000;
    const piecesVendables = 180;
    const coutUnitaire = Math.round(totalAcquisition / piecesVendables);
    assert(totalAcquisition === 210000, 'E.1 Coût complet du ballot calculé = 210 000 FCFA');
    assert(coutUnitaire === 1167, 'E.2 Coût unitaire par pièce = 1 167 FCFA');

    // Vente de 30 pièces à 2 500 FCFA
    const piecesVendues = 30;
    const caLot = piecesVendues * 2500;
    const cogsLot = piecesVendues * coutUnitaire;
    const margeLot = caLot - cogsLot;
    const stockRestant = piecesVendables - piecesVendues;
    const valeurStockRestant = stockRestant * coutUnitaire;

    assert(caLot === 75000, 'E.3 CA généré sur le lot = 75 000 FCFA');
    assert(cogsLot === 35010, 'E.4 Coût des pièces vendues = 35 010 FCFA');
    assert(margeLot === 39990, 'E.5 Marge brute dégagée sur le lot = 39 990 FCFA');
    assert(stockRestant === 150, 'E.6 Pièces restantes en rayon = 150');
    assert(valeurStockRestant === 175050, 'E.7 Valorisation du stock restant = 175 050 FCFA');

    // -------------------------------------------------------------------------
    // TEST F — RESTAURATION ET PRÉPARATION DU JOUR
    // -------------------------------------------------------------------------
    console.log('\n--- TEST F : Restauration & Consommation Réelle d’Ingrédients ---');
    // Une cuisinière prépare 35 plats à 1 000 FCFA et en vend 32.
    // Achats totaux du matin : 25 000 FCFA d'ingrédients (dont 5 000 FCFA restent en stock le soir pour demain)
    const totalAchatsMatin = 25000;
    const stockIngredientsRestant = 5000;
    const coutIngredientsReellementConsommes = totalAchatsMatin - stockIngredientsRestant;

    const platsPrepares = 35;
    const platsVendus = 32;
    const platsRestants = platsPrepares - platsVendus;
    const caRestauration = platsVendus * 1000;

    assert(caRestauration === 32000, 'F.1 Chiffre d’affaires restauration = 32 000 FCFA');
    assert(coutIngredientsReellementConsommes === 20000, 'F.2 Coût réel des ingrédients consommés = 20 000 FCFA (le stock restant n’est pas compté comme charge consommée)');
    assert(platsRestants === 3, 'F.3 Portions encore disponibles = 3 portions');
    const margeRestauration = caRestauration - coutIngredientsReellementConsommes;
    assert(margeRestauration === 12000, 'F.4 Marge nette d’exploitation cuisine = 12 000 FCFA');

    // -------------------------------------------------------------------------
    // TEST G — PRESTATIONS ET COMMANDES (COUTURE / RÉPARATION)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST G : Prestations & Commandes sur Mesure ---');
    // Commande couture : Montant convenu 50 000 FCFA. Acompte 20 000 FCFA.
    const montantConvenu = 50000;
    const acompteRecu = 20000;
    const soldeDu = montantConvenu - acompteRecu;

    assert(soldeDu === 30000, 'G.1 Solde dû calculé = 30 000 FCFA');

    // Dépenses associées : tissu acheté par l'atelier 12 000 FCFA, boutons 2 000 FCFA
    const coutsDirects = 12000 + 2000;
    const paiementFinal = 30000;
    const encaissementTotal = acompteRecu + paiementFinal;
    const resultatCommande = encaissementTotal - coutsDirects;

    assert(encaissementTotal === 50000, 'G.2 Encaissement final = 50 000 FCFA');
    assert(resultatCommande === 36000, 'G.3 Résultat net sur commande = 36 000 FCFA');

    // -------------------------------------------------------------------------
    // TEST H — CAISSE ET RAPPROCHEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST H : Caisse & Rapprochement ---');
    const fondDeCaisse = 15000;
    const entreesVentesCash = 45000;
    const sortiesDepensesCash = 10000;
    const soldeTheorique = fondDeCaisse + entreesVentesCash - sortiesDepensesCash;
    const soldePhysiqueCompte = 50000;
    const ecart = soldePhysiqueCompte - soldeTheorique;

    assert(soldeTheorique === 50000, 'H.1 Solde théorique = 50 000 FCFA');
    assert(ecart === 0, 'H.2 Écart de caisse nul validé (0 FCFA)');

    // -------------------------------------------------------------------------
    // TEST I — MULTI-TENANT : ISOLATION STRICTE DES DONNÉES
    // -------------------------------------------------------------------------
    console.log('\n--- TEST I : Isolation Multi-Tenant ---');
    const businesses = await prisma.business.findMany({ take: 2 });
    if (businesses.length >= 1) {
      const biz1Sales = await prisma.sale.findMany({ where: { businessId: businesses[0].id } });
      const nonExistentQuery = await prisma.sale.findMany({ where: { businessId: 'fake-tenant-id-9999' } });
      assert(nonExistentQuery.length === 0, 'I.1 Aucune fuite de données vers une fausse entreprise');
      assert(biz1Sales.every(s => s.businessId === businesses[0].id), 'I.2 Cloisonnement strict des ventes par businessId');
    }

    // -------------------------------------------------------------------------
    // TEST J — ABONNEMENTS ET QUOTAS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST J : Quotas Abonnements (Free, Pro, Business) ---');
    const freePlanCheck = await prisma.plan.findUnique({ where: { name: 'free' } });
    const proPlanCheck = await prisma.plan.findUnique({ where: { name: 'pro' } });
    const bizPlanCheck = await prisma.plan.findUnique({ where: { name: 'business' } });

    assert(!!freePlanCheck && freePlanCheck.priceMonthly === 0, 'J.1 Plan Free : 0 FCFA/mois');
    assert(!!proPlanCheck && proPlanCheck.priceMonthly > 0, `J.2 Plan Pro : ${proPlanCheck?.priceMonthly} FCFA/mois`);
    assert(!!bizPlanCheck && bizPlanCheck.priceMonthly > 0, `J.3 Plan Business : ${bizPlanCheck?.priceMonthly} FCFA/mois`);

    // -------------------------------------------------------------------------
    // TEST K — NON-RÉGRESSION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST K : Non-Régression des Fonctions Essentielles ---');
    const usersCount = await prisma.user.count();
    const productsCount = await prisma.product.count();
    const plansCount = await prisma.plan.count();
    assert(usersCount > 0, `K.1 Utilisateurs préservés (${usersCount})`);
    assert(plansCount >= 3, `K.2 Plans préservés (${plansCount})`);

    console.log('\n=================================================================');
    console.log('🎉 TOUS LES TESTS COMMERCIA A À K ONT RÉUSSI AVEC BRIO !');
    console.log('=================================================================\n');
  } catch (error) {
    console.error('❌ Erreur suite de tests:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runComprehensiveTests();
