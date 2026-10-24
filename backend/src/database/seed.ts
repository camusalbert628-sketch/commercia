import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Amorçage de la base de données COMMERCIA...');

  // 1. Plans d'abonnement
  const plans = [
    {
      name: 'free',
      displayName: 'Gratuit',
      description: 'Pour démarrer et tester la gestion simplifiée',
      priceMonthly: 0,
      priceYearly: 0,
      features: JSON.stringify([
        'Ventes & dépenses illimitées (30 jours)',
        'Dashboard financier de base',
        'Calcul du bénéfice journalier',
        'Historique 30 jours',
      ]),
      limits: JSON.stringify({ salesPerMonth: 100, aiQueries: 5, historyDays: 30, stockEnabled: false }),
      sortOrder: 1,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      description: 'Idéal pour les commerces actifs et gestion des crédits',
      priceMonthly: 5000,
      priceYearly: 50000,
      features: JSON.stringify([
        'Tout le plan Gratuit',
        'Gestion complète des crédits clients',
        'Relances automatiques de dettes',
        'Gestion de stock & alertes ruptures',
        'Copilote IA COMMERCIA (illimité)',
        'Historique illimité et export PDF/Excel',
      ]),
      limits: JSON.stringify({ salesPerMonth: -1, aiQueries: -1, historyDays: -1, stockEnabled: true }),
      sortOrder: 2,
    },
    {
      name: 'business',
      displayName: 'Business Multi-Activités',
      description: 'Pour entrepreneurs avec plusieurs points de vente ou boutiques',
      priceMonthly: 15000,
      priceYearly: 150000,
      features: JSON.stringify([
        'Tout le plan Pro',
        'Multi-activités / boutiques',
        'Comptes employés & gestion des permissions',
        'Rapport hebdomadaire automatique sur WhatsApp',
        'Support prioritaire 7j/7',
      ]),
      limits: JSON.stringify({ salesPerMonth: -1, aiQueries: -1, historyDays: -1, stockEnabled: true, multiShop: true }),
      sortOrder: 3,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }
  const proPlan = await prisma.plan.findUnique({ where: { name: 'pro' } });

  // 2. Administrateur
  const adminPassword = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@commercia.com' },
    update: {},
    create: {
      email: 'admin@commercia.com',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+237690000000',
      isAdmin: true,
    },
  });

  // 3. Utilisateur commerçant test
  const userPassword = await bcrypt.hash('bizz1234', 12);
  const moussa = await prisma.user.upsert({
    where: { email: 'moussa@boutique.cm' },
    update: {},
    create: {
      email: 'moussa@boutique.cm',
      passwordHash: userPassword,
      firstName: 'Moussa',
      lastName: 'Ibrahim',
      phone: '+237677112233',
      locale: 'fr',
      currency: 'XAF',
    },
  });

  // Abonnement Pro pour Moussa adossé à une transaction réelle
  if (proPlan) {
    const payment = await prisma.payment.upsert({
      where: { reference: 'COMMERCIA-DEMO-MOUSSA-PRO' },
      update: {},
      create: {
        userId: moussa.id,
        planId: proPlan.id,
        amount: 4500,
        currency: 'XAF',
        method: 'mobile_money',
        provider: 'cinetpay',
        status: 'completed',
        reference: 'COMMERCIA-DEMO-MOUSSA-PRO',
        providerReference: 'CP-MOMO-DEMO-2026',
        verifiedAt: new Date(),
        phoneNumber: '+237677112233',
      },
    });

    await prisma.subscription.upsert({
      where: { userId: moussa.id },
      update: { planId: proPlan.id, status: 'active', lastPaymentId: payment.id },
      create: {
        userId: moussa.id,
        planId: proPlan.id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastPaymentId: payment.id,
      },
    });
  }

  // 4. Boutique de Moussa
  let business = await prisma.business.findFirst({
    where: { members: { some: { userId: moussa.id } } },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: 'Épicerie & Alimentation Moussa',
        sector: 'commerce',
        trackingMode: 'complet',
        dailySalesEstimate: '50 000 - 150 000 FCFA',
        address: 'Marché Central, Douala',
        phone: '+237677112233',
        members: {
          create: {
            userId: moussa.id,
            role: 'owner',
          },
        },
        settings: {
          create: {
            enableStock: true,
            enableCredits: true,
            enableNotifications: true,
            lowStockThreshold: 5,
          },
        },
      },
    });
  }

  // 5. Catégories de dépenses
  const expenseCategories = [
    { name: 'Marchandise & Ravitaillement', icon: '🏬' },
    { name: 'Transport & Moto-taxi', icon: '🛵' },
    { name: 'Loyer boutique', icon: '🏠' },
    { name: 'Électricité Eneo & Eau', icon: '💡' },
    { name: 'Téléphone & Crédit internet', icon: '📱' },
    { name: 'Emballages & Plastiques', icon: '📦' },
    { name: 'Autre dépense', icon: '📋' },
  ];

  for (const cat of expenseCategories) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { businessId: business.id, name: cat.name },
    });
    if (!existing) {
      await prisma.expenseCategory.create({
        data: {
          businessId: business.id,
          name: cat.name,
          icon: cat.icon,
        },
      });
    }
  }

  // 6. Produits / Stock
  const products = [
    { name: 'Huile de palme raffinée Mayor 1L', costPrice: 1200, sellingPrice: 1500, quantity: 24, unit: 'bouteille' },
    { name: 'Riz Blanc Mémé Cassé 5kg', costPrice: 2800, sellingPrice: 3500, quantity: 15, unit: 'sac' },
    { name: 'Savon de ménage BF 400g', costPrice: 350, sellingPrice: 500, quantity: 4, unit: 'morceau' }, // low stock
    { name: 'Sucre en morceaux SOSUCAM 1kg', costPrice: 800, sellingPrice: 950, quantity: 30, unit: 'paquet' },
    { name: 'Spaghetti Mambo 500g', costPrice: 380, sellingPrice: 500, quantity: 45, unit: 'paquet' },
    { name: 'Jus Top Ananas 60cl', costPrice: 320, sellingPrice: 450, quantity: 3, unit: 'bouteille' }, // low stock
    { name: 'Lait en poudre Nido 400g', costPrice: 2400, sellingPrice: 2900, quantity: 12, unit: 'boîte' },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { businessId: business.id, name: p.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          businessId: business.id,
          ...p,
          lowStockAlert: 5,
        },
      });
    }
  }

  // 7. Clients & Crédits
  const customers = [
    { name: 'Maman Chantal', phone: '+237699112233', debt: 12500, notes: 'Voisine du quartier, paie fin de mois' },
    { name: 'Papa Jean (Atelier)', phone: '+237677445566', debt: 8000, notes: 'Menuisier à côté' },
    { name: 'Serge Kouam', phone: '+237655889900', debt: 0, notes: 'Client fidèle au comptant' },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({
      where: { businessId: business.id, name: c.name },
    });
    if (!existing) {
      const cust = await prisma.customer.create({
        data: {
          businessId: business.id,
          name: c.name,
          phone: c.phone,
          notes: c.notes,
          totalBought: c.debt + 25000,
          totalOwed: c.debt,
        },
      });

      if (c.debt > 0) {
        await prisma.customerDebt.create({
          data: {
            customerId: cust.id,
            amount: c.debt,
            description: 'Achats divers en attente de règlement',
          },
        });
      }
    }
  }

  // 8. Dépenses d'exemple
  const today = new Date();
  const sampleExpenses = [
    { amount: 15000, category: 'Transport & Moto-taxi', description: 'Livraison cargaison Sandaga', date: today },
    { amount: 2500, category: 'Emballages & Plastiques', description: 'Lot de sachets biodégradables', date: today },
    { amount: 45000, category: 'Loyer boutique', description: 'Avance loyer du mois', date: new Date(Date.now() - 3 * 24 * 3600 * 1000) },
  ];

  for (const exp of sampleExpenses) {
    await prisma.expense.create({
      data: {
        businessId: business.id,
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        expenseDate: exp.date,
      },
    });
  }

  // 9. Ventes d'exemple
  const sampleSales = [
    {
      totalAmount: 14000,
      paidAmount: 14000,
      paymentMethod: 'cash',
      items: [
        { name: 'Huile de palme raffinée Mayor 1L', quantity: 4, unitPrice: 1500, costPrice: 1200, totalPrice: 6000 },
        { name: 'Riz Blanc Mémé Cassé 5kg', quantity: 2, unitPrice: 3500, costPrice: 2800, totalPrice: 7000 },
        { name: 'Spaghetti Mambo 500g', quantity: 2, unitPrice: 500, costPrice: 380, totalPrice: 1000 },
      ],
      date: today,
    },
    {
      totalAmount: 7350,
      paidAmount: 7350,
      paymentMethod: 'mobile_money',
      items: [
        { name: 'Sucre en morceaux SOSUCAM 1kg', quantity: 3, unitPrice: 950, costPrice: 800, totalPrice: 2850 },
        { name: 'Lait en poudre Nido 400g', quantity: 1, unitPrice: 2900, costPrice: 2400, totalPrice: 2900 },
        { name: 'Savon de ménage BF 400g', quantity: 2, unitPrice: 500, costPrice: 350, totalPrice: 1000 },
        { name: 'Jus Top Ananas 60cl', quantity: 1, unitPrice: 450, costPrice: 320, totalPrice: 450 },
      ],
      date: today,
    },
    {
      totalAmount: 12500,
      paidAmount: 0,
      paymentMethod: 'credit',
      items: [
        { name: 'Huile de palme raffinée Mayor 1L', quantity: 5, unitPrice: 1500, costPrice: 1200, totalPrice: 7500 },
        { name: 'Spaghetti Mambo 500g', quantity: 10, unitPrice: 500, costPrice: 380, totalPrice: 5000 },
      ],
      date: new Date(Date.now() - 24 * 3600 * 1000),
    },
  ];

  for (const s of sampleSales) {
    await prisma.sale.create({
      data: {
        businessId: business.id,
        totalAmount: s.totalAmount,
        paidAmount: s.paidAmount,
        paymentMethod: s.paymentMethod,
        saleDate: s.date,
        items: {
          create: s.items,
        },
      },
    });
  }

  // 10. Notifications
  await prisma.notification.create({
    data: {
      userId: moussa.id,
      businessId: business.id,
      type: 'stock_low',
      title: 'Alerte stock faible',
      message: 'Attention : Il ne vous reste que 3 bouteilles de Jus Top Ananas et 4 morceaux de Savon BF.',
      icon: '⚠️',
    },
  });

  await prisma.notification.create({
    data: {
      userId: moussa.id,
      businessId: business.id,
      type: 'debt_reminder',
      title: 'Relance crédit client',
      message: 'Maman Chantal a un crédit en attente de 12 500 FCFA depuis plus de 7 jours.',
      icon: '⏰',
    },
  });

  console.log('✅ Base de données initialisée avec succès !');
  console.log('👉 Utilisateur Test : moussa@boutique.cm / bizz1234');
  console.log('👉 Administrateur   : admin@commercia.com / admin1234');
}

main()
  .catch((e) => {
    console.error('❌ Erreur de seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
