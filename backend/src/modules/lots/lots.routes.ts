import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';

const router = Router();
router.use(authenticate);

// Middleware checking Pro / Business subscription or Admin role
async function requireProSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentification requise.' });
    }

    const subDetails = await getUserSubscriptionDetails(req.prisma, userId);
    if (!subDetails.isPro && !subDetails.isAdmin) {
      return res.status(403).json({
        error: 'PRO_REQUIRED',
        message: 'Le module « Gestion des lots commerciaux » est réservé aux abonnés COMMERCIA PRO et BUSINESS.',
        subscription: subDetails,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 1. GET /api/lots/info - Informations publiques sur le module (accessible à tous)
// -------------------------------------------------------------
router.get('/info', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  let isPro = false;
  if (userId) {
    try {
      const sub = await getUserSubscriptionDetails(req.prisma, userId);
      isPro = Boolean(sub.isPro || sub.isAdmin);
    } catch (_) {}
  }

  res.json({
    moduleName: 'Gestion des lots commerciaux',
    version: '1.0.0-pro',
    isPro,
    benefits: [
      {
        title: 'Rentabilité unitaire au centime',
        description: 'Décomposez n\'importe quel achat en gros (balles de friperie, cartons Alibaba, containers) en articles individuels avec leur coût de revient exact.',
      },
      {
        title: 'Ventilation automatique des frais d\'approche',
        description: 'Répartissez intelligemment les frais de fret, douane, manutention, change et transport au prorata des articles ou de leur valeur marchande.',
      },
      {
        title: 'Suivi du point mort de chaque lot',
        description: 'Visualisez en temps réel le taux de récupération de votre investissement initial : sachez exactement à partir de quelle vente votre balle commence à générer du bénéfice pur.',
      },
      {
        title: 'Ventes multi-canaux & déstockage',
        description: 'Vendez vos articles au comptoir, sur WhatsApp, Facebook ou TikTok tout en décrémentant le stock restant et en calculant votre marge nette réelle.',
      },
      {
        title: 'Gestion simultanée de plusieurs campagnes',
        description: 'Gérez en parallèle vos balles de vêtements, vos lots de téléphones et vos cartons de chaussures sans jamais mélanger leurs finances.',
      },
    ],
  });
});

// -------------------------------------------------------------
// TOUS LES ENDPOINTS CI-DESSOUS NÉCESSITENT L'ACCÈS PRO
// -------------------------------------------------------------
router.use(requireProSubscription);

import {
  calculateLotFinancials,
  consolidateLotsOverview,
  calculateDepletionStats,
  generateFastSellingChannelRecommendations,
  LotAlert,
  DepletionStats,
  ChannelRecommendation,
} from './lotFinancialEngine';

// -------------------------------------------------------------
// 2. GET /api/lots/overview - Synthèse consolidée de toutes les campagnes
// -------------------------------------------------------------
router.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);

    const campaigns = await prisma.commercialLotCampaign.findMany({
      where: { businessId },
      include: {
        items: true,
        sales: {
          include: { items: true },
        },
        expenses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const campaignsData = campaigns.map((camp: any) => ({
      campaign: camp,
      items: camp.items || [],
      sales: camp.sales || [],
      expenses: camp.expenses || [],
    }));

    const consolidated = consolidateLotsOverview(campaignsData);

    res.json(consolidated);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 3. POST /api/lots/campaigns - Assistant de Création de Campagne
// -------------------------------------------------------------
const createCampaignSchema = z.object({
  name: z.string().min(2, 'Le nom de la campagne est requis'),
  goodsType: z.string().min(1, 'Le type de marchandises est requis'),
  description: z.string().optional(),
  supplierName: z.string().optional(),
  originCountry: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCurrency: z.string().default('XAF'),
  exchangeRate: z.number().positive().default(1.0),
  purchasePriceOriginal: z.number().nonnegative().default(0),
  transportCost: z.number().nonnegative().default(0),
  customsCost: z.number().nonnegative().default(0),
  transactionFees: z.number().nonnegative().default(0),
  packagingCost: z.number().nonnegative().default(0),
  otherSupplyCosts: z.number().nonnegative().default(0),
  costAllocationMethod: z.enum(['unit', 'value_weighted', 'custom']).default('unit'),
  status: z.enum(['draft', 'active', 'paused', 'closed']).default('active'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Désignation article requise'),
      reference: z.string().optional(),
      category: z.string().optional(),
      variant: z.string().optional(),
      quantityReceived: z.number().int().positive('La quantité doit être >= 1'),
      estimatedSellingPrice: z.number().nonnegative().default(0),
      customUnitCost: z.number().nonnegative().optional(),
      notes: z.string().optional(),
    })
  ).min(1, 'Au moins un article doit être saisi dans le lot'),
});

router.post('/campaigns', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const parsed = createCampaignSchema.parse(req.body);

    const purchasePriceXaf = Math.round(parsed.purchasePriceOriginal * parsed.exchangeRate);
    const totalLandedCost = Math.round(
      purchasePriceXaf +
      parsed.transportCost +
      parsed.customsCost +
      parsed.transactionFees +
      parsed.packagingCost +
      parsed.otherSupplyCosts
    );

    // Compute unit costs for each item based on allocation method
    const totalUnits = parsed.items.reduce((s, it) => s + it.quantityReceived, 0);
    const totalEstimatedSalesValue = parsed.items.reduce(
      (s, it) => s + (it.quantityReceived * it.estimatedSellingPrice),
      0
    );

    const itemsWithCosts = parsed.items.map((it) => {
      let unitCost = 0;

      if (parsed.costAllocationMethod === 'unit') {
        // Equal per unit allocation
        unitCost = totalUnits > 0 ? Math.round((totalLandedCost / totalUnits) * 100) / 100 : 0;
      } else if (parsed.costAllocationMethod === 'value_weighted') {
        // Pro-rata based on expected selling price
        if (totalEstimatedSalesValue > 0 && it.estimatedSellingPrice > 0) {
          const itemWeight = (it.estimatedSellingPrice * it.quantityReceived) / totalEstimatedSalesValue;
          const totalCostForThisLine = totalLandedCost * itemWeight;
          unitCost = Math.round((totalCostForThisLine / it.quantityReceived) * 100) / 100;
        } else {
          unitCost = totalUnits > 0 ? Math.round((totalLandedCost / totalUnits) * 100) / 100 : 0;
        }
      } else if (parsed.costAllocationMethod === 'custom') {
        unitCost = it.customUnitCost || (totalUnits > 0 ? Math.round((totalLandedCost / totalUnits) * 100) / 100 : 0);
      }

      return {
        businessId,
        name: it.name.trim(),
        reference: it.reference?.trim() || null,
        category: it.category?.trim() || null,
        variant: it.variant?.trim() || null,
        quantityReceived: it.quantityReceived,
        quantitySold: 0,
        quantityDefective: 0,
        quantityRemaining: it.quantityReceived,
        estimatedSellingPrice: it.estimatedSellingPrice,
        unitCost,
        notes: it.notes?.trim() || null,
      };
    });

    const campaign = await prisma.commercialLotCampaign.create({
      data: {
        businessId,
        name: parsed.name.trim(),
        goodsType: parsed.goodsType.trim(),
        description: parsed.description?.trim() || null,
        supplierName: parsed.supplierName?.trim() || null,
        originCountry: parsed.originCountry?.trim() || null,
        purchaseDate: parsed.purchaseDate ? new Date(parsed.purchaseDate) : new Date(),
        purchaseCurrency: parsed.purchaseCurrency,
        exchangeRate: parsed.exchangeRate,
        purchasePriceOriginal: parsed.purchasePriceOriginal,
        purchasePriceXaf,
        transportCost: parsed.transportCost,
        customsCost: parsed.customsCost,
        transactionFees: parsed.transactionFees,
        packagingCost: parsed.packagingCost,
        otherSupplyCosts: parsed.otherSupplyCosts,
        totalLandedCost,
        costAllocationMethod: parsed.costAllocationMethod,
        status: parsed.status,
        notes: parsed.notes?.trim() || null,
        items: {
          create: itemsWithCosts,
        },
      },
      include: {
        items: true,
      },
    });

    // Enregistrer également une dépense automatique dans le grand livre si activé
    try {
      await prisma.expense.create({
        data: {
          businessId,
          amount: totalLandedCost,
          category: 'marchandise',
          description: `Achat Lot Commercial : ${campaign.name} (${campaign.goodsType})`,
          isFixedCost: false,
          isAcquisition: false,
          expenseDate: campaign.purchaseDate,
        },
      });
    } catch (expErr) {
      console.warn('Could not mirror lot purchase to global expenses:', expErr);
    }

    res.status(201).json({
      message: 'Campagne de lot commercial créée avec succès.',
      campaign,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 4. GET /api/lots/campaigns/:id - Détails exhaustifs d'une campagne
// -------------------------------------------------------------
router.get('/campaigns/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id, businessId },
      include: {
        items: {
          orderBy: { name: 'asc' },
        },
        sales: {
          include: {
            items: {
              include: { lotItem: true },
            },
          },
          orderBy: { saleDate: 'desc' },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
        },
        movements: {
          include: { lotItem: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!campaign) {
      throw new AppError('Campagne de lot introuvable', 404);
    }

    const fin = calculateLotFinancials(
      campaign,
      campaign.items || [],
      campaign.sales || [],
      campaign.expenses || []
    );

    // Provide backwards-compatible flat fields for frontend components that read financialsData
    const financialsData = {
      ...fin,
      totalLandedCost: fin.totalLandedCost,
      totalRevenue: fin.salesSummary.netTurnover,
      totalCogs: fin.cogs.totalCostOfGoodsSold,
      totalVariableCosts: fin.variableSellingCosts,
      totalAdditionalExpenses: fin.additionalExpenses.totalAdditionalExpenses,
      realizedProfit: fin.realizedNetProfit,
      netCashCollected: fin.capitalRecovery.netCashInflow,
      recoveryRate: fin.capitalRecovery.capitalRecoveryRate,
      remainingToBreakeven: fin.capitalRecovery.capitalRemainingToRecover,
      isBreakevenReached: fin.capitalRecovery.isCapitalFullyRecovered,
      totalQuantityReceived: fin.stockValuation.totalQuantityReceived,
      totalQuantitySold: fin.stockValuation.totalQuantitySold,
      totalQuantityDefective: fin.stockValuation.totalQuantityDefective,
      totalQuantityRemaining: fin.stockValuation.totalQuantityRemaining,
      remainingStockCostValue: fin.stockValuation.remainingStockCostValue,
      remainingStockMarketValue: fin.stockValuation.remainingStockMarketValue,
      potentialFutureProfit: fin.stockValuation.potentialFutureGrossMargin,
      avgSellingPrice: fin.unitAverages.avgSellingPrice,
      avgUnitCost: fin.unitAverages.avgUnitLandedCost,
      avgMcvu: fin.unitAverages.avgUnitGrossMargin,
      unitsToBreakeven: fin.capitalRecovery.unitsToBreakeven,
      cashCollected: fin.salesSummary.cashCollected,
      receivables: fin.salesSummary.receivables,
    };

    const depletionStats = calculateDepletionStats(campaign, campaign.items || [], campaign.sales || []);
    const channelRecommendations = generateFastSellingChannelRecommendations(campaign, fin, campaign.sales || []);

    res.json({
      campaign,
      financials: financialsData,
      depletionStats,
      channelRecommendations,
      alerts: fin.alerts,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 4b. GET /api/lots/campaigns/:id/channel-recommendations - Suggestions Vente Rapide
// -------------------------------------------------------------
router.get('/campaigns/:id/channel-recommendations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        sales: {
          include: { items: true },
        },
        expenses: true,
      },
    });

    if (!campaign) {
      throw new AppError('Campagne de lot introuvable', 404);
    }

    const fin = calculateLotFinancials(
      campaign,
      campaign.items || [],
      campaign.sales || [],
      campaign.expenses || []
    );

    const recommendations = generateFastSellingChannelRecommendations(campaign, fin, campaign.sales || []);

    res.json({
      campaignId: id,
      campaignName: campaign.name,
      goodsType: campaign.goodsType,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 5. PATCH /api/lots/campaigns/:id/status - Changer le statut
// -------------------------------------------------------------
router.patch('/campaigns/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'paused', 'closed'].includes(status)) {
      throw new AppError('Statut invalide', 400);
    }

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id, businessId },
    });

    if (!campaign) {
      throw new AppError('Campagne introuvable', 404);
    }

    const updated = await prisma.commercialLotCampaign.update({
      where: { id },
      data: {
        status,
        closedAt: status === 'closed' ? new Date() : null,
      },
    });

    res.json({
      message: `Statut de la campagne mis à jour en "${status}"`,
      campaign: updated,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 6. POST /api/lots/campaigns/:id/sales - Enregistrer une vente sur le lot
// -------------------------------------------------------------
const recordLotSaleSchema = z.object({
  saleDate: z.string().optional(),
  channel: z.enum(['comptoir', 'whatsapp', 'facebook', 'instagram', 'site_web', 'autre']).default('comptoir'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  discountAmount: z.number().nonnegative().default(0),
  variableCosts: z.number().nonnegative().default(0),
  paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'credit']).default('cash'),
  paymentStatus: z.enum(['paid', 'pending', 'cancelled', 'refunded']).optional(),
  amountPaid: z.number().nonnegative().optional(),
  amountDue: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      lotItemId: z.string().uuid(),
      quantity: z.number().int().positive('La quantité doit être >= 1'),
      unitPrice: z.number().positive('Le prix unitaire doit être > 0'),
    })
  ).min(1, 'Au moins un article du lot doit être vendu'),
});

router.post('/campaigns/:id/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = recordLotSaleSchema.parse(req.body);

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id: campaignId, businessId },
      include: { items: true },
    });

    if (!campaign) {
      throw new AppError('Campagne de lot introuvable', 404);
    }

    if (campaign.status === 'closed') {
      throw new AppError('Impossible d\'enregistrer une vente sur une campagne clôturée.', 400);
    }

    // Verify stock availability
    for (const itemInput of parsed.items) {
      const lotItem = campaign.items.find((i: any) => i.id === itemInput.lotItemId);
      if (!lotItem) {
        throw new AppError(`Article ID ${itemInput.lotItemId} introuvable dans ce lot`, 404);
      }
      if (lotItem.quantityRemaining < itemInput.quantity) {
        throw new AppError(
          `Stock insuffisant pour "${lotItem.name}". Demandé: ${itemInput.quantity}, restant: ${lotItem.quantityRemaining}`,
          400
        );
      }
    }

    // Compute totals & sale items with COGS snapshot
    let subtotal = 0;
    const saleItemsData = parsed.items.map((itemInput) => {
      const lotItem = campaign.items.find((i: any) => i.id === itemInput.lotItemId)!;
      const lineTotal = itemInput.quantity * itemInput.unitPrice;
      const lineCost = itemInput.quantity * lotItem.unitCost;
      const lineProfit = lineTotal - lineCost;
      subtotal += lineTotal;

      return {
        lotItemId: lotItem.id,
        quantity: itemInput.quantity,
        unitPrice: itemInput.unitPrice,
        unitCost: lotItem.unitCost,
        totalPrice: lineTotal,
        totalCost: lineCost,
        grossProfit: lineProfit,
      };
    });

    const netAmount = Math.max(0, subtotal - parsed.discountAmount);

    // Determine payment status & cash collected vs receivables
    let status = parsed.paymentStatus || (parsed.paymentMethod === 'credit' ? 'pending' : 'paid');
    let cashPaid = 0;
    let due = 0;

    if (typeof parsed.amountPaid === 'number') {
      cashPaid = Math.min(netAmount, Math.round(parsed.amountPaid));
      due = Math.max(0, netAmount - cashPaid);
      if (due > 0 && status === 'paid') {
        status = 'pending';
      }
    } else if (status === 'paid' && parsed.paymentMethod !== 'credit') {
      cashPaid = netAmount;
      due = 0;
    } else {
      cashPaid = 0;
      due = netAmount;
    }

    // Transaction for atomic sale creation + stock reduction + movement log
    const result = await prisma.$transaction(async (tx: any) => {
      const sale = await tx.lotSale.create({
        data: {
          campaignId,
          businessId,
          saleDate: parsed.saleDate ? new Date(parsed.saleDate) : new Date(),
          channel: parsed.channel,
          customerName: parsed.customerName?.trim() || null,
          customerPhone: parsed.customerPhone?.trim() || null,
          totalAmount: subtotal,
          discountAmount: parsed.discountAmount,
          netAmount,
          amountPaid: cashPaid,
          amountDue: due,
          variableCosts: parsed.variableCosts,
          paymentMethod: parsed.paymentMethod,
          paymentStatus: status,
          notes: parsed.notes?.trim() || null,
          items: {
            create: saleItemsData,
          },
        },
        include: { items: true },
      });

      // Update remaining quantity for each item & log stock movement
      for (const itemInput of parsed.items) {
        const lotItem = campaign.items.find((i: any) => i.id === itemInput.lotItemId)!;
        await tx.lotItem.update({
          where: { id: lotItem.id },
          data: {
            quantitySold: { increment: itemInput.quantity },
            quantityRemaining: { decrement: itemInput.quantity },
          },
        });

        await tx.lotStockMovement.create({
          data: {
            campaignId,
            lotItemId: lotItem.id,
            type: 'sale',
            quantity: -itemInput.quantity,
            reason: `Vente ${parsed.channel} - ${netAmount.toLocaleString('fr-FR')} FCFA`,
          },
        });
      }

      // Check if all items in the campaign are completely depleted
      const allRemainingItems = await tx.lotItem.findMany({
        where: { campaignId },
        select: { quantityRemaining: true },
      });
      const totalRemainingAfterSale = allRemainingItems.reduce((acc: number, it: any) => acc + (it.quantityRemaining || 0), 0);

      if (totalRemainingAfterSale === 0) {
        await tx.commercialLotCampaign.update({
          where: { id: campaignId },
          data: {
            depletedAt: new Date(),
            status: 'closed',
            closedAt: new Date(),
          },
        });
      }

      return sale;
    });

    res.status(201).json({
      message: 'Vente enregistrée avec succès sur le lot.',
      sale: result,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 7. POST /api/lots/campaigns/:id/expenses - Dépenses additionnelles du lot
// -------------------------------------------------------------
const addLotExpenseSchema = z.object({
  amount: z.number().positive('Le montant doit être > 0'),
  category: z.string().default('autre'),
  description: z.string().optional(),
  expenseDate: z.string().optional(),
});

router.post('/campaigns/:id/expenses', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = addLotExpenseSchema.parse(req.body);

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id: campaignId, businessId },
    });

    if (!campaign) {
      throw new AppError('Campagne introuvable', 404);
    }

    const expense = await prisma.lotExpense.create({
      data: {
        campaignId,
        businessId,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description?.trim() || null,
        expenseDate: parsed.expenseDate ? new Date(parsed.expenseDate) : new Date(),
      },
    });

    res.status(201).json({
      message: 'Dépense ajoutée à la campagne.',
      expense,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 8. POST /api/lots/campaigns/:id/stock-adjustments - Avaries / Pertes / Ajustements
// -------------------------------------------------------------
const stockAdjustmentSchema = z.object({
  lotItemId: z.string().uuid(),
  type: z.enum(['defective', 'adjustment', 'return']),
  quantity: z.number().int().positive('La quantité doit être >= 1'),
  reason: z.string().optional(),
});

router.post('/campaigns/:id/stock-adjustments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = stockAdjustmentSchema.parse(req.body);

    const lotItem = await prisma.lotItem.findFirst({
      where: { id: parsed.lotItemId, campaignId, businessId },
    });

    if (!lotItem) {
      throw new AppError('Article introuvable dans ce lot', 404);
    }

    if (parsed.type === 'defective') {
      if (lotItem.quantityRemaining < parsed.quantity) {
        throw new AppError('Stock insuffisant pour enregistrer cette perte.', 400);
      }
      await prisma.lotItem.update({
        where: { id: lotItem.id },
        data: {
          quantityDefective: { increment: parsed.quantity },
          quantityRemaining: { decrement: parsed.quantity },
        },
      });

      // Check if campaign is now depleted
      const allRemainingItems = await prisma.lotItem.findMany({
        where: { campaignId },
        select: { quantityRemaining: true },
      });
      const totalRemaining = allRemainingItems.reduce((acc: number, it: any) => acc + (it.quantityRemaining || 0), 0);
      if (totalRemaining === 0) {
        await prisma.commercialLotCampaign.update({
          where: { id: campaignId },
          data: {
            depletedAt: new Date(),
            status: 'closed',
            closedAt: new Date(),
          },
        });
      }
    } else if (parsed.type === 'return') {
      await prisma.lotItem.update({
        where: { id: lotItem.id },
        data: {
          quantitySold: { decrement: parsed.quantity },
          quantityRemaining: { increment: parsed.quantity },
        },
      });

      // Re-open if it was marked as depleted
      const currentCamp = await prisma.commercialLotCampaign.findUnique({ where: { id: campaignId } });
      if (currentCamp && currentCamp.depletedAt) {
        await prisma.commercialLotCampaign.update({
          where: { id: campaignId },
          data: {
            depletedAt: null,
            status: 'active',
            closedAt: null,
          },
        });
      }
    }

    await prisma.lotStockMovement.create({
      data: {
        campaignId,
        lotItemId: lotItem.id,
        type: parsed.type,
        quantity: parsed.type === 'return' ? parsed.quantity : -parsed.quantity,
        reason: parsed.reason?.trim() || `Ajustement: ${parsed.type}`,
      },
    });

    res.json({
      message: 'Mouvement de stock enregistré.',
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 9. POST /api/lots/campaigns/:id/items - Ajouter un nouvel article dans le lot
// -------------------------------------------------------------
const addItemSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  reference: z.string().optional(),
  category: z.string().optional(),
  variant: z.string().optional(),
  quantityReceived: z.number().int().positive('Quantité reçue >= 1'),
  estimatedSellingPrice: z.number().nonnegative().default(0),
  unitCost: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

router.post('/campaigns/:id/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = addItemSchema.parse(req.body);

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id: campaignId, businessId },
    });

    if (!campaign) {
      throw new AppError('Campagne introuvable', 404);
    }

    const item = await prisma.lotItem.create({
      data: {
        campaignId,
        businessId,
        name: parsed.name.trim(),
        reference: parsed.reference?.trim() || null,
        category: parsed.category?.trim() || null,
        variant: parsed.variant?.trim() || null,
        quantityReceived: parsed.quantityReceived,
        quantitySold: 0,
        quantityDefective: 0,
        quantityRemaining: parsed.quantityReceived,
        estimatedSellingPrice: parsed.estimatedSellingPrice,
        unitCost: parsed.unitCost,
        notes: parsed.notes?.trim() || null,
      },
    });

    // Reopen campaign if it was previously depleted
    if (campaign.depletedAt) {
      await prisma.commercialLotCampaign.update({
        where: { id: campaignId },
        data: {
          depletedAt: null,
          status: 'active',
          closedAt: null,
        },
      });
    }

    res.status(201).json({
      message: 'Article ajouté au lot avec succès.',
      item,
    });
  } catch (err) {
    next(err);
  }
});

export const lotsRouter = router;
