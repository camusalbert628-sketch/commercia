import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

async function getBusinessId(req: AuthRequest): Promise<string> {
  const member = await req.prisma.businessMember.findFirst({
    where: { userId: req.userId, isActive: true },
  });
  if (!member) throw new AppError('Aucune activité trouvée.', 404);
  return member.businessId;
}

// GET /api/expenses/categories — Catégories de dépenses
router.get('/categories', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const categories = await req.prisma.expenseCategory.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// POST /api/expenses/categories — Créer une catégorie personnalisée
router.post('/categories', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const schema = z.object({
      name: z.string().min(1, 'Nom de la catégorie requis'),
      icon: z.string().optional(),
      color: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const category = await req.prisma.expenseCategory.create({
      data: {
        businessId,
        name: data.name,
        icon: data.icon || '🏷️',
        color: data.color || '#F59E0B',
      },
    });

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// POST /api/expenses — Enregistrer une dépense
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const schema = z.object({
      amount: z.number().positive('Le montant doit être supérieur à zéro'),
      category: z.string().default('autre'),
      categoryId: z.string().optional(),
      description: z.string().optional(),
      expenseDate: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const expense = await req.prisma.expense.create({
      data: {
        businessId,
        amount: data.amount,
        category: data.category,
        categoryId: data.categoryId || null,
        description: data.description || null,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
      },
      include: {
        expenseCategory: true,
      },
    });

    // Audit log
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'create',
        entity: 'expense',
        entityId: expense.id,
        details: JSON.stringify({ amount: data.amount, category: data.category }),
      },
    });

    res.status(201).json({
      message: `✅ Dépense enregistrée\n-${data.amount.toLocaleString('fr-FR')} FCFA`,
      expense,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// GET /api/expenses — Liste des dépenses
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const { page = '1', limit = '20', category, startDate, endDate } = req.query as any;

    const where: any = { businessId };
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      req.prisma.expense.findMany({
        where,
        include: { expenseCategory: true },
        orderBy: { expenseDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      req.prisma.expense.count({ where }),
    ]);

    res.json({
      expenses,
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

// DELETE /api/expenses/:id — Supprimer une dépense
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const expense = await req.prisma.expense.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!expense) throw new AppError('Dépense non trouvée.', 404);

    await req.prisma.expense.delete({ where: { id: expense.id } });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'delete',
        entity: 'expense',
        entityId: expense.id,
      },
    });

    res.json({ message: 'Dépense supprimée.' });
  } catch (error) {
    next(error);
  }
});

export { router as expensesRouter };
