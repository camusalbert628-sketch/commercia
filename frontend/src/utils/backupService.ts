// COMMERCIA Data Backup, Export & Storage Migration Service
// Enables 1-click full business backup and restore for retailers

export interface CommerceStatsSummary {
  businessName: string;
  currency: string;
  productsCount: number;
  salesCount: number;
  expensesCount: number;
  customersCount: number;
  cashSessionsCount: number;
  lastBackupDate: string | null;
}

export interface BackupInspectionResult {
  isValid: boolean;
  error?: string;
  businessName?: string;
  currency?: string;
  exportedAt?: string;
  version?: string;
  summary?: {
    products: number;
    sales: number;
    expenses: number;
    customers: number;
  };
}

export interface CommerceBackup {
  version: string;
  appName: string;
  timestamp: string;
  exportedAt: string;
  activeBusiness: any;
  user: any;
  products: any[];
  sales: any[];
  expenses: any[];
  customers: any[];
  cashSessions: any[];
  lotsCampaigns?: any[];
  treasuryAccounts?: any[];
  treasuryMovements?: any[];
  storageDump?: Record<string, any>;
}

export function getCommerceStatsSummary(): CommerceStatsSummary {
  try {
    const userRaw = localStorage.getItem('commercia_user') || localStorage.getItem('rsbizz_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const activeBizId = localStorage.getItem('commercia_active_business_id') || localStorage.getItem('activeBusinessId') || user?.businesses?.[0]?.id || 'default';
    const activeBiz = user?.businesses?.find((b: any) => b.id === activeBizId) || user?.businesses?.[0] || null;

    const products = JSON.parse(
      localStorage.getItem(`commercia_products_${activeBizId}`) ||
      localStorage.getItem('commercia_products') ||
      '[]'
    );
    const sales = JSON.parse(
      localStorage.getItem(`commercia_sales_${activeBizId}`) ||
      localStorage.getItem('commercia_sales') ||
      '[]'
    );
    const expenses = JSON.parse(
      localStorage.getItem(`commercia_expenses_${activeBizId}`) ||
      localStorage.getItem('commercia_expenses') ||
      '[]'
    );
    const customers = JSON.parse(
      localStorage.getItem(`commercia_customers_${activeBizId}`) ||
      localStorage.getItem('commercia_customers') ||
      '[]'
    );
    const cashSessions = JSON.parse(
      localStorage.getItem(`commercia_cash_sessions_${activeBizId}`) ||
      localStorage.getItem('commercia_cash_sessions') ||
      '[]'
    );

    const lastBackupRaw = localStorage.getItem('commercia_last_backup_date');

    return {
      businessName: activeBiz?.name || 'Mon Commerce',
      currency: activeBiz?.currency || 'FCFA',
      productsCount: Array.isArray(products) ? products.length : 0,
      salesCount: Array.isArray(sales) ? sales.length : 0,
      expensesCount: Array.isArray(expenses) ? expenses.length : 0,
      customersCount: Array.isArray(customers) ? customers.length : 0,
      cashSessionsCount: Array.isArray(cashSessions) ? cashSessions.length : 0,
      lastBackupDate: lastBackupRaw ? new Date(lastBackupRaw).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
    };
  } catch {
    return {
      businessName: 'Mon Commerce',
      currency: 'FCFA',
      productsCount: 0,
      salesCount: 0,
      expensesCount: 0,
      customersCount: 0,
      cashSessionsCount: 0,
      lastBackupDate: null,
    };
  }
}

export function exportFullCommerceBackup(): void {
  try {
    const userRaw = localStorage.getItem('commercia_user') || localStorage.getItem('rsbizz_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const activeBizId = localStorage.getItem('commercia_active_business_id') || localStorage.getItem('activeBusinessId') || user?.businesses?.[0]?.id || 'default';
    const activeBiz = user?.businesses?.find((b: any) => b.id === activeBizId) || user?.businesses?.[0] || null;

    const products = JSON.parse(
      localStorage.getItem(`commercia_products_${activeBizId}`) ||
      localStorage.getItem('commercia_products') ||
      '[]'
    );
    const sales = JSON.parse(
      localStorage.getItem(`commercia_sales_${activeBizId}`) ||
      localStorage.getItem('commercia_sales') ||
      '[]'
    );
    const expenses = JSON.parse(
      localStorage.getItem(`commercia_expenses_${activeBizId}`) ||
      localStorage.getItem('commercia_expenses') ||
      '[]'
    );
    const customers = JSON.parse(
      localStorage.getItem(`commercia_customers_${activeBizId}`) ||
      localStorage.getItem('commercia_customers') ||
      '[]'
    );
    const cashSessions = JSON.parse(
      localStorage.getItem(`commercia_cash_sessions_${activeBizId}`) ||
      localStorage.getItem('commercia_cash_sessions') ||
      '[]'
    );
    const lotsCampaigns = JSON.parse(
      localStorage.getItem('commercia_lots_campaigns') ||
      '[]'
    );
    const treasuryAccounts = JSON.parse(
      localStorage.getItem(`commercia_treasury_accounts_${activeBizId}`) ||
      localStorage.getItem('commercia_treasury_accounts') ||
      '[]'
    );
    const treasuryMovements = JSON.parse(
      localStorage.getItem(`commercia_treasury_movements_${activeBizId}`) ||
      localStorage.getItem('commercia_treasury_movements') ||
      '[]'
    );

    // Full dump of all commercia-related keys in localStorage
    const storageDump: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('commercia_') || key === 'activeBusinessId' || key.startsWith('rsbizz_'))) {
        try {
          storageDump[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          storageDump[key] = localStorage.getItem(key);
        }
      }
    }

    const now = new Date();
    const backupData: CommerceBackup = {
      version: '2.5.0',
      appName: 'COMMERCIA',
      timestamp: now.toISOString(),
      exportedAt: now.toLocaleString('fr-FR'),
      activeBusiness: activeBiz,
      user,
      products,
      sales,
      expenses,
      customers,
      cashSessions,
      lotsCampaigns,
      treasuryAccounts,
      treasuryMovements,
      storageDump,
    };

    localStorage.setItem('commercia_last_backup_date', now.toISOString());

    const businessSlug = (activeBiz?.name || 'COMMERCIA').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', 'h');
    const fileName = `COMMERCIA_SAUVEGARDE_${businessSlug}_${dateStr}_${timeStr}.json`;

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Erreur lors de la sauvegarde :', err);
    throw new Error('Impossible d\'exporter la sauvegarde : ' + err.message);
  }
}

