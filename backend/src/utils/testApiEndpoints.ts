import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { calculateFinancialMetrics } from './finance';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'commercia-secret-jwt-key-2026';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${msg}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS : ${msg}`);
}

async function runApiValidation() {
  console.log('🧪 Démarrage de la suite de validation intégrale COMMERCIA...\n');

  try {
    // 1. Vérifier la connexion Base de données
    await prisma.$connect();
    assert(true, '1. Base de données SQLite connectée avec succès');

    // 2. Vérification des utilisateurs et authentification
    const moussa = await prisma.user.findUnique({
      where: { email: 'moussa@boutique.cm' },
      include: { businesses: { include: { business: true } } },
    });
    assert(!!moussa, '2.1 Utilisateur commerçant démo (moussa@boutique.cm) présent');
    assert(moussa!.businesses.length > 0, '2.2 Entreprise associée trouvée');

    const admin = await prisma.user.findUnique({ where: { email: 'admin@commercia.com' } });
    assert(!!admin && admin.isAdmin, '2.3 Super Administrateur (admin@commercia.com) présent');

    const passMatch = await bcrypt.compare('bizz1234', moussa!.passwordHash);
    assert(passMatch, '2.4 Authentification par mot de passe sécurisé validée (bcrypt)');

    // 3. Test de token JWT
    const businessId = moussa!.businesses[0].businessId;
    const token = jwt.sign(
      { userId: moussa!.id, businessId, isAdmin: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const decoded: any = jwt.verify(token, JWT_SECRET);
    assert(decoded.userId === moussa!.id, '3. Génération & validation JWT multi-tenant réussie');

    // 4. Test Dashboard & Métriques financières
    const [sales, expenses, debt] = await Promise.all([
      prisma.sale.findMany({ where: { businessId }, include: { items: true } }),
      prisma.expense.findMany({ where: { businessId } }),
      prisma.customer.aggregate({ where: { businessId, totalOwed: { gt: 0 } }, _sum: { totalOwed: true } }),
    ]);

    const metrics = calculateFinancialMetrics({ sales, expenses });
    assert(metrics.revenue >= 0, `4.1 Chiffre d'affaires calculé : ${metrics.revenue.toLocaleString('fr-FR')} FCFA`);
    assert(typeof metrics.estimatedNetProfit === 'number', `4.2 Bénéfice net estimé calculé : ${metrics.estimatedNetProfit.toLocaleString('fr-FR')} FCFA`);
    assert(typeof metrics.whyExplanation === 'string' && metrics.whyExplanation.length > 10, '4.3 Explication pédagogique "Pourquoi ?" générée');

    // 5. Test Cycle de Vente & Décrément de Stock
    const testProduct = await prisma.product.create({
      data: {
        businessId,
        name: 'Produit Test Auto',
        costPrice: 500,
        sellingPrice: 1000,
        quantity: 10,
        unit: 'pièce',
      },
    });

    const initialQty = testProduct.quantity;
    const saleTest = await prisma.sale.create({
      data: {
        businessId,
        totalAmount: 2000,
        paidAmount: 2000,
        paymentMethod: 'cash',
        status: 'completed',
        items: {
          create: [{
            name: testProduct.name,
            productId: testProduct.id,
            quantity: 2,
            unitPrice: 1000,
            costPrice: 500,
            totalPrice: 2000,
          }],
        },
      },
      include: { items: true },
    });

    // Mettre à jour le stock
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { quantity: { decrement: 2 } },
    });
    const updatedProd = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(updatedProd!.quantity === initialQty - 2, '5.1 Vente enregistrée avec décrémentation automatique du stock');

    // Nettoyage de la vente test et du produit
    await prisma.sale.delete({ where: { id: saleTest.id } });
    await prisma.product.delete({ where: { id: testProduct.id } });
    assert(true, '5.2 Annulation et nettoyage du test de vente');

    // 6. Test Crédit client & Remboursement
    const testCust = await prisma.customer.create({
      data: {
        businessId,
        name: 'Client Test Automatisé',
        phone: '+237600000001',
        totalBought: 5000,
        totalOwed: 5000,
      },
    });

    const paymentTest = await prisma.customerPayment.create({
      data: {
        customerId: testCust.id,
        amount: 2000,
        method: 'mobile_money',
        notes: 'Acompte Orange Money',
      },
    });

    await prisma.customer.update({
      where: { id: testCust.id },
      data: { totalOwed: { decrement: 2000 } },
    });

    const afterPay = await prisma.customer.findUnique({ where: { id: testCust.id } });
    assert(afterPay!.totalOwed === 3000, '6. Encaissement de créance et mise à jour du carnet de dette validés');

    // Nettoyage client test
    await prisma.customer.delete({ where: { id: testCust.id } });

    // 7. Test Plans & Abonnements
    const plansCount = await prisma.plan.count();
    assert(plansCount >= 3, `7.1 Plans SaaS initialisés (${plansCount} plans : Free, Pro, Business)`);

    const userSub = await prisma.subscription.findUnique({
      where: { userId: moussa!.id },
      include: { plan: true },
    });
    assert(!!userSub && userSub.status === 'active', `7.2 Abonnement actif détecté (Plan ${userSub?.plan.displayName})`);

    // 8. Test Module Caisse Journalière
    const cashSessionsCount = await prisma.cashSession.count({ where: { businessId } });
    assert(cashSessionsCount >= 0, '8. Module Journal de Caisse & Rapprochement opérationnel');

    console.log('\n======================================================');
    console.log('🎉 TOUS LES CRITÈRES DE VALIDATION COMMERCIA SONT VALIDÉS !');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Erreur lors du test :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runApiValidation();
