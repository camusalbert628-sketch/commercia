import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/cash/current — Récupérer la session de caisse active
router.get('/current', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const session = await req.prisma.cashSession.findFirst({
      where: { businessId, status: 'open' },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!session) {
      return res.json({ isOpen: false, session: null });
    }

    res.json({
      isOpen: true,
      session,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cash/open — Ouvrir la caisse de la journée
router.post('/open', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    // Vérifier si une caisse est déjà ouverte
    const existing = await req.prisma.cashSession.findFirst({
      where: { businessId, status: 'open' },
    });
    if (existing) {
      throw new AppError('Une session de caisse est déjà ouverte pour cette entreprise.', 400);
    }

    const schema = z.object({
      initialCash: z.number().min(0, 'Le fond de caisse initial ne peut pas être négatif').default(0),
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const session = await req.prisma.cashSession.create({
      data: {
        businessId,
        userId: req.userId!,
        status: 'open',
        initialCash: data.initialCash,
        theoreticalCash: data.initialCash,
        notes: data.notes || null,
      },
    });

    // Enregistrer le mouvement initial
    if (data.initialCash > 0) {
      await req.prisma.cashMovement.create({
        data: {
          sessionId: session.id,
          businessId,
          type: 'in',
          amount: data.initialCash,
          method: 'cash',
          category: 'manual_deposit',
          description: 'Fond de caisse initial à l\'ouverture',
        },
      });
    }

    // Audit log
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'open_cash',
        entity: 'cash_session',
        entityId: session.id,
        details: JSON.stringify({ initialCash: data.initialCash }),
      },
    });

    res.status(201).json({
      message: `Caisse ouverte avec un fond initial de ${data.initialCash.toLocaleString('fr-FR')} FCFA 🎉`,
      session,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// POST /api/cash/movement — Enregistrer une entrée ou sortie manuelle de caisse
router.post('/movement', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const session = await req.prisma.cashSession.findFirst({
      where: { businessId, status: 'open' },
    });
    if (!session) {
      throw new AppError('Aucune session de caisse ouverte. Veuillez ouvrir la caisse d\'abord.', 400);
    }

    const schema = z.object({
      type: z.enum(['in', 'out']),
      amount: z.number().positive('Le montant doit être supérieur à zéro'),
      method: z.enum(['cash', 'mobile_money', 'bank_transfer']).default('cash'),
      category: z.enum(['manual_deposit', 'manual_withdrawal', 'expense']),
      description: z.string().min(1, 'Veuillez préciser le motif'),
    });
    const data = schema.parse(req.body);

    // Si sortie d'espèces supérieure au solde théorique
    if (data.type === 'out' && data.method === 'cash' && data.amount > session.theoreticalCash) {
      throw new AppError(`Le montant (${data.amount} FCFA) dépasse le solde théorique en caisse (${session.theoreticalCash} FCFA).`, 400);
    }

    const movement = await req.prisma.cashMovement.create({
      data: {
        sessionId: session.id,
        businessId,
        type: data.type,
        amount: data.amount,
        method: data.method,
        category: data.category,
        description: data.description,
      },
    });

    // Mettre à jour les totaux de la session
    const updated = await req.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        totalCashIn: data.type === 'in' && data.method === 'cash' ? { increment: data.amount } : undefined,
        totalCashOut: data.type === 'out' && data.method === 'cash' ? { increment: data.amount } : undefined,
        totalMomoIn: data.type === 'in' && data.method === 'mobile_money' ? { increment: data.amount } : undefined,
        theoreticalCash: data.method === 'cash' ? (data.type === 'in' ? { increment: data.amount } : { decrement: data.amount }) : undefined,
      },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    res.status(201).json({
      message: `${data.type === 'in' ? 'Entrée' : 'Sortie'} de ${data.amount.toLocaleString('fr-FR')} FCFA enregistrée.`,
      movement,
      session: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// POST /api/cash/close — Clôturer la session de caisse quotidienne
router.post('/close', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const session = await req.prisma.cashSession.findFirst({
      where: { businessId, status: 'open' },
      include: { movements: true },
    });
    if (!session) {
      throw new AppError('Aucune session de caisse ouverte à clôturer.', 400);
    }

    const schema = z.object({
      actualCash: z.number().min(0, 'Le montant physique compté ne peut pas être négatif'),
      actualMomo: z.number().min(0).optional(),
      discrepancyReason: z.string().optional(),
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const cashDiscrepancy = data.actualCash - session.theoreticalCash;

    // Si écart supérieur à 100 FCFA et pas de justification
    if (Math.abs(cashDiscrepancy) > 100 && !data.discrepancyReason) {
      throw new AppError(`Un écart de ${cashDiscrepancy > 0 ? '+' : ''}${cashDiscrepancy.toLocaleString('fr-FR')} FCFA a été constaté. Veuillez obligatoirement renseigner la justification de l'écart.`, 400);
    }

    const closed = await req.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        actualCash: data.actualCash,
        actualMomo: data.actualMomo || null,
        cashDiscrepancy,
        discrepancyReason: data.discrepancyReason || null,
        notes: data.notes || session.notes,
      },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });

    // Audit log
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'close_cash',
        entity: 'cash_session',
        entityId: session.id,
        details: JSON.stringify({
          theoreticalCash: session.theoreticalCash,
          actualCash: data.actualCash,
          cashDiscrepancy,
        }),
      },
    });

    res.json({
      message: 'Caisse clôturée avec succès ! 🎉',
      session: closed,
      summary: {
        initialCash: closed.initialCash,
        totalCashIn: closed.totalCashIn,
        totalCashOut: closed.totalCashOut,
        totalMomoIn: closed.totalMomoIn,
        theoreticalCash: closed.theoreticalCash,
        actualCash: closed.actualCash,
        cashDiscrepancy,
        isBalanced: cashDiscrepancy === 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// GET /api/cash/sessions — Historique des clôtures de caisse
router.get('/sessions', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { page = '1', limit = '15' } = req.query as any;

    const [sessions, total] = await Promise.all([
      req.prisma.cashSession.findMany({
        where: { businessId },
        orderBy: { openedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          _count: { select: { movements: true } },
        },
      }),
      req.prisma.cashSession.count({ where: { businessId } }),
    ]);

    res.json({
      sessions,
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

// GET /api/cash/sessions/:id — Détail complet d'une session de caisse
router.get('/sessions/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const session = await req.prisma.cashSession.findFirst({
      where: { id: req.params.id, businessId },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!session) throw new AppError('Session de caisse introuvable.', 404);

    res.json(session);
  } catch (error) {
    next(error);
  }
});

export { router as cashRouter };
