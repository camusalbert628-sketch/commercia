export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string | null;
  locale: string;
  currency: string;
  isAdmin: boolean;
  businesses?: BusinessSummary[];
  subscription?: {
    planName: string;
    planDisplayName: string;
    status: string;
    isPro?: boolean;
    endDate?: string | null;
    daysRemaining?: number;
    features: string[];
    limits?: Record<string, any>;
  } | null;
}

export interface BusinessSummary {
  id: string;
  name: string;
  sector: string;
  role: string;
}

export interface Business {
  id: string;
  name: string;
  sector: string;
  trackingMode: string;
  dailySalesEstimate?: string;
  address?: string;
  phone?: string;
  currency: string;
  settings?: {
    enableStock: boolean;
    enableCredits: boolean;
    enableNotifications: boolean;
    lowStockThreshold: number;
  };
}

export interface SaleItem {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  totalPrice?: number;
}

export interface Sale {
  id: string;
  businessId: string;
  customerId?: string;
  customer?: { id: string; name: string; phone?: string };
  totalAmount: number;
  paidAmount: number;
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer' | 'credit';
  status: string;
  notes?: string;
  saleDate: string;
  items: SaleItem[];
}

export interface Expense {
  id: string;
  businessId: string;
  amount: number;
  category: string;
  categoryId?: string;
  expenseCategory?: { name: string; icon?: string };
  description?: string;
  expenseDate: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  totalBought: number;
  totalOwed: number;
  createdAt: string;
  sales?: Sale[];
  debts?: CustomerDebt[];
  payments?: CustomerPayment[];
}

export interface CustomerDebt {
  id: string;
  amount: number;
  description?: string;
  dueDate?: string;
  isPaid: boolean;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  amount: number;
  method: string;
  notes?: string;
  paidAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  purchasePrice?: number; // Prix d'achat direct fournisseur
  logisticsFees?: number; // Frais annexes (transport, douane, manutention, emballage)
  costPrice: number;      // Prix de revient global (Prix d'achat + Frais)
  sellingPrice: number;   // Prix de vente fixé
  quantity: number;
  unit: string;
  lowStockAlert: number;
  isActive: boolean;
}

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  limits: Record<string, any>;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  isRead: boolean;
}

export interface DashboardMetrics {
  revenue?: number;
  sales: number;
  salesCount?: number;
  cashCollected?: number;
  creditSales?: number;
  cogs?: number;
  grossProfit?: number;
  grossMarginPercent?: number;
  operatingExpenses?: number;
  inventoryExpenses?: number;
  personalWithdrawals?: number;
  expenses: number;
  profit: number;
  netCashFlow?: number;
  whyExplanation?: string;
}

export interface DashboardData {
  today: DashboardMetrics;
  week: DashboardMetrics;
  month: DashboardMetrics;
  debt: {
    total: number;
    customerCount: number;
  };
  stockAlertsCount: number;
  recentTransactions: {
    sales: Sale[];
    expenses: Expense[];
  };
  insights: AIInsight[];
}

export interface CashSession {
  id: string;
  businessId: string;
  userId: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  totalCashIn: number;
  totalCashOut: number;
  totalMomoIn: number;
  theoreticalCash: number;
  actualCash?: number;
  actualMomo?: number;
  cashDiscrepancy?: number;
  discrepancyReason?: string;
  notes?: string;
  movements?: CashMovement[];
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'in' | 'out';
  amount: number;
  method: 'cash' | 'mobile_money' | 'bank_transfer' | string;
  category: 'sale' | 'debt_payment' | 'expense' | 'manual_deposit' | 'manual_withdrawal' | string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}


