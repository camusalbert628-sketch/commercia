import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Validation schemas
const recipeSchema = z.object({
  name: z.string().min(1, 'Nom de la recette requis'),
  description: z.string().optional(),
  category: z.string().default('plat'),
  portionsYield: z.number().min(1, 'Le rendement doit être d’au moins 1 portion').default(1),
  sellingPricePerPortion: z.number().min(0, 'Prix de vente unitaire invalide').default(0),
  ingredients: z.array(z.object({
    name: z.string().min(1, 'Nom de l’ingrédient requis'),
    quantity: z.number().min(0),
    unit: z.string().default('kg'),
    unitCost: z.number().min(0).default(0),
    productId: z.string().optional(),
  })).optional().default([]),
});

const preparationSchema = z.object({
  recipeId: z.string().optional(),
  dishName: z.string().min(1, 'Nom du plat préparé requis'),
  portionsPrepared: z.number().min(1, 'Au moins 1 portion préparée requise'),
  unitSellingPrice: z.number().min(0, 'Prix de vente unitaire requis'),
  ingredientsCost: z.number().min(0).default(0),
  otherProductionCosts: z.number().min(0).default(0),
  preparationDate: z.string().optional(),
  notes: z.string().optional(),
});

const sellPortionsSchema = z.object({
  portionsToSell: z.number().min(1, 'Au moins 1 portion requise'),
  paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'credit']).default('cash'),
  customerId: z.string().optional(),
  notes: z.string().optional(),
});

const lossesSchema = z.object({
  portionsLost: z.number().min(0).default(0),
  portionsOffered: z.number().min(0).default(0),
  reason: z.string().optional(),
});

// GET /api/food-prep/recipes
router.get('/recipes', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const recipes = await req.prisma.recipe.findMany({
      where: { businessId, isActive: true },
      include: { ingredients: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ recipes });
  } catch (error) {
    next(error);
  }
});

// POST /api/food-prep/recipes
router.post('/recipes', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = recipeSchema.parse(req.body);

    const totalIngredientsCost = data.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.unitCost), 0);
    const estimatedCostPerPortion = data.portionsYield > 0 ? Math.round(totalIngredientsCost / data.portionsYield) : 0;

    const recipe = await req.prisma.recipe.create({
      data: {
        businessId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        portionsYield: data.portionsYield,
        sellingPricePerPortion: data.sellingPricePerPortion,
        estimatedCostPerPortion,
        ingredients: {
          create: data.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            unitCost: ing.unitCost,
            productId: ing.productId || null,
          })),
        },
      },
      include: { ingredients: true },
    });

    res.status(201).json({ message: 'Recette enregistrée avec succès !', recipe });
  } catch (error) {
    next(error);
  }
});

// GET /api/food-prep/preparations
router.get('/preparations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const preparations = await req.prisma.mealPreparation.findMany({
      where: { businessId },
      include: { recipe: true },
      orderBy: { preparationDate: 'desc' },
    });

    res.json({ preparations });
  } catch (error) {
    next(error);
  }
});

