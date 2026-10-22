export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  locale: string;
  currency: string;
  isAdmin: boolean;
  businesses?: BusinessSummary[];
  subscription?: {
    planName: string;
    planDisplayName: string;
    status: string;
    features: string[];
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
  costPrice: number;
  sellingPrice: number;
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

export interface DashboardData {
  today: {
    sales: number;
    salesCount: number;
    expenses: number;
    profit: number;
  };
  week: {
    sales: number;
    expenses: number;
    profit: number;
  };
  month: {
    sales: number;
    expenses: number;
    profit: number;
  };
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
