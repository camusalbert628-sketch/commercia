import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initialisation des plans d\'abonnement COMMERCIA...');

  // 1. Plans d'abonnement officiels
  const plans = [
    {
      name: 'free',
      displayName: 'Gratuit',
      description: 'Pour démarrer et tester la gestion simplifiée',
      priceMonthly: 0,
      priceYearly: 0,
      features: JSON.stringify([
        '15 ventes par jour',
        'Vente comptoir express & Dépenses',
        'Carnet clients & dettes de base',
        'Gestion de stock simple',
        'Calcul du bénéfice journalier',
      ]),
      limits: JSON.stringify({ salesPerDay: 15, aiQueries: 0, multiShop: false }),
      sortOrder: 1,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      description: 'Ventes illimitées et modules spécialisés métier',
      priceMonthly: 4500,
      priceYearly: 45000,
      features: JSON.stringify([
        'Ventes & dépenses illimitées',
        'Modules Métiers (Lots Friperie, Restauration/Portions, Atelier/Devis, Mobile Money)',
        'Gestion complète des créances & relances',
        'Suivi de trésorerie prévisionnelle',
        'Gestion des livraisons & coursier',
        'Copilote IA COMMERCIA',
      ]),
      limits: JSON.stringify({ salesPerDay: -1, aiQueries: -1, multiShop: false }),
      sortOrder: 2,
    },
    {
      name: 'business',
      displayName: 'Business Multi-Activités',
      description: 'Pour entrepreneurs avec plusieurs points de vente ou collaborateurs',
      priceMonthly: 12000,
      priceYearly: 120000,
      features: JSON.stringify([
        'Tout le plan Pro',
        'Multi-boutiques & points de vente',
        'Comptes caissiers & permissions',
        'Consolidation multi-activités',
        'Support prioritaire 7j/7',
      ]),
      limits: JSON.stringify({ salesPerDay: -1, aiQueries: -1, multiShop: true }),
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

  console.log('✅ Plans d\'abonnement initialisés avec succès.');

  // 2. Compte Super Administrateur Maître (Master Admin)
  const bcrypt = require('bcryptjs');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@commercia.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'CommerciaAdmin2026!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const businessPlan = await prisma.plan.findUnique({ where: { name: 'business' } });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      isAdmin: true,
      isActive: true,
      emailVerified: true,
      firstName: 'Alexandre',
      lastName: 'Dumas (Superviseur)',
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Alexandre',
      lastName: 'Dumas (Superviseur)',
      phone: '+237 690 000 000',
      isAdmin: true,
      isActive: true,
      emailVerified: true,
      locale: 'fr',
      currency: 'XAF',
    },
  });

  // Abonnement Business permanent pour l'administrateur
  if (businessPlan) {
    const permanentEndDate = new Date();
    permanentEndDate.setFullYear(permanentEndDate.getFullYear() + 20); // 20 ans

    await prisma.subscription.upsert({
      where: { userId: adminUser.id },
      update: {
        planId: businessPlan.id,
        status: 'active',
        endDate: permanentEndDate,
      },
      create: {
        userId: adminUser.id,
        planId: businessPlan.id,
        status: 'active',
        endDate: permanentEndDate,
      },
    });
  }

  // Boutique témoin d'administration
  const existingBusinessMember = await prisma.businessMember.findFirst({
    where: { userId: adminUser.id },
  });

  if (!existingBusinessMember) {
    const adminShop = await prisma.business.create({
      data: {
        name: 'COMMERCIA HQ (Siège & Flagship)',
        sector: 'commerce',
        profileId: 'epicerie_alimentation',
        trackingMode: 'complet',
        currency: 'XAF',
        activeModules: JSON.stringify(['sales', 'expenses', 'stock', 'cash', 'credits', 'commercial_lots', 'copilot_ai']),
        salesChannels: JSON.stringify(['boutique', 'whatsapp', 'livraison']),
        members: {
          create: {
            userId: adminUser.id,
            role: 'owner',
          },
        },
        settings: {
          create: {
            enableStock: true,
            enableCredits: true,
          },
        },
      },
    });
    console.log(`✅ Boutique témoin créée pour le Superviseur: ${adminShop.name}`);
  }

  console.log(`👑 Super Administrateur opérationnel: ${adminEmail} (Mot de passe: ${adminPassword})`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
