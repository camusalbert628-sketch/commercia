// COMMERCIA Core Financial Calculation Engine (Frontend & Offline Mock)
// Single Source of Truth for Financial Metrics & Business Rules

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
  description?: string;
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

export const INVENTORY_CATEGORY_KEYWORDS = [
  'marchandise',
  'ravitaillement',
  'stock',
  'achat produit',
  'matière première',
];

export const PERSONAL_WITHDRAWAL_KEYWORDS = [
  'prélèvement',
  'retrait personnel',
  'ration',
  'maison',
  'famille',
  'dépense personnelle',
];

export function isInventoryExpense(category: string, description?: string): boolean {
  const text = `${category || ''} ${description || ''}`.toLowerCase();
  return INVENTORY_CATEGORY_KEYWORDS.some(kw => text.includes(kw));
}

export function isPersonalWithdrawal(category: string, description?: string): boolean {
  const text = `${category || ''} ${description || ''}`.toLowerCase();
  return PERSONAL_WITHDRAWAL_KEYWORDS.some(kw => text.includes(kw));
}

export function calculateFinancialMetrics(params: {
  sales: SaleData[];
  expenses: ExpenseData[];
  customerPayments?: CustomerPaymentData[];
}): FinancialMetrics {
  const { sales, expenses, customerPayments = [] } = params;

  let revenue = 0;
  let immediateCashCollected = 0;
  let creditSales = 0;
  let cogs = 0;

  for (const s of sales) {
    const saleTotal = Number(s.totalAmount) || 0;
    revenue += saleTotal;

    if (s.paymentMethod === 'credit') {
      creditSales += saleTotal;
    } else {
      immediateCashCollected += saleTotal;
    }

    if (s.items && Array.isArray(s.items)) {
      for (const item of s.items) {
        const qty = Number(item.quantity) || 1;
        const unitCost = Number(item.costPrice) || 0;
        cogs += qty * unitCost;
      }
    }
  }

  const debtRecovered = customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCashCollected = immediateCashCollected + debtRecovered;

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

  const effectiveCogs = cogs > 0 ? cogs : inventoryExpenses;
  const grossProfit = revenue - effectiveCogs;
  const grossMarginPercent = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
  const estimatedNetProfit = grossProfit - operatingExpenses;

  const totalCashOutflow = operatingExpenses + inventoryExpenses + personalWithdrawals;
  const netCashFlow = totalCashCollected + personalDeposits - totalCashOutflow;

  let whyExplanation = '';
  if (revenue === 0 && totalCashOutflow === 0) {
    whyExplanation = "Aucune opération enregistrée pour aujourd'hui. Vos indicateurs sont prêts.";
  } else {
    whyExplanation = `Chiffre d'affaires : ${revenue.toLocaleString('fr-FR')} FCFA. Coût des marchandises vendues : ${effectiveCogs.toLocaleString('fr-FR')} FCFA. Marge brute dégagée : ${grossProfit.toLocaleString('fr-FR')} FCFA (${grossMarginPercent}%). Après déduction de vos charges d'exploitation (${operatingExpenses.toLocaleString('fr-FR')} FCFA), votre bénéfice net estimé est de ${estimatedNetProfit.toLocaleString('fr-FR')} FCFA.`;
    if (creditSales > 0) {
      whyExplanation += ` ⚠️ Remarque : ${creditSales.toLocaleString('fr-FR')} FCFA de ventes sont en attente de paiement (crédits).`;
    }
    if (personalWithdrawals > 0) {
      whyExplanation += ` 💼 Vous avez prélevé ${personalWithdrawals.toLocaleString('fr-FR')} FCFA pour votre usage personnel.`;
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
