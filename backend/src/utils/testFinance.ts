import { calculateFinancialMetrics } from './finance';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${msg}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS : ${msg}`);
}

console.log('🧪 Lancement des tests unitaires financiers COMMERCIA...\n');

// Scénario 1 : Vente en espèces avec marge et charge d'exploitation
{
  const result = calculateFinancialMetrics({
    sales: [
      {
        totalAmount: 10000,
        paymentMethod: 'cash',
        items: [{ quantity: 2, unitPrice: 5000, costPrice: 3000 }],
      },
    ],
    expenses: [
      { amount: 1500, category: 'Transport & Moto-taxi' },
    ],
  });

  assert(result.revenue === 10000, 'Scénario 1 - Chiffre d\'affaires = 10 000 FCFA');
  assert(result.cashCollected === 10000, 'Scénario 1 - Encaissements réels = 10 000 FCFA');
  assert(result.cogs === 6000, 'Scénario 1 - Coût des marchandises vendues = 6 000 FCFA');
  assert(result.grossProfit === 4000, 'Scénario 1 - Marge brute = 4 000 FCFA');
  assert(result.operatingExpenses === 1500, 'Scénario 1 - Frais de fonctionnement = 1 500 FCFA');
  assert(result.estimatedNetProfit === 2500, 'Scénario 1 - Bénéfice net estimé = 2 500 FCFA');
  assert(result.netCashFlow === 8500, 'Scénario 1 - Flux de trésorerie net = 8 500 FCFA');
}

// Scénario 2 : Vente à crédit (Aucun encaissement, prévention de l'illusion de cash)
{
  const result = calculateFinancialMetrics({
    sales: [
      {
        totalAmount: 25000,
        paymentMethod: 'credit',
        items: [{ quantity: 1, unitPrice: 25000, costPrice: 15000 }],
      },
    ],
    expenses: [],
  });

  assert(result.revenue === 25000, 'Scénario 2 - Chiffre d\'affaires = 25 000 FCFA');
  assert(result.creditSales === 25000, 'Scénario 2 - Ventes à crédit = 25 000 FCFA');
  assert(result.cashCollected === 0, 'Scénario 2 - Encaissement cash = 0 FCFA (Pas de faux cash !)');
  assert(result.netCashFlow === 0, 'Scénario 2 - Trésorerie disponible inchangée = 0 FCFA');
  assert(result.estimatedNetProfit === 10000, 'Scénario 2 - Bénéfice comptable généré = 10 000 FCFA');
}

// Scénario 3 : Achat de stock (Ne doit pas fausser le bénéfice d'exploitation, mais impacter la caisse)
{
  const result = calculateFinancialMetrics({
    sales: [],
    expenses: [
      { amount: 150000, category: 'Marchandise & Ravitaillement', description: 'Achat 5 sacs de riz' },
    ],
  });

  assert(result.inventoryExpenses === 150000, 'Scénario 3 - Investissement stock = 150 000 FCFA');
  assert(result.operatingExpenses === 0, 'Scénario 3 - Charges d\'exploitation = 0 FCFA (Le stock est un actif)');
  assert(result.netCashFlow === -150000, 'Scénario 3 - Sortie de trésorerie = -150 000 FCFA');
}

// Scénario 4 : Prélèvement personnel du commerçant
{
  const result = calculateFinancialMetrics({
    sales: [{ totalAmount: 50000, paymentMethod: 'cash', items: [] }],
    expenses: [
      { amount: 10000, category: 'Autre', description: 'Ration maison pour la famille (prélèvement personnel)' },
      { amount: 5000, category: 'Électricité & Eau' },
    ],
  });

  assert(result.personalWithdrawals === 10000, 'Scénario 4 - Prélèvement personnel identifié = 10 000 FCFA');
  assert(result.operatingExpenses === 5000, 'Scénario 4 - Seule la charge d\'exploitation professionnelle est déduite');
  assert(result.netCashFlow === 35000, 'Scénario 4 - Trésorerie finale = 50 000 - 15 000 = 35 000 FCFA');
}

// Scénario 5 : Remboursement d'une ancienne créance client
{
  const result = calculateFinancialMetrics({
    sales: [],
    expenses: [],
    customerPayments: [{ amount: 12000 }],
  });

  assert(result.cashCollected === 12000, 'Scénario 5 - Encaissement de créance = 12 000 FCFA');
  assert(result.revenue === 0, 'Scénario 5 - Pas de double comptage de CA lors du remboursement');
  assert(result.netCashFlow === 12000, 'Scénario 5 - Entrée réelle en trésorerie = 12 000 FCFA');
}

console.log('\n🎉 TOUS LES TESTS FINANCIERS SONT VALIDÉS AVEC SUCCÈS !');
