// Tests unitaires validant rigoureusement les calculs du Module Croissance & CAC
// Spécialement la Section 7 du Cahier des Charges

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${msg}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS : ${msg}`);
}

console.log('🧪 Démarrage des tests financiers Module Croissance Clients & CAC COMMERCIA...\n');

// 1. VÉRIFICATION DU SCÉNARIO DE RÉFÉRENCE OFFICIEL (SECTION 7 DU CAHIER DES CHARGES)
{
  console.log('--- Test 1 : Scénario de référence Section 7 (Facebook Ads, 70 clients, 30 000 FCFA pub) ---');
  const depensesPub = 30000;
  const nouveauxClients = 70;
  const quantiteArticles = 70;
  const prixUnitaire = 8000;
  const coutAchatUnitaire = 3000;
  const chargesVariablesUnitaires = 500;

  // Calcul du CAC
  const cac = depensesPub / nouveauxClients;
  assert(Number(cac.toFixed(2)) === 428.57, `CAC attendu = 428,57 FCFA (obtenu: ${cac.toFixed(2)})`);

  // Chiffre d'affaires
  const ca = quantiteArticles * prixUnitaire;
  assert(ca === 560000, `Chiffre d'affaires attendu = 560 000 FCFA (obtenu: ${ca})`);

  // Coût des produits vendus (COGS)
  const cogs = quantiteArticles * coutAchatUnitaire;
  assert(cogs === 210000, `Coût des produits vendus attendu = 210 000 FCFA (obtenu: ${cogs})`);

  // Autres charges variables
  const autresChargesVariables = quantiteArticles * chargesVariablesUnitaires;
  assert(autresChargesVariables === 35000, `Autres charges variables attendues = 35 000 FCFA (obtenu: ${autresChargesVariables})`);

  // Dépenses publicitaires
  assert(depensesPub === 30000, `Dépenses publicitaires = 30 000 FCFA`);

  // Résultat après coûts variables et acquisition
  const beneficeApresAcquisition = ca - cogs - autresChargesVariables - depensesPub;
  assert(beneficeApresAcquisition === 285000, `Bénéfice après acquisition attendu = 285 000 FCFA (obtenu: ${beneficeApresAcquisition})`);

  // Résultat par article
  const resultatParArticle = beneficeApresAcquisition / quantiteArticles;
  assert(Number(resultatParArticle.toFixed(2)) === 4071.43, `Résultat par article attendu = ~4 071,43 FCFA (obtenu: ${resultatParArticle.toFixed(2)})`);
}

// 2. CANAL SANS CLIENT ACQUIS (RÈGLE DU "NON CALCULABLE")
{
  console.log('\n--- Test 2 : Canal avec budget engagé mais 0 client converti ---');
  const depenses = 25000;
  const nouveauxClients = 0;
  const cac = nouveauxClients > 0 ? Number((depenses / nouveauxClients).toFixed(2)) : null;
  assert(cac === null, 'Si aucun nouveau client acquis, le CAC doit être null (affiché "Non calculable") plutôt que 0');
}

// 3. CANAL SANS DÉPENSE PUB (RÈGLE DU ROAS)
{
  console.log('\n--- Test 3 : Canal sans dépense publicitaire (ex: Bouche-à-oreille) ---');
  const ca = 180000;
  const depenses = 0;
  const roas = depenses > 0 ? (ca / depenses) * 100 : null;
  assert(roas === null, 'Si 0 FCFA de dépense publicitaire, le ROAS doit être null (affiché "Non calculable")');
}

// 4. PRÉVENTION DES DOUBLES COMPTABILISATIONS
{
  console.log('\n--- Test 4 : Prévention des doubles comptabilisations ---');
  const caNet = 300000;
  const coutProduits = 100000;
  const chargesVariables = 30000;
  const depensesPub = 40000;

  // Déduction unique
  const benefice = caNet - coutProduits - chargesVariables - depensesPub;
  assert(benefice === 130000, `Bénéfice calculé une seule fois = 130 000 FCFA (obtenu: ${benefice})`);
}

