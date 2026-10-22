import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);


// GET /api/customers — Liste des clients
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { search, onlyDebtors } = req.query as any;

    const where: any = { businessId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (onlyDebtors === 'true') {
      where.totalOwed = { gt: 0 };
    }

    const customers = await req.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { sales: true, debts: true } },
      },
    });

    res.json(customers);
  } catch (error) {
    next(error);
  }
});

// POST /api/customers — Créer un client
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      name: z.string().min(1, 'Nom du client requis'),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const customer = await req.prisma.customer.create({
      data: {
        businessId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// GET /api/customers/:id — Détail du client
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const customer = await req.prisma.customer.findFirst({
      where: { id: req.params.id, businessId },
      include: {
        sales: {
          take: 10,
          orderBy: { saleDate: 'desc' },
          include: { items: true },
        },
        debts: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });
    if (!customer) throw new AppError('Client non trouvé.', 404);

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// POST /api/customers/:id/payments & /payment — Enregistrer un remboursement de dette
router.post(['/:id/payments', '/:id/payment'], async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const customer = await req.prisma.customer.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!customer) throw new AppError('Client non trouvé.', 404);

    const schema = z.object({
      amount: z.number().positive('Le montant doit être supérieur à zéro'),
      debtId: z.string().optional(),
      method: z.string().default('cash'),
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);

    if (data.amount > customer.totalOwed) {
      throw new AppError(`Le montant dépasse la dette restante (${customer.totalOwed} FCFA).`, 400);
    }

    const payment = await req.prisma.customerPayment.create({
      data: {
        customerId: customer.id,
        debtId: data.debtId || null,
        amount: data.amount,
        method: data.method,
        notes: data.notes || null,
      },
    });

    const newOwed = Math.max(0, customer.totalOwed - data.amount);
    await req.prisma.customer.update({
      where: { id: customer.id },
      data: { totalOwed: newOwed },
    });

    if (data.debtId) {
      const debt = await req.prisma.customerDebt.findUnique({ where: { id: data.debtId } });
      if (debt) {
        const totalPaidOnDebt = await req.prisma.customerPayment.aggregate({
          where: { debtId: debt.id },
          _sum: { amount: true },
        });
        if ((totalPaidOnDebt._sum.amount || 0) >= debt.amount) {
          await req.prisma.customerDebt.update({
            where: { id: debt.id },
            data: { isPaid: true },
          });
        }
      }
    }

    // Link debt reimbursement to active cash session
    const activeSession = await req.prisma.cashSession.findFirst({
      where: { businessId, status: 'open' },
    });
    if (activeSession) {
      const isCash = data.method === 'cash';
      const isMomo = data.method === 'mobile_money';
      await req.prisma.cashMovement.create({
        data: {
          sessionId: activeSession.id,
          businessId,
          type: 'in',
          amount: data.amount,
          method: data.method,
          category: 'debt_payment',
          referenceId: payment.id,
          description: `Remboursement de dette - Client : ${customer.name}`,
        },
      });
      await req.prisma.cashSession.update({
        where: { id: activeSession.id },
        data: {
          totalCashIn: isCash ? { increment: data.amount } : undefined,
          totalMomoIn: isMomo ? { increment: data.amount } : undefined,
          theoreticalCash: isCash ? { increment: data.amount } : undefined,
        },
      });
    }

    res.status(201).json({
      message: `Paiement de ${data.amount.toLocaleString('fr-FR')} FCFA enregistré avec succès !`,
      payment,
      remainingOwed: newOwed,
    });

  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// DELETE /api/customers/:id — Supprimer un client
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const customer = await req.prisma.customer.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!customer) throw new AppError('Client non trouvé.', 404);

    await req.prisma.customer.delete({ where: { id: customer.id } });
    res.json({ message: 'Client supprimé.' });
  } catch (error) {
    next(error);
  }
});

export { router as customersRouter };
