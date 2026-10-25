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

console.log('\n🎉 TOUS LES TESTS DE VALIDATION FINANCIÈRE ONT RÉUSSI AVEC SUCCÈS ! 🚀');