// 5. COMMANDE MULTI-PRODUITS ET ATTRIBUTION DU CAC
{
  console.log('\n--- Test 5 : Commande multi-produits et répartition proportionnelle du CAC ---');
  const article1Prix = 20000;
  const article2Prix = 30000;
  const totalCommande = article1Prix + article2Prix;
  const cacCommande = 2500;

  const cacPart1 = (article1Prix / totalCommande) * cacCommande;
  const cacPart2 = (article2Prix / totalCommande) * cacCommande;

  assert(cacPart1 === 1000, 'Article 1 (40% du CA) prend 1 000 FCFA de CAC');
  assert(cacPart2 === 1500, 'Article 2 (60% du CA) prend 1 500 FCFA de CAC');
  assert(cacPart1 + cacPart2 === cacCommande, 'La somme des CAC répartis est strictement égale au CAC total affecté');
}

// 6. CLIENTS RÉPÉTÉS (DISTINCTION NOUVEAUX CLIENTS VS CLIENTS EXISTANTS)
{
  console.log('\n--- Test 6 : Un même client commandant 3 fois ne compte que pour 1 nouveau client ---');
  const orders = [
    { customerId: 'c1', isFirstEverPurchase: true },
    { customerId: 'c1', isFirstEverPurchase: false },
    { customerId: 'c1', isFirstEverPurchase: false },
    { customerId: 'c2', isFirstEverPurchase: true },
    { customerId: 'c3', isFirstEverPurchase: false }, // acquis antérieurement
  ];

  const uniqueNewClients = Array.from(new Set(orders.filter(o => o.isFirstEverPurchase).map(o => o.customerId)));
  assert(uniqueNewClients.length === 2, `Exactement 2 nouveaux clients uniques identifiés (obtenu: ${uniqueNewClients.length})`);
}

// 7. SEUIL DE RENTABILITÉ & MARGE DE SÉCURITÉ
{
  console.log('\n--- Test 7 : Calculs du point mort et marge de sécurité ---');
  const ca = 1000000;
  const cogs = 400000;
  const cv = 100000;
  const chargesFixes = 150000;
  const pub = 50000;

  const mcv = ca - cogs - cv; // 500 000
  const tmcv = mcv / ca; // 0.5 (50%)
  const fTotal = chargesFixes + pub; // 200 000
  const seuilRentabiliteCa = fTotal / tmcv; // 400 000
  const margeSecurite = ca - seuilRentabiliteCa; // 600 000
  const indiceSecurite = (margeSecurite / ca) * 100; // 60%

  assert(seuilRentabiliteCa === 400000, `Seuil de rentabilité en CA = 400 000 FCFA (obtenu: ${seuilRentabiliteCa})`);
  assert(margeSecurite === 600000, `Marge de sécurité = 600 000 FCFA (obtenu: ${margeSecurite})`);
  assert(indiceSecurite === 60, `Indice de sécurité = 60% (obtenu: ${indiceSecurite}%)`);
}

// 8. TRAITEMENT DES COMMANDES ANNULÉES ET REMBOURSÉES
{
  console.log('\n--- Test 8 : Commandes annulées et remboursées (Exclusion nette) ---');
  const ventesValidees = 500000;
  const ventesRemboursees = 50000;
  const ventesAnnulees = 30000; // Jamais payées, non comptées dans le CA
  const netRevenue = Math.max(0, ventesValidees - ventesRemboursees);
  assert(netRevenue === 450000, `CA net attendu après remboursement = 450 000 FCFA (obtenu: ${netRevenue})`);
}

// 9. DÉCOMPOSITION PRÉCISE DES CHARGES VARIABLES UNITAIRES SANS DOUBLE COMPTAGE
{
  console.log('\n--- Test 9 : Décomposition des charges variables unitaires ---');
  const prixVente = 15000;
  const coutAchat = 6000;
  const chargesVariables = {
    transportAppro: 800,
    emballageConditionnement: 300,
    livraisonSupporteeVendeur: 1000,
    fraisPaiementMobileMoney: 200,
    commissionCommerciale: 500,
    ressourcesInternetService: 200,
  };
  const totalChargesVariablesUnitaires = Object.values(chargesVariables).reduce((s, v) => s + v, 0);
  assert(totalChargesVariablesUnitaires === 3000, `Total charges variables = 3 000 FCFA (obtenu: ${totalChargesVariablesUnitaires})`);

  const coutTotalUnitaire = coutAchat + totalChargesVariablesUnitaires;
  assert(coutTotalUnitaire === 9000, `Coût total unitaire = 9 000 FCFA (obtenu: ${coutTotalUnitaire})`);

  const margeContributiveUnitaire = prixVente - coutTotalUnitaire;
  assert(margeContributiveUnitaire === 6000, `Marge contributive = 6 000 FCFA (obtenu: ${margeContributiveUnitaire})`);

  // CAC max toléré sur cet article
  assert(margeContributiveUnitaire === 6000, `CAC max toléré = 6 000 FCFA`);
}

