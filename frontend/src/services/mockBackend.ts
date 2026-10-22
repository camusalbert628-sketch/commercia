// COMMERCIA In-Memory & LocalStorage Mock Backend
// Ensures zero-downtime demonstration on static cloud deployments (Vercel)
import { calculateFinancialMetrics } from '../utils/finance';

const USERS_DB_KEY = 'commercia_users_db';

function getUsersDb(): any[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const defaults = [
    {
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
        features: ['Ventes & Dépenses illimitées', 'Stock temps réel', 'Copilote IA illimité'],
      },
    },
    {
      id: 'admin-1',
      email: 'admin@commercia.com',
      firstName: 'Admin',
      lastName: 'COMMERCIA',
      phone: '+237 690 000 000',
      locale: 'fr',
      currency: 'XAF',
      isAdmin: true,
      businesses: [
        {
          id: 'bizz-admin-1',
          name: 'Supermarché Douala',
          sector: 'commerce',
          role: 'owner',
        },
      ],
      subscription: {
        planName: 'business',
        planDisplayName: 'Plan Business (Multi-boutiques)',
        status: 'active',
        features: ['Multi-utilisateurs & rôles', 'Rapports PDF', 'Copilote IA illimité'],
      },
    },
  ];
  try { localStorage.setItem(USERS_DB_KEY, JSON.stringify(defaults)); } catch (e) { /* ignore */ }
  return defaults;
}

function saveUsersDb(users: any[]) {
  try { localStorage.setItem(USERS_DB_KEY, JSON.stringify(users)); } catch (e) { /* ignore */ }
}