export function inspectBackupFile(backupJsonString: string): BackupInspectionResult {
  try {
    const data: CommerceBackup = JSON.parse(backupJsonString);
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Fichier vide ou format non JSON.' };
    }

    const products = Array.isArray(data.products) ? data.products.length : (data.storageDump ? Object.keys(data.storageDump).length : 0);
    const sales = Array.isArray(data.sales) ? data.sales.length : 0;
    const expenses = Array.isArray(data.expenses) ? data.expenses.length : 0;
    const customers = Array.isArray(data.customers) ? data.customers.length : 0;

    return {
      isValid: true,
      businessName: data.activeBusiness?.name || data.user?.businesses?.[0]?.name || 'Commerce',
      currency: data.activeBusiness?.currency || 'FCFA',
      exportedAt: data.exportedAt || data.timestamp || 'Date inconnue',
      version: data.version || '1.0.0',
      summary: {
        products,
        sales,
        expenses,
        customers,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: 'Ce fichier n\'est pas un fichier JSON de sauvegarde COMMERCIA valide (' + (err.message || '') + ')',
    };
  }
}

export function importCommerceBackup(backupJsonString: string): boolean {
  try {
    const data: CommerceBackup = JSON.parse(backupJsonString);
    if (!data || typeof data !== 'object') {
      throw new Error('Fichier de sauvegarde invalide.');
    }

    // 1. If storageDump is present, restore all keys first
    if (data.storageDump && typeof data.storageDump === 'object') {
      Object.entries(data.storageDump).forEach(([k, v]) => {
        try {
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        } catch (e) {
          console.warn('Erreur de restauration pour la clé :', k, e);
        }
      });
    }

    const activeBizId = data.activeBusiness?.id || 'default';

    // 2. Explicit collection sync for both prefixed and global keys
    if (data.products && Array.isArray(data.products)) {
      localStorage.setItem('commercia_products', JSON.stringify(data.products));
      localStorage.setItem(`commercia_products_${activeBizId}`, JSON.stringify(data.products));
    }
    if (data.sales && Array.isArray(data.sales)) {
      localStorage.setItem('commercia_sales', JSON.stringify(data.sales));
      localStorage.setItem(`commercia_sales_${activeBizId}`, JSON.stringify(data.sales));
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      localStorage.setItem('commercia_expenses', JSON.stringify(data.expenses));
      localStorage.setItem(`commercia_expenses_${activeBizId}`, JSON.stringify(data.expenses));
    }
    if (data.customers && Array.isArray(data.customers)) {
      localStorage.setItem('commercia_customers', JSON.stringify(data.customers));
      localStorage.setItem(`commercia_customers_${activeBizId}`, JSON.stringify(data.customers));
    }
    if (data.cashSessions && Array.isArray(data.cashSessions)) {
      localStorage.setItem('commercia_cash_sessions', JSON.stringify(data.cashSessions));
      localStorage.setItem(`commercia_cash_sessions_${activeBizId}`, JSON.stringify(data.cashSessions));
    }
    if (data.lotsCampaigns && Array.isArray(data.lotsCampaigns)) {
      localStorage.setItem('commercia_lots_campaigns', JSON.stringify(data.lotsCampaigns));
    }
    if (data.treasuryAccounts && Array.isArray(data.treasuryAccounts)) {
      localStorage.setItem('commercia_treasury_accounts', JSON.stringify(data.treasuryAccounts));
      localStorage.setItem(`commercia_treasury_accounts_${activeBizId}`, JSON.stringify(data.treasuryAccounts));
    }
    if (data.treasuryMovements && Array.isArray(data.treasuryMovements)) {
      localStorage.setItem('commercia_treasury_movements', JSON.stringify(data.treasuryMovements));
      localStorage.setItem(`commercia_treasury_movements_${activeBizId}`, JSON.stringify(data.treasuryMovements));
    }

    if (data.user) {
      localStorage.setItem('commercia_user', JSON.stringify(data.user));
    }
    if (data.activeBusiness?.id) {
      localStorage.setItem('commercia_active_business_id', data.activeBusiness.id);
      localStorage.setItem('activeBusinessId', data.activeBusiness.id);
    }

    localStorage.setItem('commercia_last_restore_date', new Date().toISOString());

    return true;
  } catch (err: any) {
    console.error('Erreur d\'importation :', err);
    throw new Error('Format de fichier incompatible : ' + err.message);
  }
}
