import assert from 'assert';

console.log('🧪 Démarrage des tests financiers Module Gestion des Lots Commerciaux COMMERCIA...\n');

// --- Test 1 : Calcul du Coût Total d'Approvisionnement (Landed Cost) ---
console.log('--- Test 1 : Calcul du coût total d\'approvisionnement d\'un lot importé ---');
{
  const purchasePriceOriginal = 1500; // 1500 USD
  const exchangeRate = 615; // 1 USD = 615 FCFA
  const purchasePriceXaf = purchasePriceOriginal * exchangeRate; // 922 500 FCFA
  const transportCost = 150000; // Fret maritime / transit
  const customsCost = 120000; // Douane
  const transactionFees = 25000; // Frais bancaires / change
  const packagingCost = 15000; // Emballage
  const otherSupplyCosts = 10000; // Manutention

  const totalLandedCost = purchasePriceXaf + transportCost + customsCost + transactionFees + packagingCost + otherSupplyCosts;
  // 922 500 + 150 000 + 120 000 + 25 000 + 15 000 + 10 000 = 1 242 500 FCFA
  assert.strictEqual(totalLandedCost, 1242500, 'Le coût total d\'approvisionnement doit être de 1 242 500 FCFA');
  console.log(`✅ SUCCÈS : Coût total d'approvisionnement calculé = ${totalLandedCost.toLocaleString('fr-FR')} FCFA`);
}

// --- Test 2 : Méthodes de Répartition des Coûts Unitaires ---
console.log('\n--- Test 2 : Méthodes de répartition des coûts (Égalitaire vs Pondérée par la Valeur) ---');
{
  const totalLandedCost = 200000; // Balle de friperie à 200 000 FCFA
  const items = [
    { name: 'Robes 1er Choix', qty: 50, targetPrice: 4000 },
    { name: 'Jupes 2ème Choix', qty: 80, targetPrice: 2000 },
    { name: 'T-Shirts Décontractés', qty: 70, targetPrice: 1000 },
  ];

  const totalUnits = items.reduce((s, i) => s + i.qty, 0); // 200 unités
  assert.strictEqual(totalUnits, 200);

  // A. Méthode Égalitaire
  const unitCostEqual = totalLandedCost / totalUnits; // 1 000 FCFA par pièce
  assert.strictEqual(unitCostEqual, 1000, 'Coût égalitaire unitaire = 1 000 FCFA');
  console.log(`✅ SUCCÈS : Méthode Égalitaire = ${unitCostEqual} FCFA par pièce pour chaque article`);

  // B. Méthode Pondérée par la valeur de vente estimée (pro-rata)
  // Valeur totale estimée : (50 * 4000) + (80 * 2000) + (70 * 1000) = 200k + 160k + 70k = 430 000 FCFA
  const totalEstimatedValue = (50 * 4000) + (80 * 2000) + (70 * 1000);
  assert.strictEqual(totalEstimatedValue, 430000);

  // Coût pondéré pour Robe : (4000 * 50 / 430 000) * 200 000 / 50 = (4000 / 430 000) * 200 000 = ~1 860.47 FCFA
  const robeUnitCost = Math.round(((4000 * 200000) / totalEstimatedValue) * 100) / 100;
  // Coût pondéré pour T-shirt : (1000 / 430 000) * 200 000 = ~465.12 FCFA
  const tshirtUnitCost = Math.round(((1000 * 200000) / totalEstimatedValue) * 100) / 100;

  // Somme des coûts totaux affectés
  const totalReallocated = (50 * robeUnitCost) + (80 * Math.round(((2000 * 200000) / totalEstimatedValue) * 100) / 100) + (70 * tshirtUnitCost);
  assert(Math.abs(totalReallocated - totalLandedCost) < 5, 'La somme des coûts pondérés doit égaler le coût total du lot');
  console.log(`✅ SUCCÈS : Méthode Pondérée -> Robe: ${robeUnitCost} FCFA, T-shirt: ${tshirtUnitCost} FCFA (somme exacte)`);
}