export function handleMockRequest(endpoint: string, method: string, body?: any): any {
  const storedUser = localStorage.getItem('commercia_user') || localStorage.getItem('rsbizz_user');
  let currentUser = storedUser ? JSON.parse(storedUser) : null;

  // 1. AUTH / LOGIN
  if (endpoint.startsWith('/auth/login') && method === 'POST') {
    const rawEmail = (body?.email || '').trim().toLowerCase();
    const users = getUsersDb();
    let foundUser = users.find(u => (u.email || '').toLowerCase() === rawEmail);

    if (!foundUser) {
      // User typed an email that wasn't registered yet: create a dynamic profile
      // so their personal email and identity are immediately respected!
      const emailPrefix = rawEmail.split('@')[0] || 'commercant';
      const parts = emailPrefix.split(/[._-]/);
      const inferredFirst = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Commerçant';
      const inferredLast = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';

      foundUser = {
        id: 'user-' + Date.now(),
        email: body?.email || `${rawEmail}`,
        firstName: inferredFirst,
        lastName: inferredLast,
        phone: body?.phone || '',
        locale: 'fr',
        currency: 'XAF',
        isAdmin: rawEmail.includes('admin'),
        businesses: [],
        subscription: {
          planName: rawEmail.includes('admin') ? 'business' : 'free',
          planDisplayName: rawEmail.includes('admin') ? 'Plan Business' : 'Plan Gratuit (Démarrage)',
          status: 'active',
          features: ['Ventes', 'Dépenses', 'Dashboard'],
        },
      };
      users.push(foundUser);
      saveUsersDb(users);
    }

    localStorage.setItem('commercia_user', JSON.stringify(foundUser));
    if (foundUser.businesses && foundUser.businesses.length > 0) {
      localStorage.setItem('activeBusinessId', foundUser.businesses[0].id);
    } else {
      localStorage.removeItem('activeBusinessId');
    }

    return {
      message: `Bienvenue ${foundUser.firstName} ! 👋`,
      accessToken: 'demo-jwt-access-' + foundUser.id,
      refreshToken: 'demo-jwt-refresh-' + foundUser.id,
      user: foundUser,
    };
  }

  // 2. AUTH / REGISTER
  if (endpoint.startsWith('/auth/register') && method === 'POST') {
    const users = getUsersDb();
    const rawEmail = (body?.email || '').trim().toLowerCase();
    let existingUser = users.find(u => (u.email || '').toLowerCase() === rawEmail);

    if (existingUser) {
      if (body?.firstName) existingUser.firstName = body.firstName;
      if (body?.lastName) existingUser.lastName = body.lastName;
      if (body?.phone) existingUser.phone = body.phone;
      saveUsersDb(users);
      localStorage.setItem('commercia_user', JSON.stringify(existingUser));
      return {
        message: `Ravi de vous revoir ${existingUser.firstName} ! 👋`,
        accessToken: 'demo-jwt-access-' + existingUser.id,
        refreshToken: 'demo-jwt-refresh-' + existingUser.id,
        user: existingUser,
      };
    }

    const newUser = {
      id: 'user-' + Date.now(),
      email: body?.email || 'partenaire@commercia.cm',
      firstName: body?.firstName || 'Commerçant',
      lastName: body?.lastName || '',
      phone: body?.phone || '',
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

    users.push(newUser);
    saveUsersDb(users);
    localStorage.setItem('commercia_user', JSON.stringify(newUser));
    localStorage.removeItem('activeBusinessId');

    return {
      message: 'Compte créé avec succès ! 🎉',
      accessToken: 'demo-jwt-access-' + newUser.id,
      refreshToken: 'demo-jwt-refresh-' + newUser.id,
      user: newUser,
    };
  }

  // 3. AUTH / ME
  if (endpoint === '/auth/me' && method === 'GET') {
    if (!currentUser) {
      const users = getUsersDb();
      currentUser = users[0];
      localStorage.setItem('commercia_user', JSON.stringify(currentUser));
    }
    return currentUser;
  }

  // 4. AUTH / BUSINESS (Create boutique)
  if (endpoint === '/auth/business' && method === 'POST') {
    const rawUser = localStorage.getItem('commercia_user');
    currentUser = rawUser ? JSON.parse(rawUser) : currentUser;

    const bizzName = (body?.name || '').trim() || 'Mon Commerce';
    const newBizz = {
      id: 'bizz-' + Date.now(),
      name: bizzName,
      sector: body?.sector || 'commerce',
      trackingMode: body?.trackingMode || 'complet',
      dailySalesEstimate: body?.dailySalesEstimate,
      role: 'owner',
    };

    if (currentUser) {
      currentUser.businesses = [newBizz, ...(currentUser.businesses || [])];
      localStorage.setItem('commercia_user', JSON.stringify(currentUser));

      const users = getUsersDb();
      const idx = users.findIndex(u => u.id === currentUser.id || (u.email && u.email === currentUser.email));
      if (idx !== -1) {
        users[idx] = currentUser;
        saveUsersDb(users);
      }
    }
    localStorage.setItem('activeBusinessId', newBizz.id);

    return {
      message: 'Activité créée avec succès ! 🎉',
      business: newBizz,
      user: currentUser,
    };
  }

  // 5. DASHBOARD
  if (endpoint === '/dashboard' && method === 'GET') {
    const rawUser = localStorage.getItem('commercia_user');
    const userObj = rawUser ? JSON.parse(rawUser) : currentUser;
    const isDemoMoussa = userObj?.email === 'moussa@boutique.cm' || userObj?.id === 'user-moussa';

    const activeBizId = localStorage.getItem('activeBusinessId') || userObj?.businesses?.[0]?.id || 'default';
    const rawSales = localStorage.getItem(`commercia_sales_${activeBizId}`) || localStorage.getItem('commercia_sales');
    const localSales = rawSales ? JSON.parse(rawSales) : [];
    const rawExpenses = localStorage.getItem(`commercia_expenses_${activeBizId}`) || localStorage.getItem('commercia_expenses');
    const localExpenses = rawExpenses ? JSON.parse(rawExpenses) : [];

    const defaultSales = isDemoMoussa && localSales.length === 0 ? [
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
    ] : [];

    const defaultExpenses = isDemoMoussa && localExpenses.length === 0 ? [
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
    ] : [];

    const salesList = [...localSales, ...defaultSales];
    const expensesList = [...localExpenses, ...defaultExpenses];

    const metricsToday = calculateFinancialMetrics({
      sales: salesList,
      expenses: expensesList,
    });

    const metricsWeek = calculateFinancialMetrics({
      sales: salesList.length > 0 ? salesList : (isDemoMoussa ? [{ totalAmount: 120000, paymentMethod: 'cash', items: [] }] : []),
      expenses: expensesList.length > 0 ? expensesList : (isDemoMoussa ? [{ amount: 60000, category: 'Loyer boutique' }] : []),
    });

    const metricsMonth = calculateFinancialMetrics({
      sales: salesList.length > 0 ? salesList : (isDemoMoussa ? [{ totalAmount: 580000, paymentMethod: 'cash', items: [] }] : []),
      expenses: expensesList.length > 0 ? expensesList : (isDemoMoussa ? [{ amount: 240000, category: 'Loyer boutique' }] : []),
    });

    // Calculate customer debts for this active business
    const rawCust = localStorage.getItem(`commercia_customers_${activeBizId}`) || (isDemoMoussa ? localStorage.getItem('commercia_customers') : null);
    let custs: any[] = [];
    if (rawCust) {
      try { custs = JSON.parse(rawCust); } catch (e) { /* ignore */ }
    } else if (isDemoMoussa) {
      custs = [
        { id: 'c-1', name: 'Maman Chantal', totalOwed: 15000 },
        { id: 'c-2', name: 'Papa Pierre', totalOwed: 13500 },
        { id: 'c-3', name: 'Tantie Rose', totalOwed: 10000 },
      ];
    }
    const debtors = custs.filter((c: any) => (c.totalOwed || 0) > 0);
    const totalDebt = debtors.reduce((sum: number, c: any) => sum + (c.totalOwed || 0), 0);

    const activeBiz = userObj?.businesses?.find((b: any) => b.id === activeBizId) || userObj?.businesses?.[0];
    const businessName = activeBiz?.name || 'Votre Boutique';

    return {
      businessName,
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
        total: totalDebt,
        customerCount: debtors.length,
      },
      stockAlertsCount: isDemoMoussa ? 2 : 0,
      recentTransactions: {
        sales: salesList.slice(0, 5),
        expenses: expensesList.slice(0, 5),
      },
      insights: [
        {
          id: 'ins-1',
          type: 'profitability',
          title: salesList.length > 0 ? 'Activité Opérationnelle !' : 'Bienvenue sur COMMERCIA ! 🚀',
          message: salesList.length > 0
            ? `${businessName} : Recettes enregistrées de ${metricsToday.revenue.toLocaleString('fr-FR')} FCFA aujourd'hui. Bénéfice net estimé : +${metricsToday.estimatedNetProfit.toLocaleString('fr-FR')} FCFA.`
            : `Bienvenue dans votre espace ${businessName} ! Cliquez sur "+ Nouvelle Vente" ou "- Dépense" pour enregistrer vos premières opérations de caisse.`,
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

  // Helper: get or init mock products per business
  const getStoredProducts = () => {
    const rawUser = localStorage.getItem('commercia_user');
    const userObj = rawUser ? JSON.parse(rawUser) : currentUser;
    const isDemoMoussa = userObj?.email === 'moussa@boutique.cm' || userObj?.id === 'user-moussa';
    const activeBizId = localStorage.getItem('activeBusinessId') || userObj?.businesses?.[0]?.id || 'default';
    const prodKey = `commercia_products_${activeBizId}`;

    const rawProd = localStorage.getItem(prodKey) || (isDemoMoussa ? localStorage.getItem('commercia_products') : null);
    if (rawProd) {
      try { return JSON.parse(rawProd); } catch (e) { /* ignore */ }
    }
    const defaultProds = isDemoMoussa ? [
      { id: 'p-1', name: 'Riz Blanc Mémé Cassé 5kg', costPrice: 2400, sellingPrice: 3000, quantity: 18, unit: 'sac', lowStockAlert: 5, isActive: true },
      { id: 'p-2', name: 'Huile de palme raffinée Mayor 1L', costPrice: 1200, sellingPrice: 1500, quantity: 3, unit: 'bouteille', lowStockAlert: 5, isActive: true },
      { id: 'p-3', name: 'Sucre en morceaux SOSUCAM 1kg', costPrice: 750, sellingPrice: 950, quantity: 24, unit: 'boîte', lowStockAlert: 5, isActive: true },
      { id: 'p-4', name: 'Lait en poudre Nido 400g', costPrice: 2200, sellingPrice: 2800, quantity: 2, unit: 'boîte', lowStockAlert: 5, isActive: true },
      { id: 'p-5', name: 'Spaghetti Mambo 500g', costPrice: 380, sellingPrice: 500, quantity: 45, unit: 'paquet', lowStockAlert: 5, isActive: true },
    ] : [];
    try { localStorage.setItem(prodKey, JSON.stringify(defaultProds)); } catch (e) { /* ignore */ }
    return defaultProds;
  };

  // Helper: get or init mock customers per business
  const getStoredCustomers = () => {
    const rawUser = localStorage.getItem('commercia_user');
    const userObj = rawUser ? JSON.parse(rawUser) : currentUser;
    const isDemoMoussa = userObj?.email === 'moussa@boutique.cm' || userObj?.id === 'user-moussa';
    const activeBizId = localStorage.getItem('activeBusinessId') || userObj?.businesses?.[0]?.id || 'default';
    const custKey = `commercia_customers_${activeBizId}`;

    const rawCust = localStorage.getItem(custKey) || (isDemoMoussa ? localStorage.getItem('commercia_customers') : null);
    if (rawCust) {
      try { return JSON.parse(rawCust); } catch (e) { /* ignore */ }
    }
    const defaultCusts = isDemoMoussa ? [
      { id: 'c-1', name: 'Maman Chantal', phone: '+237 677 11 22 33', totalBought: 125000, totalOwed: 15000 },
      { id: 'c-2', name: 'Papa Pierre', phone: '+237 699 44 55 66', totalBought: 84000, totalOwed: 13500 },
      { id: 'c-3', name: 'Tantie Rose', phone: '+237 655 77 88 99', totalBought: 96000, totalOwed: 10000 },
      { id: 'c-4', name: 'Maître Eric', phone: '+237 680 01 02 03', totalBought: 210000, totalOwed: 0 },
    ] : [];
    try { localStorage.setItem(custKey, JSON.stringify(defaultCusts)); } catch (e) { /* ignore */ }
    return defaultCusts;
  };

  // 11. SALES (GET & POST)
  if (endpoint.startsWith('/sales')) {
    const rawUser = localStorage.getItem('commercia_user');
    const userObj = rawUser ? JSON.parse(rawUser) : currentUser;
    const activeBizId = localStorage.getItem('activeBusinessId') || userObj?.businesses?.[0]?.id || 'default';
    const saleKey = `commercia_sales_${activeBizId}`;

    if (method === 'POST') {
      const raw = localStorage.getItem(saleKey) || localStorage.getItem('commercia_sales');
      const sales = raw ? JSON.parse(raw) : [];
      const newItems = body?.items || [{ name: 'Vente directe comptoir' }];

      // Calculate total if not provided directly
      const computedTotal = newItems.reduce((sum: number, it: any) => sum + ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)), 0);
      const totalAmount = Number(body?.totalAmount || computedTotal || 0);
      const paymentMethod = body?.paymentMethod || 'cash';
      const paidAmount = Number(body?.paidAmount !== undefined ? body.paidAmount : (paymentMethod === 'credit' ? 0 : totalAmount));

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
        localStorage.setItem(`commercia_products_${activeBizId}`, JSON.stringify(products));
      }

      // If credit sale, update debtor's customer account
      let customerName = undefined;
      if (body?.customerId) {
        const custs = getStoredCustomers();
        const c = custs.find((cust: any) => cust.id === body.customerId);
        if (c) {
          customerName = c.name;
          c.totalBought = (c.totalBought || 0) + totalAmount;
          if (paymentMethod === 'credit') {
            c.totalOwed = (c.totalOwed || 0) + (totalAmount - paidAmount);
          }
          localStorage.setItem(`commercia_customers_${activeBizId}`, JSON.stringify(custs));
        }
      }

      const newSale = {
        id: 's-' + Date.now(),
        totalAmount,
        paidAmount,
        paymentMethod,
        saleDate: new Date().toISOString(),
        customerId: body?.customerId || null,
        customer: customerName ? { name: customerName } : undefined,
        items: newItems,
      };
      sales.unshift(newSale);
      localStorage.setItem(saleKey, JSON.stringify(sales));
      localStorage.setItem('commercia_sales', JSON.stringify(sales));

      // Sync with active cash session if open
      const activeCashRaw = localStorage.getItem('commercia_active_cash_session');
      if (activeCashRaw) {
        try {
          const cs = JSON.parse(activeCashRaw);
          const paid = Number(newSale.paidAmount);
          const method = newSale.paymentMethod;
          if (paid > 0 && method !== 'credit') {
            const move = {
              id: 'cm-' + Date.now(),
              sessionId: cs.id,
              type: 'in',
              amount: paid,
              method,
              category: 'sale',
              description: `Vente #${newSale.id.slice(-4)}`,
              referenceId: newSale.id,
              createdAt: new Date().toISOString(),
            };
            cs.movements = cs.movements || [];
            cs.movements.unshift(move);
            if (method === 'cash') {
              cs.totalCashSales = (cs.totalCashSales || 0) + paid;
              cs.theoreticalCash = (cs.theoreticalCash || 0) + paid;
            } else {
              cs.totalMomoSales = (cs.totalMomoSales || 0) + paid;
              cs.theoreticalMomo = (cs.theoreticalMomo || 0) + paid;
            }
            localStorage.setItem('commercia_active_cash_session', JSON.stringify(cs));
          }
        } catch (e) { /* ignore */ }
      }

      return { message: 'Vente enregistrée avec succès ! 🎉', sale: newSale };
    }

    if (method === 'DELETE') {
      const parts = endpoint.split('?')[0].split('/');
      const saleId = parts[2];
      const raw = localStorage.getItem(saleKey) || localStorage.getItem('commercia_sales');
      let sales = raw ? JSON.parse(raw) : [];
      sales = sales.filter((s: any) => s.id !== saleId);
      localStorage.setItem(saleKey, JSON.stringify(sales));
      localStorage.setItem('commercia_sales', JSON.stringify(sales));
      return { message: 'Vente annulée avec succès.' };
    }

    const raw = localStorage.getItem(saleKey) || localStorage.getItem('commercia_sales');
    const list = raw ? JSON.parse(raw) : [];
    return { sales: list, pagination: { total: list.length } };
  }

  // 12. EXPENSES (GET & POST)
  if (endpoint.startsWith('/expenses')) {
    const rawUser = localStorage.getItem('commercia_user');
    const userObj = rawUser ? JSON.parse(rawUser) : currentUser;
    const activeBizId = localStorage.getItem('activeBusinessId') || userObj?.businesses?.[0]?.id || 'default';
    const expKey = `commercia_expenses_${activeBizId}`;

    if (method === 'POST') {
      const raw = localStorage.getItem(expKey) || localStorage.getItem('commercia_expenses');
      const expenses = raw ? JSON.parse(raw) : [];
      const newExpense = {
        id: 'e-' + Date.now(),
        amount: Number(body?.amount || 0),
        category: body?.category || 'Autre dépense',
        description: body?.description || '',
        expenseDate: new Date().toISOString(),
      };
      expenses.unshift(newExpense);
      localStorage.setItem(expKey, JSON.stringify(expenses));
      localStorage.setItem('commercia_expenses', JSON.stringify(expenses));

      // Sync with active cash session if open
      const activeCashRaw = localStorage.getItem('commercia_active_cash_session');
      if (activeCashRaw) {
        try {
          const cs = JSON.parse(activeCashRaw);
          const amt = Number(newExpense.amount);
          if (amt > 0) {
            const move = {
              id: 'cm-' + Date.now(),
              sessionId: cs.id,
              type: 'out',
              amount: amt,
              method: 'cash',
              category: 'expense',
              description: `Dépense: ${newExpense.category}${newExpense.description ? ' - ' + newExpense.description : ''}`,
              referenceId: newExpense.id,
              createdAt: new Date().toISOString(),
            };
            cs.movements = cs.movements || [];
            cs.movements.unshift(move);
            cs.totalCashOut = (cs.totalCashOut || 0) + amt;
            cs.theoreticalCash = (cs.theoreticalCash || 0) - amt;
            localStorage.setItem('commercia_active_cash_session', JSON.stringify(cs));
          }
        } catch (e) { /* ignore */ }
      }

      return { message: 'Dépense enregistrée avec succès ! 🎉', expense: newExpense };
    }

    if (method === 'DELETE') {
      const parts = endpoint.split('?')[0].split('/');
      const expId = parts[2];
      const raw = localStorage.getItem(expKey) || localStorage.getItem('commercia_expenses');
      let expenses = raw ? JSON.parse(raw) : [];
      expenses = expenses.filter((e: any) => e.id !== expId);
      localStorage.setItem(expKey, JSON.stringify(expenses));
      localStorage.setItem('commercia_expenses', JSON.stringify(expenses));
      return { message: 'Dépense supprimée avec succès.' };
    }

    const raw = localStorage.getItem(expKey) || localStorage.getItem('commercia_expenses');
    const list = raw ? JSON.parse(raw) : [];
    return { expenses: list, pagination: { total: list.length } };
  }

  // 13. CUSTOMERS (GET, POST & PAYMENTS)
  if (endpoint.startsWith('/customers')) {
    const rawUser = localStorage.getItem('commercia_user');
    const userObj = rawUser ? JSON.parse(rawUser) : currentUser;
    const activeBizId = localStorage.getItem('activeBusinessId') || userObj?.businesses?.[0]?.id || 'default';
    const custKey = `commercia_customers_${activeBizId}`;
    let custs = getStoredCustomers();

    if (endpoint.includes('/payment') && method === 'POST') {
      const parts = endpoint.split('/');
      const custId = parts[2];
      const cust = custs.find((c: any) => c.id === custId);
      if (cust) {
        const amt = Number(body?.amount || 0);
        cust.totalOwed = Math.max(0, (cust.totalOwed || 0) - amt);
        localStorage.setItem(custKey, JSON.stringify(custs));
        return { message: 'Règlement de dette enregistré ! 🎉', customer: cust };
      }
    }

    if (method === 'POST') {
      const newCust = {
        id: 'c-' + Date.now(),
        name: body?.name || 'Nouveau Client',
        phone: body?.phone || '',
        notes: body?.notes || '',
        totalBought: 0,
        totalOwed: 0,
      };
      custs.unshift(newCust);
      localStorage.setItem(custKey, JSON.stringify(custs));
      return newCust;
    }

    if (endpoint.includes('onlyDebtors=true')) {
      return custs.filter((c: any) => (c.totalOwed || 0) > 0);
    }
    return custs;
  }

  // 14. PRODUCTS (GET, POST & ADJUST)
  if (endpoint.startsWith('/products')) {
    const rawUser = localStorage.getItem('commercia_user');
    const userObj = rawUser ? JSON.parse(rawUser) : currentUser;
    const activeBizId = localStorage.getItem('activeBusinessId') || userObj?.businesses?.[0]?.id || 'default';
    const prodKey = `commercia_products_${activeBizId}`;
    const prods = getStoredProducts();

    if (endpoint.includes('/adjust') && method === 'POST') {
      const prodId = endpoint.split('/')[2];
      const prod = prods.find((p: any) => p.id === prodId);
      if (prod) {
        if (body?.type === 'in') prod.quantity += Number(body?.quantity || 0);
        else if (body?.type === 'out') prod.quantity = Math.max(0, prod.quantity - Number(body?.quantity || 0));
        else if (body?.type === 'adjustment') prod.quantity = Number(body?.quantity || 0);
        localStorage.setItem(prodKey, JSON.stringify(prods));
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
      localStorage.setItem(prodKey, JSON.stringify(prods));
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
    if (endpoint === '/plans/my-subscription') {
      const rawUser = localStorage.getItem('commercia_user');
      const u = rawUser ? JSON.parse(rawUser) : currentUser;
      return u?.subscription || {
        planName: 'pro',
        planDisplayName: 'Plan Pro (Croissance)',
        status: 'active',
      };
    }
    if (endpoint === '/plans/subscribe' && method === 'POST') {
      const pName = body?.planName || 'pro';
      const dispName = pName === 'business' ? 'Plan Business (Multi-boutiques)' : (pName === 'pro' ? 'Plan Pro (Croissance)' : 'Plan Gratuit');
      const rawUser = localStorage.getItem('commercia_user');
      const u = rawUser ? JSON.parse(rawUser) : currentUser;
      if (u) {
        u.subscription = {
          planName: pName,
          planDisplayName: dispName,
          status: 'active',
          features: ['Ventes & Dépenses illimitées', 'Stock temps réel', 'Copilote IA illimité'],
        };
        localStorage.setItem('commercia_user', JSON.stringify(u));
        const users = getUsersDb();
        const idx = users.findIndex(x => x.id === u.id);
        if (idx !== -1) {
          users[idx] = u;
          saveUsersDb(users);
        }
      }
      return {
        message: `Félicitations ! Votre souscription au ${dispName} a été confirmée avec succès. 🚀`,
        subscription: u?.subscription,
      };
    }
    return [
      {
        id: 'plan-free',
        name: 'free',
        displayName: 'Gratuit',
        priceMonthly: 0,
        currency: 'XAF',
        features: ['15 ventes max / jour', 'Calcul bénéfice journalier', 'Support communauté'],
      },
      {
        id: 'plan-pro',
        name: 'pro',
        displayName: 'Pro Croissance',
        priceMonthly: 4500,
        currency: 'XAF',
        features: ['Ventes illimitées', 'Gestion de stock & alertes', 'Carnet dettes clients', 'Copilote IA COMMERCIA'],
      },
      {
        id: 'plan-business',
        name: 'business',
        displayName: 'Business Multi-boutiques',
        priceMonthly: 12000,
        currency: 'XAF',
        features: ['Multi-utilisateurs & rôles', 'Rapports hebdomadaires PDF', 'Copilote IA illimité', 'Support VIP WhatsApp'],
      },
    ];
  }

  // 17. ADMIN
  if (endpoint.startsWith('/admin')) {
    if (endpoint.includes('/toggle') && method === 'PUT') {
      return { message: 'Statut du compte utilisateur mis à jour avec succès.' };
    }
    const allUsers = getUsersDb();
    return {
      metrics: {
        totalUsers: allUsers.length + 140,
        totalBusinesses: allUsers.reduce((s, u) => s + (u.businesses?.length || 1), 0) + 185,
        totalSalesVolume: 4860000,
        totalSalesCount: 320,
        activeSubscriptionsCount: 14,
        estimatedMRR: 63000,
      },
      recentUsers: allUsers.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName || '',
        email: u.email,
        phone: u.phone || '+237 600 000 000',
        createdAt: '2026-10-22',
        isActive: true,
        businesses: u.businesses || [{ name: 'Boutique' }],
        subscription: u.subscription ? { plan: { displayName: u.subscription.planDisplayName || 'Pro' } } : { plan: { displayName: 'Gratuit' } },
      })),
    };
  }

  // 18. CASH SESSIONS & MOVEMENTS
  if (endpoint.startsWith('/cash')) {
    // A. Current cash session
    if (endpoint === '/cash/current' && method === 'GET') {
      const raw = localStorage.getItem('commercia_active_cash_session');
      if (raw) {
        try {
          const session = JSON.parse(raw);
          return { isOpen: true, session };
        } catch (e) { /* ignore */ }
      }
      return { isOpen: false, session: null };
    }

    // B. Open cash session
    if (endpoint === '/cash/open' && method === 'POST') {
      const initialCash = Number(body?.initialCash || 0);
      const initialMomo = Number(body?.initialMomo || 0);
      const newSession = {
        id: 'cs-' + Date.now(),
        businessId: 'bizz-demo-1',
        userId: currentUser?.id || 'user-moussa',
        status: 'open',
        openedAt: new Date().toISOString(),
        initialCash,
        initialMomo,
        totalCashSales: 0,
        totalMomoSales: 0,
        totalCashIn: 0,
        totalCashOut: 0,
        theoreticalCash: initialCash,
        theoreticalMomo: initialMomo,
        notes: body?.notes || null,
        user: {
          firstName: currentUser?.firstName || 'Moussa',
          lastName: currentUser?.lastName || 'Ibrahim',
        },
        movements: [
          {
            id: 'cm-' + Date.now(),
            sessionId: 'cs-' + Date.now(),
            type: 'in',
            amount: initialCash,
            method: 'cash',
            category: 'opening_float',
            description: 'Fond de caisse initial à l\'ouverture',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      localStorage.setItem('commercia_active_cash_session', JSON.stringify(newSession));
      return { message: 'Caisse ouverte avec succès ! 💼', session: newSession };
    }

    // C. Add manual cash movement (in/out)
    if (endpoint === '/cash/movement' && method === 'POST') {
      const raw = localStorage.getItem('commercia_active_cash_session');
      if (!raw) {
        throw new Error('Aucune caisse n\'est actuellement ouverte.');
      }
      const sess = JSON.parse(raw);
      const amt = Number(body?.amount || 0);
      const type = body?.type === 'out' ? 'out' : 'in';
      const move = {
        id: 'cm-' + Date.now(),
        sessionId: sess.id,
        type,
        amount: amt,
        method: body?.method || 'cash',
        category: body?.category || (type === 'out' ? 'manual_withdrawal' : 'manual_deposit'),
        description: body?.description || 'Mouvement manuel de caisse',
        createdAt: new Date().toISOString(),
      };
      sess.movements = sess.movements || [];
      sess.movements.unshift(move);
      if (type === 'in') {
        sess.totalCashIn = (sess.totalCashIn || 0) + amt;
        sess.theoreticalCash = (sess.theoreticalCash || 0) + amt;
      } else {
        sess.totalCashOut = (sess.totalCashOut || 0) + amt;
        sess.theoreticalCash = (sess.theoreticalCash || 0) - amt;
      }
      localStorage.setItem('commercia_active_cash_session', JSON.stringify(sess));
      return { message: 'Mouvement de caisse enregistré !', movement: move, session: sess };
    }

    // D. Close cash session
    if (endpoint === '/cash/close' && method === 'POST') {
      const raw = localStorage.getItem('commercia_active_cash_session');
      if (!raw) {
        throw new Error('Aucune caisse n\'est actuellement ouverte.');
      }
      const sess = JSON.parse(raw);
      const actualCash = Number(body?.actualCash || 0);
      const actualMomo = body?.actualMomo !== undefined ? Number(body.actualMomo) : sess.theoreticalMomo;

      sess.status = 'closed';
      sess.closedAt = new Date().toISOString();
      sess.actualCash = actualCash;
      sess.actualMomo = actualMomo;
      sess.cashDiscrepancy = actualCash - sess.theoreticalCash;
      sess.momoDiscrepancy = actualMomo - sess.theoreticalMomo;
      sess.discrepancyReason = body?.discrepancyReason || null;
      if (body?.notes) {
        sess.notes = sess.notes ? sess.notes + '\n' + body.notes : body.notes;
      }

      // Add to past sessions
      const pastRaw = localStorage.getItem('commercia_past_cash_sessions');
      const past = pastRaw ? JSON.parse(pastRaw) : [];
      past.unshift(sess);
      localStorage.setItem('commercia_past_cash_sessions', JSON.stringify(past));
      localStorage.removeItem('commercia_active_cash_session');

      return { message: 'Caisse clôturée avec succès ! 🔒', session: sess };
    }

    // E. Past sessions list
    if (endpoint.startsWith('/cash/sessions')) {
      const pastRaw = localStorage.getItem('commercia_past_cash_sessions');
      let past = pastRaw ? JSON.parse(pastRaw) : [];
      if (past.length === 0) {
        past = [
          {
            id: 'cs-demo-prev-1',
            businessId: 'bizz-demo-1',
            status: 'closed',
            openedAt: new Date(Date.now() - 86400000).toISOString(),
            closedAt: new Date(Date.now() - 43200000).toISOString(),
            initialCash: 15000,
            initialMomo: 0,
            totalCashSales: 54000,
            totalMomoSales: 12500,
            totalCashIn: 0,
            totalCashOut: 8500,
            theoreticalCash: 60500,
            theoreticalMomo: 12500,
            actualCash: 60500,
            actualMomo: 12500,
            cashDiscrepancy: 0,
            momoDiscrepancy: 0,
            notes: 'Clôture de caisse conforme sans écart.',
            user: { firstName: 'Moussa', lastName: 'Ibrahim' },
            movements: [
              {
                id: 'cm-1',
                type: 'in',
                amount: 15000,
                method: 'cash',
                category: 'opening_float',
                description: 'Fond de caisse initial',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
              },
              {
                id: 'cm-2',
                type: 'in',
                amount: 54000,
                method: 'cash',
                category: 'sale',
                description: 'Total des ventes cash du jour',
                createdAt: new Date(Date.now() - 50000000).toISOString(),
              },
              {
                id: 'cm-3',
                type: 'out',
                amount: 8500,
                method: 'cash',
                category: 'expense',
                description: 'Achat sacs d\'emballage',
                createdAt: new Date(Date.now() - 45000000).toISOString(),
              },
            ],
          },
        ];
        localStorage.setItem('commercia_past_cash_sessions', JSON.stringify(past));
      }
      return { sessions: past };
    }
  }

  // 10. AI COPILOT & INSIGHTS (Offline / Static fallback)
  if (endpoint.startsWith('/ai/chat') || endpoint.startsWith('/analytics/ai/chat')) {
    const rawSales = localStorage.getItem('commercia_sales') || '[]';
    const rawExpenses = localStorage.getItem('commercia_expenses') || '[]';
    const rawCustomers = localStorage.getItem('commercia_customers') || '[]';
    const sales = JSON.parse(rawSales);
    const expenses = JSON.parse(rawExpenses);
    const customers = JSON.parse(rawCustomers);

    const metrics = calculateFinancialMetrics({ sales, expenses });
    const debtors = customers.filter((c: any) => (c.totalOwed || 0) > 0);
    const totalDebt = debtors.reduce((sum: number, c: any) => sum + (c.totalOwed || 0), 0);

    const message = (body?.message || '').toLowerCase();
    let reply = '';

    if (message.includes('bénéfice') || message.includes('profit') || message.includes('gagné')) {
      reply = `📊 **Situation financière (Mode Hors-Ligne) :**\n\n` +
        `• Ventes enregistrées : **${metrics.revenue.toLocaleString('fr-FR')} FCFA**\n` +
        `• Dépenses : **${(metrics.operatingExpenses + metrics.inventoryExpenses).toLocaleString('fr-FR')} FCFA**\n` +
        `• Bénéfice estimé : **${metrics.estimatedNetProfit.toLocaleString('fr-FR')} FCFA** (Taux de marge : ${metrics.grossMarginPercent}%)\n\n` +
        `💡 ${metrics.whyExplanation}`;
    } else if (message.includes('dette') || message.includes('crédit') || message.includes('qui me doit')) {
      if (debtors.length > 0) {
        const list = debtors.map((d: any) => `• **${d.name}** : ${(d.totalOwed || 0).toLocaleString('fr-FR')} FCFA`).join('\n');
        reply = `👥 **Créances clients en cours :**\n\nAu total, **${totalDebt.toLocaleString('fr-FR')} FCFA** attendent d'être encaissés :\n\n${list}\n\n` +
          `💡 Conseil : Relancez vos débiteurs pour sécuriser votre trésorerie.`;
      } else {
        reply = `🎉 **Aucune dette en attente !** Tous vos clients sont à jour.`;
      }
    } else if (message.includes('dépense') || message.includes('charge')) {
      reply = `💸 **Total des dépenses :** **${(metrics.operatingExpenses + metrics.inventoryExpenses).toLocaleString('fr-FR')} FCFA**.\n\n` +
        `• Charges de fonctionnement : ${metrics.operatingExpenses.toLocaleString('fr-FR')} FCFA\n` +
        `• Ravitaillement marchandise : ${metrics.inventoryExpenses.toLocaleString('fr-FR')} FCFA`;
    } else {
      reply = `Bonjour ! Je suis votre Copilote COMMERCIA 🤖.\n\n` +
        `Activité enregistrée :\n` +
        `• Chiffre d'affaires : **${metrics.revenue.toLocaleString('fr-FR')} FCFA**\n` +
        `• Bénéfice estimé : **${metrics.estimatedNetProfit.toLocaleString('fr-FR')} FCFA**\n` +
        `• Créances clients : **${totalDebt.toLocaleString('fr-FR')} FCFA**\n\n` +
        `Comment puis-je vous aider ? (Exemples : "Quel est mon bénéfice ?", "Qui me doit de l'argent ?", "Analyse des dépenses")`;
    }

    return { reply };
  }

  if (endpoint.startsWith('/ai/insights')) {
    return [
      {
        id: 'ins-mock-1',
        type: 'profitability',
        title: 'Rentabilité commerciale',
        message: 'Votre activité génère des marges saines. Continuez à enregistrer vos flux quotidiens.',
        severity: 'success',
        isRead: false,
      },
    ];
  }

  // Default fallback
  return { status: 'ok', mock: true };
}
