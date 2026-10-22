// COMMERCIA In-Memory & LocalStorage Mock Backend
// Ensures zero-downtime demonstration on static cloud deployments (Vercel)
import { calculateFinancialMetrics } from '../utils/finance';

export function handleMockRequest(endpoint: string, method: string, body?: any): any {
  const storedUser = localStorage.getItem('commercia_user') || localStorage.getItem('rsbizz_user');
  let currentUser = storedUser ? JSON.parse(storedUser) : null;

  // 1. AUTH / LOGIN
  if (endpoint.startsWith('/auth/login') && method === 'POST') {
    const email = body?.email || '';
    const isAdmin = email.includes('admin');
    const user = {
      id: isAdmin ? 'admin-1' : 'user-moussa',
      email: email || (isAdmin ? 'admin@commercia.cm' : 'moussa@boutique.cm'),
      firstName: isAdmin ? 'Admin' : 'Moussa',
      lastName: isAdmin ? 'COMMERCIA' : 'Ibrahim',
      phone: isAdmin ? '+237 690 000 000' : '+237 670 123 456',
      locale: 'fr',
      currency: 'XAF',
      isAdmin,
      businesses: [
        {
          id: 'bizz-demo-1',
          name: isAdmin ? 'Supermarché Douala' : 'Épicerie & Alimentation Moussa',
          sector: 'commerce',
          role: 'owner',
        },
      ],
      subscription: {
        planName: isAdmin ? 'business' : 'pro',
        planDisplayName: isAdmin ? 'Plan Business (Multi-boutiques)' : 'Plan Pro (Croissance)',
        status: 'active',
        features: ['Ventes & Dépenses illimitées', 'Stock temps réel', 'Copilote IA illimité'],
      },
    };

    localStorage.setItem('commercia_user', JSON.stringify(user));
    localStorage.setItem('activeBusinessId', user.businesses[0].id);

    return {
      message: `Bienvenue ${user.firstName} ! 👋`,
      accessToken: 'demo-jwt-access-token',
      refreshToken: 'demo-jwt-refresh-token',
      user,
    };
  }

  // 2. AUTH / REGISTER
  if (endpoint.startsWith('/auth/register') && method === 'POST') {
    const user = {
      id: 'user-' + Date.now(),
      email: body?.email || 'nouveau@commercia.com',
      firstName: body?.firstName || 'Commerçant',
      lastName: body?.lastName || 'Partenaire',
      phone: body?.phone || '+237 600 000 000',
      locale: 'fr',
      currency: 'XAF',
      isAdmin: false,
      businesses: [],
      subscription: {
        planName: 'free',
        planDisplayName: 'Plan Gratuit (Démarrage)',
        status: 'active',
        features: ['Jusqu\'à 15 ventes/jour', 'Calcul bénéfice'],
      },
    };
    localStorage.setItem('commercia_user', JSON.stringify(user));
    return {
      message: 'Compte créé avec succès ! 🎉',
      accessToken: 'demo-jwt-access-token',
      refreshToken: 'demo-jwt-refresh-token',
      user,
    };
  }

  // 3. AUTH / ME
  if (endpoint === '/auth/me' && method === 'GET') {
    if (!currentUser) {
      currentUser = {
        id: 'user-moussa',
        email: 'moussa@boutique.cm',
        firstName: 'Moussa',
        lastName: 'Ibrahim',
        phone: '+237 670 123 456',
        locale: 'fr',
        currency: 'XAF',
        isAdmin: false,
        businesses: [
          {
            id: 'bizz-demo-1',
            name: 'Épicerie & Alimentation Moussa',
            sector: 'commerce',
            role: 'owner',
          },
        ],
        subscription: {
          planName: 'pro',
          planDisplayName: 'Plan Pro (Croissance)',
          status: 'active',
        },
      };
      localStorage.setItem('commercia_user', JSON.stringify(currentUser));
    }
    return currentUser;
  }

  // 4. AUTH / BUSINESS (Create business)
  if (endpoint === '/auth/business' && method === 'POST') {
    const newBizz = {
      id: 'bizz-' + Date.now(),
      name: body?.name || 'Mon Entreprise',
      sector: body?.sector || 'commerce',
      trackingMode: body?.trackingMode || 'complet',
      role: 'owner',
    };

    if (currentUser) {
      currentUser.businesses = [newBizz, ...(currentUser.businesses || [])];
      localStorage.setItem('commercia_user', JSON.stringify(currentUser));
    }
    localStorage.setItem('activeBusinessId', newBizz.id);

    return {
      message: 'Activité créée avec succès ! 🎉',
      business: newBizz,
    };
  }

  // 5. DASHBOARD
  if (endpoint === '/dashboard' && method === 'GET') {
    const rawSales = localStorage.getItem('commercia_sales') || localStorage.getItem('rsbizz_sales');
    const localSales = rawSales ? JSON.parse(rawSales) : [];
    const rawExpenses = localStorage.getItem('commercia_expenses') || localStorage.getItem('rsbizz_expenses');
    const localExpenses = rawExpenses ? JSON.parse(rawExpenses) : [];

    const defaultSales = [
      {
        id: 's-1',
        totalAmount: 5000,
        paymentMethod: 'cash',
        saleDate: new Date().toISOString(),
        items: [{ name: 'Riz parfumé 5kg' }],
      },
      {
        id: 's-2',
        totalAmount: 14000,
        paymentMethod: 'cash',
        saleDate: new Date(Date.now() - 3600000).toISOString(),
        items: [{ name: 'Huile de palme raffinée Mayor 1L' }, { name: 'Spaghetti Mambo' }],
      },
      {
        id: 's-3',
        totalAmount: 7350,
        paymentMethod: 'mobile_money',
        saleDate: new Date(Date.now() - 7200000).toISOString(),
        items: [{ name: 'Sucre SOSUCAM 1kg' }, { name: 'Lait en poudre Nido' }],
      },
      {
        id: 's-4',
        totalAmount: 12500,
        paymentMethod: 'credit',
        saleDate: new Date(Date.now() - 10800000).toISOString(),
        customer: { name: 'Maman Chantal' },
        items: [{ name: 'Carton Savon BF' }],
      },
    ];

    const defaultExpenses = [
      {
        id: 'e-1',
        amount: 15000,
        category: 'Transport et moto-taxi',
        description: 'Livraison vers marché Sandaga',
        expenseDate: new Date().toISOString(),
      },
      {
        id: 'e-2',
        amount: 2500,
        category: 'Emballages et plastiques',
        description: 'Sachets biodégradables',
        expenseDate: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'e-3',
        amount: 45000,
        category: 'Loyer boutique',
        description: 'Avance mensuelle',
        expenseDate: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const salesList = [...localSales, ...defaultSales];
    const expensesList = [...localExpenses, ...defaultExpenses];

    const metricsToday = calculateFinancialMetrics({
      sales: salesList,
      expenses: expensesList,
    });

    const metricsWeek = calculateFinancialMetrics({
      sales: [...salesList, { totalAmount: 120000, paymentMethod: 'cash', items: [] }],
      expenses: [...expensesList, { amount: 60000, category: 'Loyer boutique' }],
    });

    const metricsMonth = calculateFinancialMetrics({
      sales: [...salesList, { totalAmount: 580000, paymentMethod: 'cash', items: [] }],
      expenses: [...expensesList, { amount: 240000, category: 'Loyer boutique' }],
    });

    return {
      today: {
        revenue: metricsToday.revenue,
        sales: metricsToday.revenue,
        salesCount: salesList.length,
        cashCollected: metricsToday.cashCollected,
        creditSales: metricsToday.creditSales,
        cogs: metricsToday.cogs,
        grossProfit: metricsToday.grossProfit,
        grossMarginPercent: metricsToday.grossMarginPercent,
        operatingExpenses: metricsToday.operatingExpenses,
        inventoryExpenses: metricsToday.inventoryExpenses,
        personalWithdrawals: metricsToday.personalWithdrawals,
        expenses: metricsToday.operatingExpenses + metricsToday.inventoryExpenses,
        profit: metricsToday.estimatedNetProfit,
        netCashFlow: metricsToday.netCashFlow,
        whyExplanation: metricsToday.whyExplanation,
      },
      week: {
        revenue: metricsWeek.revenue,
        sales: metricsWeek.revenue,
        cashCollected: metricsWeek.cashCollected,
        expenses: metricsWeek.operatingExpenses + metricsWeek.inventoryExpenses,
        profit: metricsWeek.estimatedNetProfit,
        netCashFlow: metricsWeek.netCashFlow,
        whyExplanation: metricsWeek.whyExplanation,
      },
      month: {
        revenue: metricsMonth.revenue,
        sales: metricsMonth.revenue,
        cashCollected: metricsMonth.cashCollected,
        expenses: metricsMonth.operatingExpenses + metricsMonth.inventoryExpenses,
        profit: metricsMonth.estimatedNetProfit,
        netCashFlow: metricsMonth.netCashFlow,
        whyExplanation: metricsMonth.whyExplanation,
      },
      debt: {
        total: 38500,
        customerCount: 3,
      },
      stockAlertsCount: 2,
      recentTransactions: {
        sales: salesList.slice(0, 5),
        expenses: expensesList.slice(0, 5),
      },
      insights: [
        {
          id: 'ins-1',
          type: 'profitability',
          title: 'Activité Bénéficiaire !',
          message: `Votre activité génère un bénéfice d'exploitation de +${metricsToday.estimatedNetProfit.toLocaleString('fr-FR')} FCFA aujourd'hui. Vos encaissements réels en cash s'élèvent à ${metricsToday.cashCollected.toLocaleString('fr-FR')} FCFA.`,
          severity: 'success',
        },
      ],
    };
  }


  // 6. ANALYTICS / TRENDS
  if (endpoint.startsWith('/analytics/trends')) {
    const days = 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const sales = Math.floor(25000 + Math.random() * 45000);
      const expenses = Math.floor(10000 + Math.random() * 20000);
      result.push({
        date: dateStr,
        sales,
        expenses,
        profit: sales - expenses,
      });
    }
    return result;
  }

  // 7. ANALYTICS / CATEGORIES
  if (endpoint.startsWith('/analytics/categories')) {
    return [
      { category: 'Marchandise', amount: 85000 },
      { category: 'Loyer boutique', amount: 45000 },
      { category: 'Transport', amount: 15000 },
      { category: 'Électricité & Eau', amount: 12000 },
      { category: 'Téléphone / Internet', amount: 5000 },
      { category: 'Emballages', amount: 2500 },
    ];
  }

  // 8. ANALYTICS / TOP PRODUCTS
  if (endpoint.startsWith('/analytics/top-products')) {
    return [
      { name: 'Riz Blanc Mémé Cassé 5kg', quantity: 48, revenue: 144000 },
      { name: 'Huile de palme raffinée Mayor 1L', quantity: 65, revenue: 97500 },
      { name: 'Sucre en morceaux SOSUCAM 1kg', quantity: 80, revenue: 76000 },
      { name: 'Lait en poudre Nido 400g', quantity: 22, revenue: 61600 },
      { name: 'Spaghetti Mambo 500g', quantity: 95, revenue: 47500 },
    ];
  }

  // 9. ANALYTICS / WEEKLY REPORT
  if (endpoint.startsWith('/analytics/weekly-report')) {
    return {
      period: {
        from: '15/10/2026',
        to: '22/10/2026',
      },
      metrics: {
        totalSales: 285000,
        salesCount: 42,
        totalExpenses: 110000,
        expensesCount: 14,
        netProfit: 175000,
        totalDebt: 38500,
      },
      recommendation: 'Excellente semaine ! Votre marge nette est supérieure à 60%. Pensez à réapprovisionner votre stock de riz et huile avant le week-end.',
    };
  }

  // 10. AI COPILOT
  if (endpoint.startsWith('/analytics/ai/chat') && method === 'POST') {
    const q = (body?.message || '').toLowerCase();
    if (q.includes('bénéfice') || q.includes('profit') || q.includes('gain')) {
      return {
        reply: 'Votre bénéfice estimé aujourd\'hui est de **+24 850 FCFA** (Recettes : 42 350 FCFA, Dépenses : 17 500 FCFA). Votre activité est saine et rentable ! 📈',
      };
    }
    if (q.includes('dette') || q.includes('crédit') || q.includes('doit')) {
      return {
        reply: 'Vous avez actuellement **38 500 FCFA** de crédits en attente répartis sur 3 clients :\n• **Maman Chantal** : 15 000 FCFA\n• **Papa Pierre** : 13 500 FCFA\n• **Tantie Rose** : 10 000 FCFA\n\n💡 *Astuce : Envoyez un rappel cordial par WhatsApp pour sécuriser vos encaissements.*',
      };
    }
    if (q.includes('dépense') || q.includes('charge')) {
      return {
        reply: 'Vos dépenses totales déclarées cette semaine s\'élèvent à **110 000 FCFA**, dont 77% alloués à la marchandise (achat de stock) et 14% pour le transport.',
      };
    }
    return {
      reply: 'Bonjour ! Je suis votre Copilote Financier COMMERCIA. Votre solde estimé est au vert. Posez-moi des questions sur vos marges, vos stocks ou vos clients débiteurs ! 🚀',
    };
  }

  // Helper: get or init mock products
  const getStoredProducts = () => {
    const rawProd = localStorage.getItem('commercia_products');
    if (rawProd) {
      try { return JSON.parse(rawProd); } catch (e) { /* ignore */ }
    }
    const defaultProds = [
      { id: 'p-1', name: 'Riz Blanc Mémé Cassé 5kg', costPrice: 2400, sellingPrice: 3000, quantity: 18, unit: 'sac', lowStockAlert: 5, isActive: true },
      { id: 'p-2', name: 'Huile de palme raffinée Mayor 1L', costPrice: 1200, sellingPrice: 1500, quantity: 3, unit: 'bouteille', lowStockAlert: 5, isActive: true },
      { id: 'p-3', name: 'Sucre en morceaux SOSUCAM 1kg', costPrice: 750, sellingPrice: 950, quantity: 24, unit: 'boîte', lowStockAlert: 5, isActive: true },
      { id: 'p-4', name: 'Lait en poudre Nido 400g', costPrice: 2200, sellingPrice: 2800, quantity: 2, unit: 'boîte', lowStockAlert: 5, isActive: true },
      { id: 'p-5', name: 'Spaghetti Mambo 500g', costPrice: 380, sellingPrice: 500, quantity: 45, unit: 'paquet', lowStockAlert: 5, isActive: true },
    ];
    localStorage.setItem('commercia_products', JSON.stringify(defaultProds));
    return defaultProds;
  };

  // 11. SALES (GET & POST)
  if (endpoint.startsWith('/sales')) {
    if (method === 'POST') {
      const raw = localStorage.getItem('commercia_sales') || localStorage.getItem('rsbizz_sales');
      const sales = raw ? JSON.parse(raw) : [];
      const newItems = body?.items || [{ name: 'Vente directe comptoir' }];

      // Decrement stock for linked products in mock mode
      const products = getStoredProducts();
      let stockChanged = false;
      newItems.forEach((item: any) => {
        const prod = products.find((p: any) => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
        if (prod) {
          prod.quantity = Math.max(0, (prod.quantity || 0) - (Number(item.quantity) || 1));
          stockChanged = true;
          if (!item.costPrice || item.costPrice === 0) {
            item.costPrice = prod.costPrice;
          }
        }
      });
      if (stockChanged) {
        localStorage.setItem('commercia_products', JSON.stringify(products));
      }

      const newSale = {
        id: 's-' + Date.now(),
        totalAmount: Number(body?.totalAmount || 0),
        paidAmount: Number(body?.paidAmount || body?.totalAmount || 0),
        paymentMethod: body?.paymentMethod || 'cash',
        saleDate: new Date().toISOString(),
        items: newItems,
      };
      sales.unshift(newSale);
      localStorage.setItem('commercia_sales', JSON.stringify(sales));
      return { message: 'Vente enregistrée avec succès ! 🎉', sale: newSale };
    }
    const raw = localStorage.getItem('commercia_sales') || localStorage.getItem('rsbizz_sales');
    return raw ? JSON.parse(raw) : [];
  }

  // 12. EXPENSES (GET & POST)
  if (endpoint.startsWith('/expenses')) {
    if (method === 'POST') {
      const raw = localStorage.getItem('commercia_expenses') || localStorage.getItem('rsbizz_expenses');
      const expenses = raw ? JSON.parse(raw) : [];
      const newExpense = {
        id: 'e-' + Date.now(),
        amount: Number(body?.amount || 0),
        category: body?.category || 'Autre dépense',
        description: body?.description || '',
        expenseDate: new Date().toISOString(),
      };
      expenses.unshift(newExpense);
      localStorage.setItem('commercia_expenses', JSON.stringify(expenses));
      return { message: 'Dépense enregistrée !', expense: newExpense };
    }
    const raw = localStorage.getItem('commercia_expenses') || localStorage.getItem('rsbizz_expenses');
    return raw ? JSON.parse(raw) : [];
  }

  // 13. CUSTOMERS
  if (endpoint.startsWith('/customers')) {
    return [
      { id: 'c-1', name: 'Maman Chantal', phone: '+237 677 11 22 33', totalBought: 125000, totalOwed: 15000 },
      { id: 'c-2', name: 'Papa Pierre', phone: '+237 699 44 55 66', totalBought: 84000, totalOwed: 13500 },
      { id: 'c-3', name: 'Tantie Rose', phone: '+237 655 77 88 99', totalBought: 96000, totalOwed: 10000 },
      { id: 'c-4', name: 'Maître Eric', phone: '+237 680 01 02 03', totalBought: 210000, totalOwed: 0 },
    ];
  }

  // 14. PRODUCTS (GET, POST & ADJUST)
  if (endpoint.startsWith('/products')) {
    const prods = getStoredProducts();
    if (endpoint.includes('/adjust') && method === 'POST') {
      const prodId = endpoint.split('/')[2];
      const prod = prods.find((p: any) => p.id === prodId);
      if (prod) {
        if (body?.type === 'in') prod.quantity += Number(body?.quantity || 0);
        else if (body?.type === 'out') prod.quantity = Math.max(0, prod.quantity - Number(body?.quantity || 0));
        else if (body?.type === 'adjustment') prod.quantity = Number(body?.quantity || 0);
        localStorage.setItem('commercia_products', JSON.stringify(prods));
        return { message: 'Stock mis à jour avec succès.', product: prod };
      }
    }
    if (method === 'POST') {
      const newProd = {
        id: 'p-' + Date.now(),
        name: body?.name || 'Nouveau produit',
        costPrice: Number(body?.costPrice || 0),
        sellingPrice: Number(body?.sellingPrice || 0),
        quantity: Number(body?.quantity || 0),
        unit: body?.unit || 'unité',
        lowStockAlert: Number(body?.lowStockAlert || 5),
        isActive: true,
      };
      prods.unshift(newProd);
      localStorage.setItem('commercia_products', JSON.stringify(prods));
      return newProd;
    }
    return prods;
  }


  // 15. NOTIFICATIONS
  if (endpoint.startsWith('/notifications')) {
    return {
      notifications: [
        { id: 'n-1', title: 'Stock Critique', message: 'Lait Nido : seulement 2 boîtes restantes en rayon.', isRead: false },
        { id: 'n-2', title: 'Rappel Dette', message: 'Maman Chantal a un crédit de 15 000 FCFA depuis 5 jours.', isRead: false },
      ],
      unreadCount: 2,
    };
  }

  // 16. PLANS
  if (endpoint.startsWith('/plans')) {
    return [
      {
        id: 'plan-free',
        name: 'free',
        displayName: 'Gratuit',
        priceMonthly: 0,
        currency: 'XAF',
        features: JSON.stringify(['15 ventes max / jour', 'Calcul bénéfice journalier', 'Support communauté']),
      },
      {
        id: 'plan-pro',
        name: 'pro',
        displayName: 'Pro Croissance',
        priceMonthly: 4500,
        currency: 'XAF',
        features: JSON.stringify(['Ventes illimitées', 'Gestion de stock & alertes', 'Carnet dettes clients', 'Copilote IA COMMERCIA']),
      },
      {
        id: 'plan-business',
        name: 'business',
        displayName: 'Business Multi-boutiques',
        priceMonthly: 12000,
        currency: 'XAF',
        features: JSON.stringify(['Multi-utilisateurs & rôles', 'Rapports hebdomadaires PDF', 'Copilote IA illimité', 'Support VIP WhatsApp']),
      },
    ];
  }

  // 17. ADMIN
  if (endpoint.startsWith('/admin')) {
    return {
      metrics: {
        totalUsers: 142,
        activeBusinesses: 189,
        monthlyRecurringRevenue: 486000,
        annualRunRate: 5832000,
      },
      recentUsers: [
        { id: 'u-1', name: 'Moussa Ibrahim', email: 'moussa@boutique.cm', plan: 'Plan Pro', createdAt: '2026-10-20' },
        { id: 'u-2', name: 'Reine Ngono', email: 'reine@salon.cm', plan: 'Plan Business', createdAt: '2026-10-18' },
      ],
    };
  }

  // Default fallback
  return { status: 'ok', mock: true };
}