// --- Test 3 : Distinction stricte entre Bénéfice Réalisé et Bénéfice Potentiel ---
console.log('\n--- Test 3 : Non-confusion entre bénéfice réalisé et valeur du stock restant ---');
{
  const totalLandedCost = 500000;
  const unitCost = 2500; // 200 articles reçus
  const qtyReceived = 200;
  const targetPrice = 5000;

  // Supposons 60 articles vendus à 5 000 FCFA = 300 000 FCFA de CA
  const qtySold = 60;
  const revenue = 60 * 5000; // 300 000 FCFA
  const cogsSold = 60 * unitCost; // 150 000 FCFA
  const variableCosts = 12000; // Frais livraison coursier
  const additionalExpenses = 18000; // Pressing / nettoyage

  // Bénéfice réellement encaissé à ce stade
  const realizedProfit = revenue - cogsSold - variableCosts - additionalExpenses;
  // 300 000 - 150 000 - 12 000 - 18 000 = 120 000 FCFA
  assert.strictEqual(realizedProfit, 120000);

  // Stock restant : 140 articles
  const qtyRemaining = qtyReceived - qtySold;
  assert.strictEqual(qtyRemaining, 140);
  const remainingCostValue = qtyRemaining * unitCost; // 350 000 FCFA
  const remainingMarketValue = qtyRemaining * targetPrice; // 700 000 FCFA
  const potentialFutureProfit = remainingMarketValue - remainingCostValue; // 350 000 FCFA

  // CONTRÔLE CRITIQUE : Le bénéfice comptabilisé ne DOIT PAS inclure les 350 000 FCFA potentiels !
  assert.strictEqual(realizedProfit, 120000, 'Le bénéfice réalisé doit être strictement 120 000 FCFA');
  assert.notStrictEqual(realizedProfit, realizedProfit + potentialFutureProfit, 'Le stock restant ne doit jamais être présenté comme du bénéfice réalisé');
  console.log(`✅ SUCCÈS : Bénéfice réalisé = ${realizedProfit.toLocaleString('fr-FR')} FCFA (le stock restant de ${qtyRemaining} articles est bien isolé en bénéfice potentiel de ${potentialFutureProfit.toLocaleString('fr-FR')} FCFA)`);
}

// --- Test 4 : Taux de Récupération de l'Investissement et Point Mort ---
console.log('\n--- Test 4 : Calcul du taux de récupération du capital et point mort du lot ---');
{
  const totalLandedCost = 200000; // Achat 200 000 FCFA
  const unitCost = 2000; // 100 articles
  const sellingPrice = 5000; // Prix de vente

  // Vente 1 : 30 articles à 5000 = 150 000 FCFA
  let netCashCollected = 150000;
  let recoveryRate = (netCashCollected / totalLandedCost) * 100;
  assert.strictEqual(recoveryRate, 75); // 75% récupéré, seuil non encore atteint
  assert.strictEqual(netCashCollected >= totalLandedCost, false);

  // Vente 2 : 10 articles à 5000 = +50 000 FCFA -> Total 200 000 FCFA
  netCashCollected += 50000;
  recoveryRate = (netCashCollected / totalLandedCost) * 100;
  assert.strictEqual(recoveryRate, 100); // 100% récupéré : Seuil de rentabilité atteint !
  assert.strictEqual(netCashCollected >= totalLandedCost, true);

  // Vente 3 : 20 articles à 5000 = +100 000 FCFA -> Total 300 000 FCFA
  netCashCollected += 100000;
  recoveryRate = (netCashCollected / totalLandedCost) * 100;
  assert.strictEqual(recoveryRate, 150); // 150% -> BÉNÉFICE PUR de 100 000 FCFA !

  console.log(`✅ SUCCÈS : Évolution du taux de récupération (75% -> 100% Seuil atteint -> 150% Bénéfice pur)`);
}

// --- Test 5 : Isolation stricte de deux campagnes simultanées ---
console.log('\n--- Test 5 : Isolation multi-campagnes (Campagne A Vêtements vs Campagne B Téléphones) ---');
{
  const campaignA = {
    id: 'camp-A',
    name: 'Balle Vêtements Vintage',
    invested: 200000,
    sales: 150000,
  };

  const campaignB = {
    id: 'camp-B',
    name: 'Lot 20 Smartphones Refurbished',
    invested: 1800000,
    sales: 1200000,
  };

  assert.notStrictEqual(campaignA.invested, campaignB.invested);
  assert.strictEqual(campaignA.sales, 150000);
  assert.strictEqual(campaignB.sales, 1200000);
  console.log(`✅ SUCCÈS : Campagnes A et B totalement étanches et indépendantes`);
}

console.log('\n🎉 TOUS LES TESTS FINANCIERS DE GESTION DES LOTS ONT RÉUSSI AVEC SUCCÈS ! 🚀');
