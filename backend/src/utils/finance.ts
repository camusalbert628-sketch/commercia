// COMMERCIA Core Financial Calculation Engine
// Single Source of Truth for Financial Metrics & Multi-tenancy Business Rules

export interface SaleItemData {
  name?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
}

export interface SaleData {
  id?: string;
  totalAmount: number;
  paidAmount?: number;
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer' | 'credit' | string;
  items?: SaleItemData[];
}

export interface ExpenseData {
  id?: string;
  amount: number;
  category: string;
  description?: string | null;
}

export interface CustomerPaymentData {
  id?: string;
  amount: number;
}

export interface FinancialMetrics {
  revenue: number;              // Chiffre d'affaires brut (ventes facturées)
  cashCollected: number;        // Encaissements réels (ventes cash/momo + recouvrement dettes)
  creditSales: number;          // Ventes à crédit du jour
  cogs: number;                 // Coût des marchandises vendues (COGS)
  grossProfit: number;          // Marge brute = Chiffre d'affaires - COGS
  grossMarginPercent: number;   // Taux de marge brute (%)
  operatingExpenses: number;    // Dépenses de fonctionnement (loyer, transport, salaires...)
  inventoryExpenses: number;    // Achats de marchandise (trésorerie sortie pour stock)
  personalWithdrawals: number;  // Prélèvements personnels (argent retiré par le patron)
  personalDeposits: number;     // Apports personnels dans l'activité
  estimatedNetProfit: number;   // Bénéfice net d'exploitation = Marge brute - Dépenses fonctionnement
  netCashFlow: number;          // Variation nette de trésorerie disponible (Cash In - Cash Out)
  whyExplanation: string;       // Explication pédagogique en français accessible
}

/**
 * Catégories de dépenses considérées comme de l'achat de marchandise / stock
 */
export const INVENTORY_CATEGORY_KEYWORDS = [
  'marchandise',
  'ravitaillement',
  'stock',
  'achat produit',
  'matière première',
];

/**
 * Catégories identifiées comme retraits personnels de l'entrepreneur
 */
export const PERSONAL_WITHDRAWAL_KEYWORDS = [
  'prélèvement',
  'retrait personnel',
  'ration',
  'maison',
  'famille',
  'dépense personnelle',
];

export function isInventoryExpense(category: string, description?: string | null): boolean {
  const text = `${category || ''} ${description || ''}`.toLowerCase();
  return INVENTORY_CATEGORY_KEYWORDS.some(kw => text.includes(kw));
}

export function isPersonalWithdrawal(category: string, description?: string | null): boolean {
  const text = `${category || ''} ${description || ''}`.toLowerCase();
  return PERSONAL_WITHDRAWAL_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * Calcule l'intégralité des métriques financières rigoureuses selon les règles OHADA / micro-entreprises
 */
export function calculateFinancialMetrics(params: {
  sales: SaleData[];
  expenses: ExpenseData[];
  customerPayments?: CustomerPaymentData[];
}): FinancialMetrics {
  const { sales, expenses, customerPayments = [] } = params;

  // 1. Chiffre d'affaires et détail des ventes
  let revenue = 0;
  let immediateCashCollected = 0;
  let creditSales = 0;
  let cogs = 0;

  for (const s of sales) {
    const saleTotal = Number(s.totalAmount) || 0;
    revenue += saleTotal;

    // Gestion rigoureuse des encaissements vs créances :
    // Si paidAmount est spécifié (acompte, paiement partiel, vente à crédit avec apport),
    // l'encaissement réel immédiat est le montant effectivement payé (plafonné au total).
    // Le solde non encaissé constitue la créance client générée.
    if (s.paidAmount !== undefined && s.paidAmount !== null) {
      const paid = Math.max(0, Math.min(Number(s.paidAmount), saleTotal));
      const unpaid = Math.max(0, saleTotal - paid);
      immediateCashCollected += paid;
      creditSales += unpaid;
    } else if (s.paymentMethod === 'credit') {
      creditSales += saleTotal;
    } else {
      immediateCashCollected += saleTotal;
    }

    // Calcul du coût des marchandises vendues (COGS)
    if (s.items && Array.isArray(s.items)) {
      for (const item of s.items) {
        const qty = Number(item.quantity) || 1;
        const unitCost = Number(item.costPrice) || 0;
        cogs += qty * unitCost;
      }
    }
  }

  // 2. Encaissements supplémentaires (remboursements de crédits clients passés)
  const debtRecovered = customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCashCollected = immediateCashCollected + debtRecovered;

  // 3. Ventilation des dépenses
  let operatingExpenses = 0;
  let inventoryExpenses = 0;
  let personalWithdrawals = 0;
  let personalDeposits = 0;

  for (const e of expenses) {
    const amt = Number(e.amount) || 0;
    if (isPersonalWithdrawal(e.category, e.description)) {
      personalWithdrawals += amt;
    } else if (isInventoryExpense(e.category, e.description)) {
      inventoryExpenses += amt;
    } else {
      operatingExpenses += amt;
    }
  }

  // 4. Marge brute et bénéfice net d'exploitation
  // Si le COGS est connu (prix de revient renseignés) : Marge = Revenue - COGS
  // Si aucun prix de revient n'est saisi (ex: micro-artisan sans stock détaillé),
  // on utilise un fallback prudent où les achats de marchandises sont déduits
  const effectiveCogs = cogs > 0 ? cogs : inventoryExpenses;
  const grossProfit = revenue - effectiveCogs;
  const grossMarginPercent = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
  const estimatedNetProfit = grossProfit - operatingExpenses;

  // 5. Trésorerie nette disponible (Flux financier en cash/MoMo)
  const totalCashOutflow = operatingExpenses + inventoryExpenses + personalWithdrawals;
  const netCashFlow = totalCashCollected + personalDeposits - totalCashOutflow;

  // 6. Explication pédagogique pour l'utilisateur ("Pourquoi ?")
  let whyExplanation = '';
  if (revenue === 0 && totalCashOutflow === 0) {
    whyExplanation = "Aucune transaction enregistrée pour l'instant. Votre solde est prêt pour la journée.";
  } else {
    whyExplanation = `Sur un chiffre d'affaires de ${revenue.toLocaleString('fr-FR')} FCFA, vos marchandises vendues ont coûté ${effectiveCogs.toLocaleString('fr-FR')} FCFA (marge brute : ${grossProfit.toLocaleString('fr-FR')} FCFA). Après déduction de ${operatingExpenses.toLocaleString('fr-FR')} FCFA de frais de fonctionnement, votre bénéfice net estimé est de ${estimatedNetProfit.toLocaleString('fr-FR')} FCFA.`;
    if (creditSales > 0) {
      whyExplanation += ` Attention : ${creditSales.toLocaleString('fr-FR')} FCFA de vos ventes sont à crédit et n'ont pas encore été encaissés.`;
    }
    if (personalWithdrawals > 0) {
      whyExplanation += ` Vous avez également retiré ${personalWithdrawals.toLocaleString('fr-FR')} FCFA pour vos dépenses personnelles.`;
    }
  }

  return {
    revenue,
    cashCollected: totalCashCollected,
    creditSales,
    cogs: effectiveCogs,
    grossProfit,
    grossMarginPercent,
    operatingExpenses,
    inventoryExpenses,
    personalWithdrawals,
    personalDeposits,
    estimatedNetProfit,
    netCashFlow,
    whyExplanation,
  };
}
