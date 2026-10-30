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
  console.log('ℹ️ Aucun compte fictif n\'est injecté. La base de données reste 100% vierge pour les vrais commerçants.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
