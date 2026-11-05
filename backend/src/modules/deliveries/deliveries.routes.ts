import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const deliveriesRouter = Router();
deliveriesRouter.use(authenticate);

const deliveryCreateSchema = z.object({
  customerName: z.string().min(1, 'Nom du client requis'),
  customerPhone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  address: z.string().min(1, 'Adresse de livraison requise'),
  landmark: z.string().optional().nullable(),
  itemsDescription: z.string().min(1, 'Description des articles requise'),
  amountToCollect: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0),
  feePaidBy: z.enum(['client', 'merchant']).default('client'),
  courierName: z.string().optional().nullable(),
  courierPhone: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_transit', 'delivered', 'cancelled']).default('pending'),
  notes: z.string().optional().nullable(),
});

const deliveryUpdateSchema = deliveryCreateSchema.partial();

// GET /api/deliveries — Liste réelle des livraisons de l'entreprise
deliveriesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { status, search } = req.query;

    const where: any = { businessId };

    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { courierName: { contains: q, mode: 'insensitive' } },
        { itemsDescription: { contains: q, mode: 'insensitive' } },
      ];
    }

    const deliveries = await req.prisma.delivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(deliveries);
  } catch (error) {
    next(error);
  }
});

// POST /api/deliveries — Enregistrer une véritable livraison dans Neon PostgreSQL
deliveriesRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const data = deliveryCreateSchema.parse(req.body);

    const delivery = await req.prisma.delivery.create({
      data: {
        ...data,
        businessId,
        deliveredAt: data.status === 'delivered' ? new Date() : null,
      },
    });

    res.status(201).json(delivery);
  } catch (error) {
    next(error);
  }
});

// PUT /api/deliveries/:id — Mettre à jour une livraison
deliveriesRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    const data = deliveryUpdateSchema.parse(req.body);

    const existing = await req.prisma.delivery.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new AppError('Livraison non trouvée ou accès non autorisé.', 404);
    }

    const updated = await req.prisma.delivery.update({
      where: { id },
      data: {
        ...data,
        deliveredAt:
          data.status === 'delivered'
            ? existing.deliveredAt || new Date()
            : data.status !== undefined
            ? null
            : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/deliveries/:id — Supprimer une livraison
deliveriesRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const existing = await req.prisma.delivery.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new AppError('Livraison non trouvée ou accès non autorisé.', 404);
    }

    await req.prisma.delivery.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Livraison supprimée avec succès.' });
  } catch (error) {
    next(error);
  }
});
