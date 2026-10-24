import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function repairAccounts() {
  console.log('🔄 Démarrage de l\'audit et de la régularisation des comptes...');

  let freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
  if (!freePlan) {
    freePlan = await prisma.plan.create({
      data: {
        name: 'free',
        displayName: 'Gratuit',
        description: 'Fonctionnalités essentielles pour démarrer',
        priceMonthly: 0,
        priceYearly: 0,
        features: JSON.stringify([
          '15 ventes par jour max',
          'Enregistrement des dépenses de base',
          'Tableau de bord financier simplifié',
          'Calcul du bénéfice journalier estimé',
        ]),
        limits: JSON.stringify({ salesPerDay: 15, aiQueries: 0, stockEnabled: false, creditEnabled: false }),
        sortOrder: 1,
      },
    });
  }

  const proPlan = await prisma.plan.findUnique({ where: { name: 'pro' } });

  const users = await prisma.user.findMany({
    include: {
      subscription: { include: { plan: true } },
      payments: true,
    },
  });

  const now = new Date();

  for (const user of users) {
    if (user.isAdmin) {
      console.log(`🛡️ Utilisateur Admin ignoré : ${user.email}`);
      continue;
    }

    // Vérifier les paiements réels confirmés
    const completedPayments = user.payments.filter((p: any) => p.status === 'completed');

    if (completedPayments.length > 0) {
      console.log(`✅ Utilisateur avec paiement confirmé trouvé : ${user.email} (${completedPayments.length} paiement(s))`);
      // Vérifier si l'abonnement est encore dans sa période de validité
      if (user.subscription && user.subscription.endDate && new Date(user.subscription.endDate) > now) {
        console.log(`   -> Abonnement Pro actif valide conservé.`);
      } else if (user.subscription) {
        console.log(`   -> Abonnement échu : passage au statut 'expired'.`);
        await prisma.subscription.update({
          where: { id: user.subscription.id },
          data: { status: 'expired' },
        });
      }
    } else {
      // Aucun paiement confirmé existant !
      // Si l'utilisateur était faussement marqué 'pro' sans paiement :
      // Pour le compte démo Moussa : nous enregistrons une transaction initiale pour traçabilité
      if (user.email === 'moussa@boutique.cm' && proPlan) {
        console.log(`💳 Création d'une transaction de paiement initiale pour le compte démo Moussa`);
        const p = await prisma.payment.create({
          data: {
            userId: user.id,
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
        await prisma.subscription.update({
          where: { userId: user.id },
          data: {
            status: 'active',
            lastPaymentId: p.id,
          },
        });
      } else {
        console.log(`⚠️ Compte sans paiement confirmé régularisé vers Free : ${user.email}`);
        if (user.subscription) {
          await prisma.subscription.update({
            where: { id: user.subscription.id },
            data: {
              planId: freePlan.id,
              status: 'free',
              endDate: null,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              planId: freePlan.id,
              status: 'free',
              endDate: null,
            },
          });
        }
      }
    }
  }

  console.log('🎉 Audit et régularisation terminés avec succès.');
}

repairAccounts().finally(() => prisma.$disconnect());