// POST /api/food-prep/preparations
router.post('/preparations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = preparationSchema.parse(req.body);

    let calculatedIngredientsCost = data.ingredientsCost;
    let sellingPrice = data.unitSellingPrice;

    // Si une recette est liée, reprendre ses ratios
    if (data.recipeId) {
      const recipe = await req.prisma.recipe.findFirst({
        where: { id: data.recipeId, businessId },
        include: { ingredients: true },
      });
      if (!recipe) throw new AppError('Recette introuvable pour cette entreprise.', 404);
      if (recipe) {
        if (!sellingPrice || sellingPrice === 0) {
          sellingPrice = recipe.sellingPricePerPortion;
        }
        if (!calculatedIngredientsCost || calculatedIngredientsCost === 0) {
          calculatedIngredientsCost = recipe.estimatedCostPerPortion * data.portionsPrepared;
        }
      }
    }

    // Création transactionnelle de la préparation et déduction du stock d'ingrédients
    const preparation = await req.prisma.$transaction(async (tx: any) => {
      // Déduire le stock des ingrédients liés
      if (data.recipeId) {
        const recipe = await tx.recipe.findFirst({
          where: { id: data.recipeId, businessId },
          include: { ingredients: true },
        });
        if (recipe?.ingredients) {
          for (const ing of recipe.ingredients) {
            if (ing.productId) {
              const qtyToDeduct = (ing.quantity * data.portionsPrepared) / (recipe.portionsYield || 1);
              await tx.product.updateMany({
                where: { id: ing.productId, businessId },
                data: { stockQuantity: { decrement: qtyToDeduct } },
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: ing.productId,
                  type: 'out',
                  quantity: qtyToDeduct,
                  reason: `Ingrédient cuisine : ${data.dishName} (${data.portionsPrepared} portions)`,
                },
              });
            }
          }
        }
      }

      return tx.mealPreparation.create({
        data: {
          businessId,
          recipeId: data.recipeId || null,
          dishName: data.dishName,
          portionsPrepared: data.portionsPrepared,
          portionsSold: 0,
          portionsRemaining: data.portionsPrepared,
          portionsLost: 0,
          portionsOffered: 0,
          unitSellingPrice: sellingPrice,
          totalRevenue: 0,
          ingredientsCost: calculatedIngredientsCost,
          otherProductionCosts: data.otherProductionCosts,
          preparationDate: data.preparationDate ? new Date(data.preparationDate) : new Date(),
          notes: data.notes || null,
          status: 'active',
        },
      });
    });

    res.status(201).json({
      message: 'Préparation du jour enregistrée ! Portions prêtes au service.',
      preparation,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/food-prep/preparations/:id/sell
router.put('/preparations/:id/sell', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = sellPortionsSchema.parse(req.body);

    const prep = await req.prisma.mealPreparation.findFirst({
      where: { id, businessId },
    });
    if (!prep) throw new AppError('Préparation introuvable.', 404);

    if (data.customerId) {
      const cust = await req.prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
      if (!cust) throw new AppError('Client introuvable pour cette entreprise.', 404);
    }
    if (data.paymentMethod === 'credit' && !data.customerId) {
      throw new AppError('Une vente à crédit nécessite un client afin d’enregistrer la créance.', 400);
    }

    const saleTotal = data.portionsToSell * prep.unitSellingPrice;
    const unitIngredientCost = prep.portionsPrepared > 0 ? (prep.ingredientsCost / prep.portionsPrepared) : 0;

    // Transaction atomique garantissant qu'on ne vend pas plus de portions que le disponible
    const result = await req.prisma.$transaction(async (tx: any) => {
      const updatedCount = await tx.mealPreparation.updateMany({
        where: {
          id,
          businessId,
          portionsRemaining: { gte: data.portionsToSell },
        },
        data: {
          portionsSold: { increment: data.portionsToSell },
          portionsRemaining: { decrement: data.portionsToSell },
          totalRevenue: { increment: saleTotal },
        },
      });

      if (updatedCount.count !== 1) {
        throw new AppError(
          `Stock insuffisant : il ne reste pas assez de portions pour ${prep.dishName}.`,
          409
        );
      }

      // Enregistrer dans les Ventes
      const sale = await tx.sale.create({
        data: {
          businessId,
          customerId: data.customerId || null,
          totalAmount: saleTotal,
          paidAmount: data.paymentMethod === 'credit' ? 0 : saleTotal,
          paymentMethod: data.paymentMethod,
          status: 'completed',
          notes: `Restauration : ${data.portionsToSell}x ${prep.dishName} ${data.notes ? `(${data.notes})` : ''}`,
          items: {
            create: [{
              name: `${prep.dishName} (${data.portionsToSell} portion${data.portionsToSell > 1 ? 's' : ''})`,
              quantity: data.portionsToSell,
              unitPrice: prep.unitSellingPrice,
              costPrice: unitIngredientCost,
              totalPrice: saleTotal,
            }],
          },
        },
      });

      // Si vente à crédit, mettre à jour la dette du client
      if (data.paymentMethod === 'credit' && data.customerId) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: {
            totalBought: { increment: saleTotal },
            totalOwed: { increment: saleTotal },
          },
        });
      }

      // Caisse journalière
      if (data.paymentMethod !== 'credit' && saleTotal > 0) {
        const activeSession = await tx.cashSession.findFirst({
          where: { businessId, status: 'open' },
        });
        if (activeSession) {
          await tx.cashMovement.create({
            data: {
              sessionId: activeSession.id,
              businessId,
              type: 'in',
              amount: saleTotal,
              method: data.paymentMethod,
              category: 'sale',
              referenceId: sale.id,
              description: `Repas : ${data.portionsToSell}x ${prep.dishName}`,
            },
          });
        }
      }

      const freshPrep = await tx.mealPreparation.findUnique({ where: { id } });
      if (freshPrep && freshPrep.portionsRemaining <= 0) {
        await tx.mealPreparation.update({
          where: { id },
          data: { status: 'closed' },
        });
      }

      return { sale, updatedPrep: freshPrep };
    });

    res.json({
      message: `${data.portionsToSell} portion(s) vendue(s) avec succès ! (${saleTotal.toLocaleString('fr-FR')} FCFA)`,
      preparation: result.updatedPrep,
      sale: result.sale,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/food-prep/preparations/:id/losses
router.put('/preparations/:id/losses', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = lossesSchema.parse(req.body);
    const totalToDeduct = data.portionsLost + data.portionsOffered;

    const result = await req.prisma.$transaction(async (tx: any) => {
      const updatedCount = await tx.mealPreparation.updateMany({
        where: {
          id,
          businessId,
          portionsRemaining: { gte: totalToDeduct },
        },
        data: {
          portionsLost: { increment: data.portionsLost },
          portionsOffered: { increment: data.portionsOffered },
          portionsRemaining: { decrement: totalToDeduct },
        },
      });

      if (updatedCount.count !== 1) {
        throw new AppError('Impossible d\'enregistrer les pertes : portions restantes insuffisantes.', 409);
      }

      const freshPrep = await tx.mealPreparation.findUnique({ where: { id } });
      if (freshPrep && freshPrep.portionsRemaining <= 0) {
        await tx.mealPreparation.update({
          where: { id },
          data: { status: 'closed' },
        });
      }

      return freshPrep;
    });

    res.json({
      message: 'Invendus et pertes enregistrés avec succès.',
      preparation: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/food-prep/summary (Calcul rigoureux des ingrédients consommés et du bénéfice journalier)
router.get('/summary', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prepsToday = await req.prisma.mealPreparation.findMany({
      where: {
        businessId,
        preparationDate: { gte: today },
      },
    });

    let totalPrepared = 0;
    let totalSold = 0;
    let totalRemaining = 0;
    let totalLost = 0;
    let totalOffered = 0;
    let totalRevenue = 0;
    let totalIngredientsEngaged = 0;

    for (const p of prepsToday) {
      totalPrepared += p.portionsPrepared;
      totalSold += p.portionsSold;
      totalRemaining += p.portionsRemaining;
      totalLost += p.portionsLost;
      totalOffered += p.portionsOffered;
      totalRevenue += p.totalRevenue;
      totalIngredientsEngaged += p.ingredientsCost;
    }

    // Coût des ingrédients réellement consommés = coût engagé sur les portions vendues, perdues ou offertes
    // Les portions encore disponibles restent valorisées en stock de plats préparés
    const soldRatio = totalPrepared > 0 ? ((totalSold + totalLost + totalOffered) / totalPrepared) : 0;
    const realConsumedIngredientsCost = Math.round(totalIngredientsEngaged * soldRatio);
    const estimatedDayMargin = totalRevenue - realConsumedIngredientsCost;

    res.json({
      date: today.toISOString(),
      portionsPrepared: totalPrepared,
      portionsSold: totalSold,
      portionsRemaining: totalRemaining,
      portionsLost: totalLost,
      portionsOffered: totalOffered,
      totalRevenue,
      ingredientsEngagedTotal: totalIngredientsEngaged,
      realConsumedIngredientsCost,
      estimatedDayMargin,
      formulaExplanation: 'Bénéfice estimé = Recettes encaissées - Coût des ingrédients réellement consommés (hors portions encore disponibles en réserve).',
    });
  } catch (error) {
    next(error);
  }
});

export { router as foodPrepRouter };
