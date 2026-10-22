// RS-BIZZ In-Memory & LocalStorage Mock Backend
// Ensures zero-downtime demonstration on static cloud deployments (Vercel)

export function handleMockRequest(endpoint: string, method: string, body?: any): any {
  const storedUser = localStorage.getItem('rsbizz_user');
  let currentUser = storedUser ? JSON.parse(storedUser) : null;

  // 1. AUTH / LOGIN
  if (endpoint.startsWith('/auth/login') && method === 'POST') {
    const email = body?.email || '';
    const isAdmin = email.includes('admin');
    const user = {
      id: isAdmin ? 'admin-1' : 'user-moussa',
      email: email || (isAdmin ? 'admin@rsbizz.com' : 'moussa@boutique.cm'),
      firstName: isAdmin ? 'Admin' : 'Moussa',
      lastName: isAdmin ? 'RS-BIZZ' : 'Ibrahim',
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

    localStorage.setItem('rsbizz_user', JSON.stringify(user));
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
      email: body?.email || 'nouveau@rsbizz.com',
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
    localStorage.setItem('rsbizz_user', JSON.stringify(user));
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
      localStorage.setItem('rsbizz_user', JSON.stringify(currentUser));
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
      localStorage.setItem('rsbizz_user', JSON.stringify(currentUser));
    }
    localStorage.setItem('activeBusinessId', newBizz.id);

    return {
      message: 'Activité créée avec succès ! 🎉',
      business: newBizz,
    };
  }

  // 5. DASHBOARD
  if (endpoint === '/dashboard' && method === 'GET') {
    const rawSales = localStorage.getItem('rsbizz_sales');
    const localSales = rawSales ? JSON.parse(rawSales) : [];
    const rawExpenses = localStorage.getItem('rsbizz_expenses');
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

    const totalSales = salesList.reduce((acc: number, s: any) => acc + (s.totalAmount || 0), 0);
    const totalExpenses = expensesList.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
    const profit = totalSales - totalExpenses;

    return {
      today: {
        sales: totalSales,
        salesCount: salesList.length,
        expenses: totalExpenses,
        profit,
      },
      week: {
        sales: totalSales + 120000,
        expenses: totalExpenses + 60000,
        profit: profit + 60000,
      },
      month: {
        sales: totalSales + 580000,
        expenses: totalExpenses + 240000,
        profit: profit + 340000,
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
          message: `Votre activité génère un flux de trésorerie net positif aujourd'hui (+${profit.toLocaleString('fr-FR')} FCFA). Continuez ainsi !`,
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
      reply: 'Bonjour ! Je suis votre Copilote Financier RS-BIZZ. Votre solde estimé est au vert. Posez-moi des questions sur vos marges, vos stocks ou vos clients débiteurs ! 🚀',
    };
  }

  // 11. SALES (GET & POST)
  if (endpoint.startsWith('/sales')) {
    if (method === 'POST') {
      const raw = localStorage.getItem('rsbizz_sales');
      const sales = raw ? JSON.parse(raw) : [];
      const newSale = {
        id: 's-' + Date.now(),
        totalAmount: Number(body?.totalAmount || 0),
        paidAmount: Number(body?.paidAmount || body?.totalAmount || 0),
        paymentMethod: body?.paymentMethod || 'cash',
        saleDate: new Date().toISOString(),
        items: body?.items || [{ name: 'Vente directe comptoir' }],
      };
      sales.unshift(newSale);
      localStorage.setItem('rsbizz_sales', JSON.stringify(sales));
      return { message: 'Vente enregistrée avec succès ! 🎉', sale: newSale };
    }
    const raw = localStorage.getItem('rsbizz_sales');
    return raw ? JSON.parse(raw) : [];
  }

  // 12. EXPENSES (GET & POST)
  if (endpoint.startsWith('/expenses')) {
    if (method === 'POST') {
      const raw = localStorage.getItem('rsbizz_expenses');
      const expenses = raw ? JSON.parse(raw) : [];
      const newExpense = {
        id: 'e-' + Date.now(),
        amount: Number(body?.amount || 0),
        category: body?.category || 'Autre dépense',
        description: body?.description || '',
        expenseDate: new Date().toISOString(),
      };
      expenses.unshift(newExpense);
      localStorage.setItem('rsbizz_expenses', JSON.stringify(expenses));
      return { message: 'Dépense enregistrée !', expense: newExpense };
    }
    const raw = localStorage.getItem('rsbizz_expenses');
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

  // 14. PRODUCTS
  if (endpoint.startsWith('/products')) {
    return [
      { id: 'p-1', name: 'Riz Blanc Mémé Cassé 5kg', costPrice: 2400, sellingPrice: 3000, quantity: 18, unit: 'sac' },
      { id: 'p-2', name: 'Huile de palme raffinée Mayor 1L', costPrice: 1200, sellingPrice: 1500, quantity: 3, unit: 'bouteille' },
      { id: 'p-3', name: 'Sucre en morceaux SOSUCAM 1kg', costPrice: 750, sellingPrice: 950, quantity: 24, unit: 'boîte' },
      { id: 'p-4', name: 'Lait en poudre Nido 400g', costPrice: 2200, sellingPrice: 2800, quantity: 2, unit: 'boîte' },
      { id: 'p-5', name: 'Spaghetti Mambo 500g', costPrice: 380, sellingPrice: 500, quantity: 45, unit: 'paquet' },
    ];
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
        features: JSON.stringify(['Ventes illimitées', 'Gestion de stock & alertes', 'Carnet dettes clients', 'Copilote IA RS-BIZZ']),
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
