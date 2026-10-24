import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId, requireProSubscription } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);


// GET /api/products — Liste des produits
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { search, lowStock } = req.query as any;

    const where: any = { businessId, isActive: true };
    if (search) {
      where.name = { contains: search };
    }

    let products = await req.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (lowStock === 'true') {
      products = products.filter((p: any) => p.quantity <= p.lowStockAlert);
    }

    const formatted = products.map((p: any) => {
      let extra: any = {};
      if (p.description && p.description.startsWith('{') && p.description.endsWith('}')) {
        try {
          extra = JSON.parse(p.description);
        } catch (_) {}
      }
      return {
        ...p,
        purchasePrice: extra.purchasePrice ?? p.costPrice,
        logisticsFees: extra.logisticsFees ?? 0,
        isOnlineShop: Boolean(extra.isOnlineShop),
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// POST /api/products — Créer un produit (Gestion du stock réservée aux comptes Pro)
router.post('/', requireProSubscription, async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      name: z.string().min(1, 'Nom du produit requis'),
      description: z.string().optional(),
      purchasePrice: z.number().min(0).optional(),
      logisticsFees: z.number().min(0).optional(),
      sellingPrice: z.number().min(0, 'Le prix de vente doit être positif'),
      costPrice: z.number().min(0).default(0),
      quantity: z.number().int().min(0).default(0),
      unit: z.string().default('unité'),
      lowStockAlert: z.number().int().min(1).default(5),
      isOnlineShop: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    let extraMeta: any = {};
    if (data.purchasePrice !== undefined || data.logisticsFees !== undefined || data.isOnlineShop !== undefined) {
      extraMeta = {
        purchasePrice: data.purchasePrice ?? data.costPrice,
        logisticsFees: data.logisticsFees ?? 0,
        isOnlineShop: Boolean(data.isOnlineShop),
      };
    }
    const finalDescription = data.description || (Object.keys(extraMeta).length > 0 ? JSON.stringify(extraMeta) : null);

    const product = await req.prisma.product.create({
      data: {
        businessId,
        name: data.name,
        description: finalDescription,
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        quantity: data.quantity,
        unit: data.unit,
        lowStockAlert: data.lowStockAlert,
      },
    });

    if (data.quantity > 0) {
      await req.prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: 'in',
          quantity: data.quantity,
          unitCost: data.costPrice,
          reason: 'Stock initial',
        },
      });
    }

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// PUT & PATCH /api/products/:id — Mettre à jour un produit
const updateProductHandler = async (req: AuthRequest, res: any, next: any) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const existing = await req.prisma.product.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!existing) throw new AppError('Produit non trouvé.', 404);

    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      sellingPrice: z.number().min(0).optional(),
      costPrice: z.number().min(0).optional(),
      unit: z.string().optional(),
      lowStockAlert: z.number().int().min(1).optional(),
    });
    const data = schema.parse(req.body);

    const updated = await req.prisma.product.update({
      where: { id: existing.id },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
};
router.put('/:id', updateProductHandler);
router.patch('/:id', updateProductHandler);

// POST /api/products/:id/adjust — Ajustement de stock
router.post('/:id/adjust', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const product = await req.prisma.product.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!product) throw new AppError('Produit non trouvé.', 404);

    const schema = z.object({
      type: z.enum(['in', 'out', 'adjustment']),
      quantity: z.number().int().min(1, 'La quantité doit être supérieure à zéro'),
      reason: z.string().min(1, 'Le motif est requis'),
      unitCost: z.number().min(0).optional(),
    });
    const data = schema.parse(req.body);

    let newQuantity = product.quantity;
    if (data.type === 'in') {
      newQuantity += data.quantity;
    } else if (data.type === 'out') {
      if (data.quantity > product.quantity) {
        throw new AppError(`Stock insuffisant (${product.quantity} disponibles).`, 400);
      }
      newQuantity -= data.quantity;
    } else if (data.type === 'adjustment') {
      newQuantity = data.quantity;
    }

    await req.prisma.product.update({
      where: { id: product.id },
      data: { quantity: newQuantity },
    });

    const movement = await req.prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: data.type,
        quantity: data.quantity,
        unitCost: data.unitCost || product.costPrice,
        reason: data.reason,
      },
    });

    res.status(201).json({
      message: 'Stock mis à jour avec succès.',
      product: { ...product, quantity: newQuantity },
      movement,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// DELETE /api/products/:id — Supprimer un produit
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const product = await req.prisma.product.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!product) throw new AppError('Produit non trouvé.', 404);

    await req.prisma.product.update({
      where: { id: product.id },
      data: { isActive: false },
    });

    res.json({ message: 'Produit archivé avec succès.' });
  } catch (error) {
    next(error);
  }
});

export { router as productsRouter };
