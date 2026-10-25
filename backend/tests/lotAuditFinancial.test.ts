import assert from 'assert';
import {
  calculateLotFinancials,
  consolidateLotsOverview,
  calculateDepletionStats,
} from '../src/modules/lots/lotFinancialEngine';

console.log('===============================================================');
console.log('COMMERCIA PRO - SUITE DE TESTS D\'AUDIT FINANCIER DES LOTS');
console.log('Validation des 17 règles métier et calculs financiers stricts');
console.log('===============================================================\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name: string, fn: () => void) {
  testsTotal++;
  try {
    fn();
    console.log(`✅ TEST ${testsTotal}: ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`❌ TEST ${testsTotal} FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Calcul du coût total d'approvisionnement (Investissement Total)
// ---------------------------------------------------------------------------
runTest('1. Coût total d\'approvisionnement = Prix achat + Fret + Douane + Commissions + Emballage + Autres', () => {
  const campaign = {
    id: 'camp-1',
    createdAt: '2026-10-01T10:00:00.000Z',
    purchasePriceXaf: 300000,
    transportCost: 60000,
    customsCost: 40000,
    transactionFees: 15000,
    packagingCost: 10000,
    otherSupplyCosts: 5000,
    costAllocationMethod: 'unit',
  };

  const fin = calculateLotFinancials(campaign, [], [], []);

  assert.strictEqual(fin.purchasePriceXaf, 300000, 'Prix d\'achat initial doit être 300 000 FCFA');
  assert.strictEqual(fin.supplyCosts.totalSupplyCosts, 130000, 'Frais d\'approvisionnement cumulés doivent être 130 000 FCFA');
  assert.strictEqual(fin.totalLandedCost, 430000, 'Investissement total doit être exactement 430 000 FCFA');
});

// ---------------------------------------------------------------------------
// TEST 2: Calcul du coût de revient unitaire (Égalitaire vs Pondéré)
// ---------------------------------------------------------------------------
runTest('2. Calcul du coût de revient unitaire (Ventilation sans double compte)', () => {
  const campaign = {
    id: 'camp-2',
    createdAt: '2026-10-01T10:00:00.000Z',
    purchasePriceXaf: 400000,
    transportCost: 50000,
    customsCost: 50000,
    transactionFees: 0,
    packagingCost: 0,
    otherSupplyCosts: 0,
    costAllocationMethod: 'unit',
  };

  // 100 unités reçues au total
  const items = [
    { id: 'item-1', name: 'Robe A', quantityReceived: 40, quantitySold: 0, quantityRemaining: 40, unitCost: 5000, estimatedSellingPrice: 10000 },
    { id: 'item-2', name: 'Robe B', quantityReceived: 60, quantitySold: 0, quantityRemaining: 60, unitCost: 5000, estimatedSellingPrice: 8000 },
  ];

  const fin = calculateLotFinancials(campaign, items, [], []);
  assert.strictEqual(fin.totalLandedCost, 500000, 'Total landed cost = 500 000 FCFA');
  assert.strictEqual(fin.stockValuation.totalQuantityReceived, 100);
  assert.strictEqual(fin.unitAverages.avgUnitLandedCost, 5000, 'Coût moyen par unité = 5000 FCFA');
});

// ---------------------------------------------------------------------------
// TEST 3: Vente partielle d'un lot et calcul strict du COGS
// ---------------------------------------------------------------------------
runTest('3. Vente partielle: COGS calculé uniquement sur les unités vendues', () => {
  const campaign = {
    id: 'camp-3',
    createdAt: '2026-10-01T10:00:00.000Z',
    purchasePriceXaf: 200000,
    transportCost: 0,
    customsCost: 0,
    transactionFees: 0,
    packagingCost: 0,
    otherSupplyCosts: 0,
  };

  // 50 pièces reçues à 4000 FCFA chacune = 200 000 FCFA
  const items = [
    { id: 'it-1', name: 'Jean Slim', quantityReceived: 50, quantitySold: 10, quantityRemaining: 40, unitCost: 4000, estimatedSellingPrice: 8000 },
  ];

  // Vente de 10 pièces à 8000 FCFA = 80 000 FCFA
  const sales = [
    {
      id: 'sale-1',
      totalAmount: 80000,
      discountAmount: 0,
      netAmount: 80000,
      variableCosts: 5000, // 5000 FCFA de livraison
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      items: [
        { lotItemId: 'it-1', quantity: 10, unitPrice: 8000, unitCost: 4000, totalPrice: 80000, totalCost: 40000, grossProfit: 40000 },
      ],
    },
  ];

  const fin = calculateLotFinancials(campaign, items, sales, []);

  // Le COGS doit être 10 * 4000 = 40 000 FCFA (et JAMAIS la totalité des 200 000 FCFA du lot !)
  assert.strictEqual(fin.cogs.totalCostOfGoodsSold, 40000, 'COGS doit être strictement 40 000 FCFA');
  assert.strictEqual(fin.grossProfit, 40000, 'Marge brute = 80 000 - 40 000 = 40 000 FCFA');
  assert.strictEqual(fin.variableMargin, 35000, 'Marge contributive = 40 000 - 5 000 = 35 000 FCFA');
  assert.strictEqual(fin.realizedNetProfit, 35000, 'Bénéfice net réalisé = 35 000 FCFA');
});

// ---------------------------------------------------------------------------
// TEST 4: Gestion et Double Valorisation du Stock Restant (Coût vs Marché)
// ---------------------------------------------------------------------------
runTest('4. Double valorisation du stock restant: Coût de revient vs Valeur potentielle de vente', () => {
  const campaign = { id: 'camp-4', totalLandedCost: 200000 };
  const items = [
    { id: 'it-1', quantityReceived: 50, quantitySold: 10, quantityRemaining: 40, unitCost: 4000, estimatedSellingPrice: 9000 },
  ];

  const fin = calculateLotFinancials(campaign, items, [], []);

  // Coût de revient du stock restant = 40 * 4 000 = 160 000 FCFA
  assert.strictEqual(fin.stockValuation.remainingStockCostValue, 160000, 'Coût de revient stock restant');
  // Valeur potentielle de vente = 40 * 9 000 = 360 000 FCFA
  assert.strictEqual(fin.stockValuation.remainingStockMarketValue, 360000, 'Valeur potentielle marché');
  // Marge potentielle future non encore réalisée = 360 000 - 160 000 = 200 000 FCFA
  assert.strictEqual(fin.stockValuation.potentialFutureGrossMargin, 200000, 'Marge brute potentielle future');
});

// ---------------------------------------------------------------------------
// TEST 5: Calcul du chiffre d'affaires net (Remises déduites)
// ---------------------------------------------------------------------------
runTest('5. Calcul du CA net après prise en compte des remises', () => {
  const campaign = { id: 'camp-5' };
  const sales = [
    {
      id: 'sale-1',
      totalAmount: 50000,
      discountAmount: 5000, // Remise accordée
      netAmount: 45000,
      paymentStatus: 'paid',
      items: [{ quantity: 5, unitPrice: 10000, unitCost: 4000, totalCost: 20000 }],
    },
  ];

  const fin = calculateLotFinancials(campaign, [], sales, []);
  assert.strictEqual(fin.salesSummary.grossSalesAmount, 50000);
  assert.strictEqual(fin.salesSummary.totalDiscountAmount, 5000);
  assert.strictEqual(fin.salesSummary.netTurnover, 45000, 'Le CA net doit être 45 000 FCFA après remise');
});

// ---------------------------------------------------------------------------
// TEST 6: Commandes en attente et commandes annulées (Exclusion stricte du CA encaissé)
// ---------------------------------------------------------------------------
runTest('6. Exclusion des commandes annulées et séparation créances clients des commandes en attente', () => {
  const campaign = { id: 'camp-6', totalLandedCost: 100000 };
  const sales = [
    { id: 's-paid', totalAmount: 30000, discountAmount: 0, netAmount: 30000, paymentStatus: 'paid', paymentMethod: 'cash', items: [] },
    { id: 's-cancelled', totalAmount: 20000, discountAmount: 0, netAmount: 20000, paymentStatus: 'cancelled', paymentMethod: 'cash', items: [] },
    { id: 's-pending', totalAmount: 15000, discountAmount: 0, netAmount: 15000, paymentStatus: 'pending', paymentMethod: 'credit', amountPaid: 0, amountDue: 15000, items: [] },
  ];

  const fin = calculateLotFinancials(campaign, [], sales, []);

  assert.strictEqual(fin.salesSummary.cancelledSalesCount, 1, '1 vente annulée');
  assert.strictEqual(fin.salesSummary.admissibleSalesCount, 2, '2 ventes admissibles (payée + attente)');
  assert.strictEqual(fin.salesSummary.netTurnover, 45000, 'CA admissible = 30 000 + 15 000 (sans la vente annulée de 20 000)');
  assert.strictEqual(fin.salesSummary.cashCollected, 30000, 'Cash réellement encaissé = 30 000 FCFA');
  assert.strictEqual(fin.salesSummary.receivables, 15000, 'Créances clients = 15 000 FCFA');
});

// ---------------------------------------------------------------------------
// TEST 7: Remboursements et retours
// ---------------------------------------------------------------------------
runTest('7. Traitement comptable des remboursements (Zéro impact CA encaissé)', () => {
  const campaign = { id: 'camp-7' };
  const sales = [
    { id: 's-1', totalAmount: 40000, netAmount: 40000, paymentStatus: 'paid', paymentMethod: 'cash', items: [] },
    { id: 's-refunded', totalAmount: 10000, netAmount: 10000, paymentStatus: 'refunded', paymentMethod: 'cash', items: [] },
  ];

  const fin = calculateLotFinancials(campaign, [], sales, []);
  assert.strictEqual(fin.salesSummary.refundedSalesCount, 1);
  assert.strictEqual(fin.salesSummary.refundedAmount, 10000);
  assert.strictEqual(fin.salesSummary.cashCollected, 40000, 'Seule la vente non remboursée est encaissée');
});

// ---------------------------------------------------------------------------
// TEST 8: Calcul du bénéfice réalisé avec imputation dépenses d'exploitation
// ---------------------------------------------------------------------------
runTest('8. Bénéfice net réalisé = CA net - COGS - Variables - Dépenses additionnelles', () => {
  const campaign = { id: 'camp-8', totalLandedCost: 150000 };
  const items = [{ id: 'it-1', quantityRemaining: 15, unitCost: 5000 }];
  const sales = [
    {
      id: 's-1',
      totalAmount: 100000,
      discountAmount: 0,
      netAmount: 100000,
      variableCosts: 8000, // Livraison
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      items: [{ quantity: 10, unitCost: 5000, totalCost: 50000 }],
    },
  ];
  const expenses = [
    { id: 'exp-1', amount: 12000, category: 'pressing' },
  ];

  const fin = calculateLotFinancials(campaign, items, sales, expenses);

  // CA = 100 000
  // COGS = 50 000
  // Marge brute = 50 000
  // Marge variable = 50 000 - 8 000 = 42 000
  // Bénéfice net = 42 000 - 12 000 = 30 000
  assert.strictEqual(fin.grossProfit, 50000);
  assert.strictEqual(fin.variableMargin, 42000);
  assert.strictEqual(fin.realizedNetProfit, 30000, 'Bénéfice net réalisé doit être 30 000 FCFA');
});

// ---------------------------------------------------------------------------
// TEST 9: Prévention formelle des doubles comptabilisations
// ---------------------------------------------------------------------------
runTest('9. Non double-comptage: Frais d\'approche dans le lot vs dépenses d\'exploitation', () => {
  const campaign = {
    id: 'camp-9',
    purchasePriceXaf: 100000,
    transportCost: 20000, // Déjà dans le coût de revient !
    customsCost: 10000,    // Déjà dans le coût de revient !
    totalLandedCost: 130000,
  };
  const items = [{ id: 'it-1', quantityReceived: 10, unitCost: 13000, quantitySold: 2, quantityRemaining: 8 }];
  const sales = [
    {
      id: 's-1',
      totalAmount: 40000,
      netAmount: 40000,
      variableCosts: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      items: [{ quantity: 2, unitCost: 13000, totalCost: 26000 }],
    },
  ];
  // Dépense externe postérieure (pub)
  const expenses = [{ id: 'exp-1', amount: 5000, category: 'publicité', isAcquisition: true }];

  const fin = calculateLotFinancials(campaign, items, sales, expenses);

  // Le COGS (26 000) inclut déjà le prorata du fret et de la douane.
  // Les 30 000 FCFA de fret/douane d'approche ne doivent PAS être redéduits dans expenses !
  assert.strictEqual(fin.additionalExpenses.totalAdditionalExpenses, 5000, 'Seule la dépense de pub est dans additionalExpenses');
  assert.strictEqual(fin.realizedNetProfit, 40000 - 26000 - 5000, 'Bénéfice net = 9 000 FCFA');
});

// ---------------------------------------------------------------------------
// TEST 10: Récupération du capital basée sur le cash net encaissé
// ---------------------------------------------------------------------------
runTest('10. Taux de couverture de l\'investissement par les encaissements réels (Exclusion des créances)', () => {
  const campaign = { id: 'camp-10', totalLandedCost: 200000 };
  const sales = [
    // 100 000 encaissés en cash
    { id: 's-1', totalAmount: 100000, netAmount: 100000, variableCosts: 0, paymentStatus: 'paid', paymentMethod: 'cash', amountPaid: 100000, amountDue: 0, items: [] },
    // 50 000 vendus à crédit (NON encore encaissés)
    { id: 's-2', totalAmount: 50000, netAmount: 50000, variableCosts: 0, paymentStatus: 'pending', paymentMethod: 'credit', amountPaid: 0, amountDue: 50000, items: [] },
  ];

  const fin = calculateLotFinancials(campaign, [], sales, []);

  // Net cash inflow = 100 000 (les 50 000 à crédit sont exclus du cash récupéré !)
  assert.strictEqual(fin.capitalRecovery.netCashInflow, 100000);
  assert.strictEqual(fin.capitalRecovery.capitalRemainingToRecover, 100000, 'Reste 100 000 FCFA à récupérer');
  assert.strictEqual(fin.capitalRecovery.capitalRecoveryRate, 50, 'Taux de récupération = 50% (et non 75% !)');
  assert.strictEqual(fin.capitalRecovery.isCapitalFullyRecovered, false);
});

// ---------------------------------------------------------------------------
// TEST 11: Lots sans aucune vente
// ---------------------------------------------------------------------------
runTest('11. Lot sans vente: Pas de division par zéro, indicateurs sains', () => {
  const campaign = { id: 'camp-11', totalLandedCost: 150000, createdAt: '2026-10-20T08:00:00.000Z' };
  const items = [{ id: 'it-1', quantityReceived: 30, quantitySold: 0, quantityRemaining: 30, unitCost: 5000, estimatedSellingPrice: 10000 }];

  const fin = calculateLotFinancials(campaign, items, [], []);

  assert.strictEqual(fin.salesSummary.netTurnover, 0);
  assert.strictEqual(fin.cogs.totalCostOfGoodsSold, 0);
  assert.strictEqual(fin.realizedNetProfit, 0);
  assert.strictEqual(fin.capitalRecovery.capitalRecoveryRate, 0);
  assert.strictEqual(fin.capitalRecovery.capitalRemainingToRecover, 150000);
  assert.strictEqual(fin.stockValuation.remainingStockCostValue, 150000);
  assert.strictEqual(fin.stockValuation.remainingStockMarketValue, 300000);
});

// ---------------------------------------------------------------------------
// TEST 12: Lots partiellement vendus
// ---------------------------------------------------------------------------
runTest('12. Lot partiellement vendu avec répartition cohérente du capital', () => {
  const campaign = { id: 'camp-12', totalLandedCost: 100000 };
  const items = [{ id: 'it-1', quantityReceived: 20, quantitySold: 5, quantityRemaining: 15, unitCost: 5000, estimatedSellingPrice: 8000 }];
  const sales = [{
    id: 's-1',
    totalAmount: 40000,
    netAmount: 40000,
    variableCosts: 0,
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    items: [{ quantity: 5, unitCost: 5000, totalCost: 25000 }],
  }];

  const fin = calculateLotFinancials(campaign, items, sales, []);
  assert.strictEqual(fin.cogs.totalCostOfGoodsSold, 25000);
  assert.strictEqual(fin.grossProfit, 15000);
  assert.strictEqual(fin.capitalRecovery.capitalRecoveryRate, 40);
  assert.strictEqual(fin.stockValuation.remainingStockCostValue, 75000);
});

// ---------------------------------------------------------------------------
// TEST 13: Lots déficitaires (Marge négative) et déclenchement d'alerte
// ---------------------------------------------------------------------------
runTest('13. Lot déficitaire: Détection marge négative et alerte objective documentée', () => {
  const campaign = { id: 'camp-13', totalLandedCost: 100000 };
  const items = [{ id: 'it-1', quantityReceived: 20, quantitySold: 6, quantityRemaining: 14, unitCost: 5000, estimatedSellingPrice: 4000 }];
  // Vente de 6 unités à 4000 FCFA (coût 5000 FCFA) -> perte de 1000 FCFA / unité
  const sales = [
    {
      id: 's-1',
      totalAmount: 24000,
      netAmount: 24000,
      variableCosts: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      items: [{ quantity: 6, unitCost: 5000, totalCost: 30000 }],
    },
  ];

  const fin = calculateLotFinancials(campaign, items, sales, []);
  assert.strictEqual(fin.grossProfit, -6000, 'Perte brute de -6 000 FCFA');
  assert.strictEqual(fin.realizedNetProfit, -6000, 'Bénéfice net négatif');

  const negAlert = fin.alerts.find(a => a.code === 'MARGE_NEGATIVE');
  assert.ok(negAlert, 'Une alerte MARGE_NEGATIVE doit être déclenchée');
  assert.strictEqual(negAlert.severity, 'CRITIQUE');
  assert.ok(negAlert.recommendation.length > 10, 'Recommandation documentée');
});

// ---------------------------------------------------------------------------
// TEST 14: Agrégation consolidée de plusieurs campagnes (Sans moyenner les %)
// ---------------------------------------------------------------------------
runTest('14. Consolidation globale de plusieurs campagnes recalculée depuis les données sources', () => {
  const campA = { id: 'c-a', totalLandedCost: 100000, status: 'active' };
  const salesA = [{ totalAmount: 80000, netAmount: 80000, variableCosts: 0, paymentStatus: 'paid', paymentMethod: 'cash', items: [{ quantity: 8, unitCost: 5000, totalCost: 40000 }] }];

  const campB = { id: 'c-b', totalLandedCost: 300000, status: 'active' };
  const salesB = [{ totalAmount: 60000, netAmount: 60000, variableCosts: 0, paymentStatus: 'paid', paymentMethod: 'cash', items: [{ quantity: 6, unitCost: 10000, totalCost: 60000 }] }];

  const consolidated = consolidateLotsOverview([
    { campaign: campA, items: [{ quantityRemaining: 12, unitCost: 5000, estimatedSellingPrice: 10000 }], sales: salesA, expenses: [] },
    { campaign: campB, items: [{ quantityRemaining: 24, unitCost: 10000, estimatedSellingPrice: 15000 }], sales: salesB, expenses: [] },
  ]);

  // Total investi = 100 000 + 300 000 = 400 000 FCFA
  assert.strictEqual(consolidated.summary.totalInvested, 400000);
  // Total CA = 80 000 + 60 000 = 140 000 FCFA
  assert.strictEqual(consolidated.summary.totalRevenue, 140000);
  // Cash inflow = 140 000 FCFA
  // Taux de couverture global = (140 000 / 400 000) * 100 = 35%
  // (Si on avait moyenné les taux de campA (80%) et campB (20%), on aurait eu 50%, ce qui est faux !)
  assert.strictEqual(consolidated.summary.globalRecoveryRate, 35, 'Taux global strictement recalculé à 35%');
  assert.strictEqual(consolidated.summary.totalRealizedProfit, 40000, 'Bénéfice cumulé = 40 000 + 0 = 40 000 FCFA');
});

// ---------------------------------------------------------------------------
// TEST 15: Isolation des données et étanchéité des campagnes
// ---------------------------------------------------------------------------
runTest('15. Étanchéité stricte: Les ventes d\'un lot ne modifient en rien les finances d\'un autre', () => {
  const camp1 = { id: 'camp-isolated-1', totalLandedCost: 50000 };
  const camp2 = { id: 'camp-isolated-2', totalLandedCost: 80000 };

  const fin1 = calculateLotFinancials(camp1, [], [{ totalAmount: 50000, netAmount: 50000, paymentStatus: 'paid', paymentMethod: 'cash', items: [] }], []);
  const fin2 = calculateLotFinancials(camp2, [], [], []);

  assert.strictEqual(fin1.capitalRecovery.capitalRecoveryRate, 100);
  assert.strictEqual(fin2.capitalRecovery.capitalRecoveryRate, 0, 'Campagne 2 reste à 0%');
});

// ---------------------------------------------------------------------------
// TEST 16: Horodatage et persistance d'épuisement
// ---------------------------------------------------------------------------
runTest('16. Horodatage exact de création et calcul précis de la date d\'épuisement', () => {
  const campaign = {
    id: 'camp-16',
    createdAt: '2026-10-01T12:00:00.000Z',
    depletedAt: '2026-10-10T15:30:00.000Z',
  };

  const items = [
    { id: 'it-1', quantityReceived: 50, quantitySold: 50, quantityRemaining: 0 },
  ];

  const stats = calculateDepletionStats(campaign, items, []);
  assert.strictEqual(stats.isDepleted, true);
  assert.strictEqual(stats.totalDurationDays, 9);
  assert.ok(stats.durationLabel.includes('9 jours'));
});

// ---------------------------------------------------------------------------
// TEST 17: Déclenchement d'alerte de stock dormant avec durée d'observation suffisante
// ---------------------------------------------------------------------------
runTest('17. Alerte stock dormant: Déclenchée uniquement si durée >= 21 jours et ventes < 15%', () => {
  // Lot récent (3 jours) avec peu de ventes -> NE DOIT PAS déclencher d'alerte intempestive !
  const recentCamp = {
    id: 'camp-recent',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    totalLandedCost: 100000,
  };
  const recentItems = [{ quantityReceived: 50, quantitySold: 2, quantityRemaining: 48, unitCost: 2000 }];
  const recentFin = calculateLotFinancials(recentCamp, recentItems, [], []);
  assert.strictEqual(recentFin.alerts.filter(a => a.code === 'STOCK_DORMANT').length, 0, 'Pas d\'alerte intempestive sur lot récent');

  // Lot ancien (25 jours) avec ventes trop faibles (2 sur 50 = 4% < 15%) -> DOIT déclencher l'alerte
  const dormantCamp = {
    id: 'camp-dormant',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    totalLandedCost: 100000,
  };
  const dormantItems = [{ quantityReceived: 50, quantitySold: 2, quantityRemaining: 48, unitCost: 2000 }];
  const dormantFin = calculateLotFinancials(dormantCamp, dormantItems, [], []);
  const dormantAlert = dormantFin.alerts.find(a => a.code === 'STOCK_DORMANT');
  assert.ok(dormantAlert, 'Alerte STOCK_DORMANT déclenchée avec critères vérifiés');
});

console.log('\n===============================================================');
console.log(`RÉSULTAT: ${testsPassed} / ${testsTotal} TESTS RÉUSSIS AVEC SUCCÈS (100%)`);
console.log('TOUS LES CRITÈRES D\'AUDIT ET DE CALCUL FINANCIER SONT VALIDES');
console.log('===============================================================');
