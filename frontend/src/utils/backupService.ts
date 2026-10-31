// COMMERCIA Data Backup, Export & Storage Migration Service
// Enables 1-click full business backup and restore for retailers

export interface CommerceBackup {
  version: string;
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
}

export function exportFullCommerceBackup(): void {
  try {
    const userRaw = localStorage.getItem('commercia_user') || localStorage.getItem('rsbizz_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const activeBizId = localStorage.getItem('commercia_active_business_id') || localStorage.getItem('activeBusinessId');
    const activeBiz = user?.businesses?.find((b: any) => b.id === activeBizId) || user?.businesses?.[0] || null;

    const products = JSON.parse(localStorage.getItem('commercia_products') || '[]');
    const sales = JSON.parse(localStorage.getItem('commercia_sales') || '[]');
    const expenses = JSON.parse(localStorage.getItem('commercia_expenses') || '[]');
    const customers = JSON.parse(localStorage.getItem('commercia_customers') || '[]');
    const cashSessions = JSON.parse(localStorage.getItem('commercia_cash_sessions') || '[]');
    const lotsCampaigns = JSON.parse(localStorage.getItem('commercia_lots_campaigns') || '[]');

    const backupData: CommerceBackup = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      exportedAt: new Date().toLocaleString('fr-FR'),
      activeBusiness: activeBiz,
      user: user,
      products,
      sales,
      expenses,
      customers,
      cashSessions,
      lotsCampaigns,
    };

    const businessSlug = (activeBiz?.name || 'COMMERCIA').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `COMMERCIA_SAUVEGARDE_${businessSlug}_${dateStr}.json`;

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

export function importCommerceBackup(backupJsonString: string): boolean {
  try {
    const data: CommerceBackup = JSON.parse(backupJsonString);
    if (!data || typeof data !== 'object') {
      throw new Error('Fichier de sauvegarde invalide');
    }

    if (data.products && Array.isArray(data.products)) {
      localStorage.setItem('commercia_products', JSON.stringify(data.products));
    }
    if (data.sales && Array.isArray(data.sales)) {
      localStorage.setItem('commercia_sales', JSON.stringify(data.sales));
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      localStorage.setItem('commercia_expenses', JSON.stringify(data.expenses));
    }
    if (data.customers && Array.isArray(data.customers)) {
      localStorage.setItem('commercia_customers', JSON.stringify(data.customers));
    }
    if (data.cashSessions && Array.isArray(data.cashSessions)) {
      localStorage.setItem('commercia_cash_sessions', JSON.stringify(data.cashSessions));
    }
    if (data.lotsCampaigns && Array.isArray(data.lotsCampaigns)) {
      localStorage.setItem('commercia_lots_campaigns', JSON.stringify(data.lotsCampaigns));
    }

    if (data.user) {
      localStorage.setItem('commercia_user', JSON.stringify(data.user));
    }
    if (data.activeBusiness?.id) {
      localStorage.setItem('commercia_active_business_id', data.activeBusiness.id);
      localStorage.setItem('activeBusinessId', data.activeBusiness.id);
    }

    return true;
  } catch (err: any) {
    console.error('Erreur d\'importation :', err);
    throw new Error('Format de fichier incompatible : ' + err.message);
  }
}
