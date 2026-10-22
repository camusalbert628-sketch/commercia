import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// POST /api/sales — Enregistrer une vente
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    
    const saleSchema = z.object({
      items: z.array(z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        unitPrice: z.number().min(0),
        costPrice: z.number().min(0).default(0),
        productId: z.string().optional(),
      })).min(1, 'Au moins un article requis'),
      paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'credit']).default('cash'),
      customerId: z.string().optional(),
      notes: z.string().optional(),
    });
    
    const data = saleSchema.parse(req.body);

    // Si le prix de revient n'est pas fourni, le récupérer du catalogue produit
    const enrichedItems = await Promise.all(
      data.items.map(async item => {
        let costPrice = item.costPrice;
        if ((!costPrice || costPrice === 0) && item.productId) {
          const product = await req.prisma.product.findUnique({
            where: { id: item.productId },
            select: { costPrice: true },
          });
          if (product && product.costPrice > 0) {
            costPrice = product.costPrice;
          }
        }
        return {
          ...item,
          costPrice: costPrice || 0,
        };
      })
    );

    const totalAmount = enrichedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const paidAmount = data.paymentMethod === 'credit' ? 0 : totalAmount;

    const sale = await req.prisma.sale.create({
      data: {
        businessId,
        customerId: data.customerId || null,
        totalAmount,
        paidAmount,
        paymentMethod: data.paymentMethod,
        status: 'completed',
        notes: data.notes || null,
        items: {
          create: enrichedItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            totalPrice: item.unitPrice * item.quantity,
            productId: item.productId || null,
          })),
        },
      },
      include: { items: true, customer: true },
    });


    // Update stock if products are linked
    for (const item of data.items) {
      if (item.productId) {
        await req.prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
        await req.prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'out',
            quantity: item.quantity,
            reason: `Vente #${sale.id.slice(0, 8)}`,
          },
        });
      }
    }

    // If credit sale, create customer debt
    if (data.paymentMethod === 'credit' && data.customerId) {
      await req.prisma.customerDebt.create({
        data: {
          customerId: data.customerId,
          amount: totalAmount,
          description: `Vente à crédit - ${data.items.map(i => i.name).join(', ')}`,
        },
      });
      await req.prisma.customer.update({
        where: { id: data.customerId },
        data: {
          totalBought: { increment: totalAmount },
          totalOwed: { increment: totalAmount },
        },
      });
    } else if (data.customerId) {
      await req.prisma.customer.update({
        where: { id: data.customerId },
        data: { totalBought: { increment: totalAmount } },
      });
    }

    // Link sale encaissement to active cash session
    if (paidAmount > 0) {
      const activeSession = await req.prisma.cashSession.findFirst({
        where: { businessId, status: 'open' },
      });
      if (activeSession) {
        await req.prisma.cashMovement.create({
          data: {
            sessionId: activeSession.id,
            businessId,
            type: 'in',
            amount: paidAmount,
            method: data.paymentMethod,
            category: 'sale',
            referenceId: sale.id,
            description: `Vente #${sale.id.slice(0, 8)} (${data.items.map(i => i.name).join(', ')})`,
          },
        });
        await req.prisma.cashSession.update({
          where: { id: activeSession.id },
          data: {
            totalCashIn: data.paymentMethod === 'cash' ? { increment: paidAmount } : undefined,
            totalMomoIn: data.paymentMethod === 'mobile_money' ? { increment: paidAmount } : undefined,
            theoreticalCash: data.paymentMethod === 'cash' ? { increment: paidAmount } : undefined,
          },
        });
      }
    }


    // Audit log
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'create',
        entity: 'sale',
        entityId: sale.id,
        details: JSON.stringify({ totalAmount, items: data.items.length }),
      },
    });

    res.status(201).json({
      message: `✅ Vente enregistrée\n+${totalAmount.toLocaleString('fr-FR')} FCFA`,
      sale,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// GET /api/sales — Lister les ventes
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { page = '1', limit = '20', startDate, endDate, search } = req.query as any;
    
    const where: any = { businessId };
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const [sales, total] = await Promise.all([
      req.prisma.sale.findMany({
        where,
        include: { items: true, customer: true },
        orderBy: { saleDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      req.prisma.sale.count({ where }),
    ]);

    res.json({
      sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sales/:id
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const sale = await req.prisma.sale.findFirst({
      where: { id: req.params.id, businessId },
      include: { items: true, customer: true },
    });
    if (!sale) throw new AppError('Vente non trouvée.', 404);
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const sale = await req.prisma.sale.findFirst({
      where: { id: req.params.id, businessId },
      include: { items: true },
    });
    if (!sale) throw new AppError('Vente non trouvée.', 404);

    // Restore stock
    for (const item of sale.items) {
      if (item.productId) {
        await req.prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }
    }

    await req.prisma.sale.delete({ where: { id: sale.id } });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'delete',
        entity: 'sale',
        entityId: sale.id,
      },
    });

    res.json({ message: 'Vente supprimée.' });
  } catch (error) {
    next(error);
  }
});

export { router as salesRouter };
