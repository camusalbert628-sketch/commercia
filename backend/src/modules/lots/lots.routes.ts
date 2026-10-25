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

    let totalInvested = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalVariableCosts = 0;
    let totalAdditionalExpenses = 0;
    let totalRemainingStockCost = 0;
    let totalRemainingStockMarketValue = 0;
    let activeCampaignsCount = 0;
    let closedCampaignsCount = 0;

    const campaignsSummary = campaigns.map((camp: any) => {
      const invested = camp.totalLandedCost || 0;
      totalInvested += invested;

      if (camp.status === 'active') activeCampaignsCount++;
      if (camp.status === 'closed') closedCampaignsCount++;

      // Total received & remaining
      const totalQuantityReceived = camp.items.reduce((s: number, i: any) => s + (i.quantityReceived || 0), 0);
      const totalQuantitySold = camp.items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
      const totalQuantityDefective = camp.items.reduce((s: number, i: any) => s + (i.quantityDefective || 0), 0);
      const totalQuantityRemaining = camp.items.reduce((s: number, i: any) => s + (i.quantityRemaining || 0), 0);

      // Remaining stock values
      const remainingCostValue = camp.items.reduce((s: number, i: any) => s + (i.quantityRemaining * (i.unitCost || 0)), 0);
      const remainingMarketValue = camp.items.reduce((s: number, i: any) => s + (i.quantityRemaining * (i.estimatedSellingPrice || 0)), 0);
      totalRemainingStockCost += remainingCostValue;
      totalRemainingStockMarketValue += remainingMarketValue;

      // Sales
      const validSales = camp.sales.filter((s: any) => s.paymentStatus !== 'cancelled' && s.paymentStatus !== 'refunded');
      const campRevenue = validSales.reduce((s: number, sale: any) => s + (sale.netAmount || sale.totalAmount || 0), 0);
      const campVariableCosts = validSales.reduce((s: number, sale: any) => s + (sale.variableCosts || 0), 0);
      totalRevenue += campRevenue;
      totalVariableCosts += campVariableCosts;

      // COGS
      const campCogs = validSales.reduce((s: number, sale: any) => {
        const saleCogs = sale.items.reduce((itemSum: number, item: any) => itemSum + (item.totalCost || (item.quantity * item.unitCost) || 0), 0);
        return s + saleCogs;
      }, 0);
      totalCogs += campCogs;

      // Expenses
      const campExpenses = camp.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      totalAdditionalExpenses += campExpenses;

      // Realized profit = Revenue - COGS - VariableCosts - AdditionalExpenses
      const realizedProfit = campRevenue - campCogs - campVariableCosts - campExpenses;

      // Capital recovery rate = Net cash collected / Invested * 100
      const netCashCollected = campRevenue - campVariableCosts - campExpenses;
      const recoveryRate = invested > 0 ? Number(((netCashCollected / invested) * 100).toFixed(1)) : 0;
      const isBreakevenReached = netCashCollected >= invested;

      return {
        id: camp.id,
        name: camp.name,
        goodsType: camp.goodsType,
        supplierName: camp.supplierName,
        originCountry: camp.originCountry,
        purchaseDate: camp.purchaseDate,
        purchasePriceOriginal: camp.purchasePriceOriginal,
        purchaseCurrency: camp.purchaseCurrency,
        totalLandedCost: invested,
        status: camp.status,
        totalQuantityReceived,
        totalQuantitySold,
        totalQuantityDefective,
        totalQuantityRemaining,
        revenue: campRevenue,
        cogs: campCogs,
        variableCosts: campVariableCosts,
        additionalExpenses: campExpenses,
        realizedProfit,
        remainingStockCostValue: remainingCostValue,
        remainingStockMarketValue: remainingMarketValue,
        recoveryRate,
        isBreakevenReached,
        itemsCount: camp.items.length,
        salesCount: validSales.length,
      };
    });

    const totalRealizedProfit = totalRevenue - totalCogs - totalVariableCosts - totalAdditionalExpenses;
    const globalRecoveryRate = totalInvested > 0
      ? Number((((totalRevenue - totalVariableCosts - totalAdditionalExpenses) / totalInvested) * 100).toFixed(1))
      : 0;

    // Campaigns needing attention (recoveryRate < 50% or low margin)
    const campaignsNeedingAttention = campaignsSummary.filter(
      (c: any) => c.status === 'active' && c.recoveryRate < 60 && c.totalQuantitySold > 5
    );

    res.json({
      summary: {
        totalCampaigns: campaigns.length,
        activeCampaignsCount,
        closedCampaignsCount,
        totalInvested,
        totalRevenue,
        totalCogs,
        totalVariableCosts,
        totalAdditionalExpenses,
        totalRealizedProfit,
        totalRemainingStockCost,
        totalRemainingStockMarketValue,
        globalRecoveryRate,
      },
      campaignsNeedingAttention,
      campaigns: campaignsSummary,
    });
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

    // Calculs financiers rigoureux
    const invested = campaign.totalLandedCost || 0;
    const validSales = campaign.sales.filter((s: any) => s.paymentStatus !== 'cancelled' && s.paymentStatus !== 'refunded');

    const totalRevenue = validSales.reduce((s: number, sale: any) => s + (sale.netAmount || sale.totalAmount || 0), 0);
    const totalVariableCosts = validSales.reduce((s: number, sale: any) => s + (sale.variableCosts || 0), 0);

    const totalCogs = validSales.reduce((s: number, sale: any) => {
      return s + sale.items.reduce((itemSum: number, item: any) => itemSum + (item.totalCost || (item.quantity * item.unitCost) || 0), 0);
    }, 0);

    const totalAdditionalExpenses = campaign.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

    // Bénéfice net réalisé (déjà encaissé)
    const realizedProfit = totalRevenue - totalCogs - totalVariableCosts - totalAdditionalExpenses;

    // Encaissements nets pour calcul de remboursement
    const netCashCollected = totalRevenue - totalVariableCosts - totalAdditionalExpenses;
    const recoveryRate = invested > 0 ? Number(((netCashCollected / invested) * 100).toFixed(1)) : 0;
    const remainingToBreakeven = Math.max(0, invested - netCashCollected);
    const isBreakevenReached = netCashCollected >= invested;

    // Stock quantities & remaining values
    const totalQuantityReceived = campaign.items.reduce((s: number, i: any) => s + (i.quantityReceived || 0), 0);
    const totalQuantitySold = campaign.items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
    const totalQuantityDefective = campaign.items.reduce((s: number, i: any) => s + (i.quantityDefective || 0), 0);
    const totalQuantityRemaining = campaign.items.reduce((s: number, i: any) => s + (i.quantityRemaining || 0), 0);

    const remainingStockCostValue = campaign.items.reduce(
      (s: number, i: any) => s + (i.quantityRemaining * (i.unitCost || 0)),
      0
    );
    const remainingStockMarketValue = campaign.items.reduce(
      (s: number, i: any) => s + (i.quantityRemaining * (i.estimatedSellingPrice || 0)),
      0
    );
    const potentialFutureProfit = Math.max(0, remainingStockMarketValue - remainingStockCostValue);

    // Marge contributive unitaire moyenne
    const avgSellingPrice = totalQuantitySold > 0 ? Math.round(totalRevenue / totalQuantitySold) : 0;
    const avgUnitCost = totalQuantityReceived > 0 ? Math.round(invested / totalQuantityReceived) : 0;
    const avgMcvu = Math.max(0, avgSellingPrice - avgUnitCost);

    // Nombre d'unités restantes à vendre pour point mort
    const unitsToBreakeven = avgMcvu > 0 ? Math.ceil(remainingToBreakeven / avgMcvu) : 0;

    res.json({
      campaign,
      financials: {
        totalLandedCost: invested,
        totalRevenue,
        totalCogs,
        totalVariableCosts,
        totalAdditionalExpenses,
        realizedProfit,
        netCashCollected,
        recoveryRate,
        remainingToBreakeven,
        isBreakevenReached,
        totalQuantityReceived,
        totalQuantitySold,
        totalQuantityDefective,
        totalQuantityRemaining,
        remainingStockCostValue,
        remainingStockMarketValue,
        potentialFutureProfit,
        avgSellingPrice,
        avgUnitCost,
        avgMcvu,
        unitsToBreakeven,
      },
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
          variableCosts: parsed.variableCosts,
          paymentMethod: parsed.paymentMethod,
          paymentStatus: 'paid',
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
    } else if (parsed.type === 'return') {
      await prisma.lotItem.update({
        where: { id: lotItem.id },
        data: {
          quantitySold: { decrement: parsed.quantity },
          quantityRemaining: { increment: parsed.quantity },
        },
      });
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

    res.status(201).json({
      message: 'Article ajouté au lot avec succès.',
      item,
    });
  } catch (err) {
    next(err);
  }
});

export const lotsRouter = router;
