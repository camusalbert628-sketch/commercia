import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaignId = '2e095d73-cbef-46f4-95e7-44c622434cfd'; // "Lot de 150 téléphones portables"
  const businessId = '89d4c664-828f-499f-b27a-df4f6829dc19';

  console.log('1. Nettoyage des anciens articles textiles générés par défaut...');
  await prisma.lotStockMovement.deleteMany({ where: { campaignId } });
  await prisma.lotSaleItem.deleteMany({ where: { sale: { campaignId } } });
  await prisma.lotSale.deleteMany({ where: { campaignId } });
  await prisma.lotItem.deleteMany({ where: { campaignId } });

  console.log('2. Création de l\'article réel "Téléphone Redmi 14C"...');
  // Coût unitaire du lot: 820 000 FCFA / 150 = ~5 466.67 FCFA
  const unitCost = Math.round((820000 / 150) * 100) / 100;
  
  const redmiItem = await prisma.lotItem.create({
    data: {
      campaignId,
      businessId,
      name: 'Téléphone Redmi 14C',
      reference: 'REDMI-14C-150',
      category: 'Smartphones Android',
      variant: 'Standard / Neuf',
      quantityReceived: 150,
      quantitySold: 5,
      quantityDefective: 0,
      quantityRemaining: 145,
      estimatedSellingPrice: 85000,
      unitCost,
      notes: 'Lot de 150 téléphones Redmi 14C achetés auprès d\'ALIBABA',
    }
  });

  console.log('Article créé avec succès:', redmiItem.id, redmiItem.name);

  console.log('3. Enregistrement de la vente réelle des 5 téléphones à 85 000 FCFA (425 000 FCFA)...');
  const unitPrice = 85000;
  const quantity = 5;
  const totalAmount = unitPrice * quantity; // 425 000 FCFA
  const totalCost = unitCost * quantity;    // ~27 333.35 FCFA
  const grossProfit = totalAmount - totalCost;

  const sale = await prisma.lotSale.create({
    data: {
      campaignId,
      businessId,
      saleDate: new Date('2026-10-25T06:47:03.031Z'),
      channel: 'comptoir',
      customerName: 'Client Comptoir',
      customerPhone: null,
      totalAmount,
      discountAmount: 0,
      netAmount: totalAmount,
      amountPaid: totalAmount,
      amountDue: 0,
      variableCosts: 0,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      notes: 'Vente de 5 téléphones Redmi 14C au comptoir',
      items: {
        create: [
          {
            lotItemId: redmiItem.id,
            quantity,
            unitPrice,
            unitCost,
            totalPrice: totalAmount,
            totalCost,
            grossProfit,
          }
        ]
      }
    },
    include: { items: true }
  });

  console.log('Vente enregistrée sur le lot:', sale.id, 'Montant:', sale.netAmount);

  console.log('4. Enregistrement du mouvement de stock correspondant...');
  await prisma.lotStockMovement.create({
    data: {
      campaignId,
      lotItemId: redmiItem.id,
      type: 'sale',
      quantity: -5,
      reason: `Vente comptoir - 5x Téléphone Redmi 14C (${totalAmount.toLocaleString('fr-FR')} FCFA) - Stock initial: 150, Vendu: 5, Restant: 145`,
    }
  });

  console.log('5. Mise à jour de la campagne avec horodatage initial...');
  await prisma.commercialLotCampaign.update({
    where: { id: campaignId },
    data: {
      goodsType: 'Téléphones portables / Électronique',
      status: 'active',
      depletedAt: null,
    }
  });

  console.log('--- RECAPITULATIF REUSSI ---');
  console.log('Lot : Lot de 150 téléphones portables');
  console.log('Article : Téléphone Redmi 14C (Reçu: 150, Vendu: 5, Restant: 145)');
  console.log('Vente : 5 pcs x 85 000 FCFA = 425 000 FCFA encaissés');
  console.log('Investissement total : 820 000 FCFA');
  console.log('Capital récupéré : 425 000 FCFA (51.8% remboursé)');
  console.log('Reste à récupérer : 395 000 FCFA (soit environ 5 articles à 85 000 FCFA)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