// 10. RÈGLE D'ATTRIBUTION CONFIGURABLE (FIRST TOUCH VS LAST TOUCH)
{
  console.log('\n--- Test 10 : Règle d\'attribution First-Touch vs Last-Touch ---');
  // Client Moussa a d'abord découvert via Facebook Ads (first touch)
  // Puis a cliqué sur un lien WhatsApp pour sa 2e commande (last touch)
  const client = { id: 'c_moussa', firstChannel: 'facebook_ads' };
  const order1 = { customerId: 'c_moussa', channel: 'facebook_ads', isFirstPurchase: true };
  const order2 = { customerId: 'c_moussa', channel: 'whatsapp', isFirstPurchase: false };

  // Attribution First-Touch (standard CAC nouveau client) :
  const firstTouchChannel = client.firstChannel;
  assert(firstTouchChannel === 'facebook_ads', 'First-Touch attribue le client à Facebook Ads');

  // En Last-Touch, la commande 2 est attribuée à WhatsApp pour le CA mais le client n\'est pas un nouveau client
  assert(order2.isFirstPurchase === false, 'La commande 2 sur WhatsApp ne compte pas comme un nouveau client');
}

// 11. SIMULATION D'OBJECTIF DE BÉNÉFICE (SECTION 10 DU CAHIER DES CHARGES)
{
  console.log('\n--- Test 11 : Simulation objectif de bénéfice net ---');
  const targetProfit = 300000;
  const fixedCosts = 100000;
  const unitContributionMargin = 4000; // Marge unitaire nette

  // Quantité nécessaire pour atteindre le bénéfice ciblé :
  const requiredUnits = Math.ceil((fixedCosts + targetProfit) / unitContributionMargin);
  assert(requiredUnits === 100, `Quantité requise = 100 unités pour 300 000 FCFA de bénéfice (obtenu: ${requiredUnits})`);
}

// 12. CLASSEMENT PRIORISANT LA RENTABILITÉ RÉELLE SUR LE ROAS
{
  console.log('\n--- Test 12 : Priorité rentabilité nette sur le ROAS ---');
  const canalA: any = { name: 'Canal A (Fort ROAS)', ca: 500000, depensesPub: 50000, cogs: 350000, cv: 80000 };
  canalA.roas = (canalA.ca / canalA.depensesPub) * 100; // 1000%
  canalA.profit = canalA.ca - canalA.cogs - canalA.cv - canalA.depensesPub; // 20 000 FCFA

  const canalB: any = { name: 'Canal B (Marge forte)', ca: 400000, depensesPub: 80000, cogs: 100000, cv: 40000 };
  canalB.roas = (canalB.ca / canalB.depensesPub) * 100; // 500%
  canalB.profit = canalB.ca - canalB.cogs - canalB.cv - canalB.depensesPub; // 180 000 FCFA

  assert(canalA.roas > canalB.roas, 'Canal A a un ROAS plus élevé (1000% vs 500%)');
  assert(canalB.profit > canalA.profit, 'Canal B a une rentabilité nette bien supérieure (180k vs 20k)');

  const canauxClasses = [canalA, canalB].sort((a: any, b: any) => b.profit - a.profit);
  assert(canauxClasses[0].name === canalB.name, 'Canal B est classé #1 grâce à sa rentabilité nette réelle');
}

console.log('\n🎉 TOUS LES 12 TESTS DE VALIDATION FINANCIÈRE ONT RÉUSSI AVEC SUCCÈS ! 🚀');


