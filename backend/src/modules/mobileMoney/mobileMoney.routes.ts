import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Validation schema
const operationSchema = z.object({
  operator: z.enum(['orange_money', 'mtn_momo', 'wave', 'moov', 'autre']),
  type: z.enum(['depot', 'retrait', 'transfert', 'credit_telephonique', 'autre']),
  clientAmount: z.number().min(0, 'Le montant manipulé doit être positif'),
  commissionEarned: z.number().min(0, 'La commission acquise doit être positive'),
  feeCharged: z.number().min(0).default(0),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/mobile-money/operations
router.get('/operations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { operator, type, limit } = req.query;
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const whereClause: any = { businessId };
    if (operator) whereClause.operator = operator as string;
    if (type) whereClause.type = type as string;

    const operations = await req.prisma.mobileMoneyOperation.findMany({
      where: whereClause,
      orderBy: { operationDate: 'desc' },
      take: limit ? Number(limit) : 50,
    });

    res.json({ operations });
  } catch (error) {
    next(error);
  }
});

// POST /api/mobile-money/operations
router.post('/operations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = operationSchema.parse(req.body);

    const result = await req.prisma.$transaction(async (tx: any) => {
      const operation = await tx.mobileMoneyOperation.create({
        data: {
          businessId,
          operator: data.operator,
          type: data.type,
          clientAmount: data.clientAmount,
          commissionEarned: data.commissionEarned,
          feeCharged: data.feeCharged,
          customerPhone: data.customerPhone || null,
          customerName: data.customerName || null,
          reference: data.reference || null,
          notes: data.notes || null,
          status: 'completed',
        },
      });

      // RÈGLE MÉTIER CRITIQUE : Seule la commission acquise est comptabilisée comme CA et bénéfice de l'agent !
      if (data.commissionEarned > 0) {
        // 1. Enregistrer dans le moteur financier central des Ventes
        const sale = await tx.sale.create({
          data: {
            businessId,
            totalAmount: data.commissionEarned,
            paidAmount: data.commissionEarned,
            paymentMethod: 'mobile_money',
            status: 'completed',
            notes: `Commission MoMo #${operation.id.slice(0, 8)} (${data.operator.toUpperCase()} ${data.type}) - Montant client: ${data.clientAmount} FCFA`,
            items: {
              create: [{
                name: `Commission ${data.operator.toUpperCase()} (${data.type})`,
                quantity: 1,
                unitPrice: data.commissionEarned,
                costPrice: 0,
                totalPrice: data.commissionEarned,
              }],
            },
          },
        });

        // 2. Mouvement de caisse
        const activeSession = await tx.cashSession.findFirst({
          where: { businessId, status: 'open' },
        });
        if (activeSession) {
          await tx.cashMovement.create({
            data: {
              sessionId: activeSession.id,
              businessId,
              type: 'in',
              amount: data.commissionEarned,
              method: 'mobile_money',
              category: 'sale',
              referenceId: sale.id,
              description: `Commission ${data.operator.toUpperCase()} (${data.type}) - ${data.clientAmount.toLocaleString('fr-FR')} FCFA`,
            },
          });
        }
      }

      return operation;
    });

    res.status(201).json({
      message: `Opération MoMo enregistrée ! Commission acquise : ${data.commissionEarned.toLocaleString('fr-FR')} FCFA.`,
      operation: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/mobile-money/reconciliation
router.get('/reconciliation', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const operations = await req.prisma.mobileMoneyOperation.findMany({
      where: { businessId, operationDate: { gte: today } },
    });

    let totalTransitIn = 0; // Dépôts clients (l'agent reçoit du cash physique et envoie de la flotte virtuelle)
    let totalTransitOut = 0; // Retraits clients (l'agent donne du cash physique et reçoit de la flotte virtuelle)
    let totalCommissions = 0;
    let opsCount = operations.length;

    const byOperator: Record<string, { count: number; volume: number; commission: number }> = {};

    for (const op of operations) {
      totalCommissions += op.commissionEarned;

      if (!byOperator[op.operator]) {
        byOperator[op.operator] = { count: 0, volume: 0, commission: 0 };
      }
      byOperator[op.operator].count += 1;
      byOperator[op.operator].volume += op.clientAmount;
      byOperator[op.operator].commission += op.commissionEarned;

      if (op.type === 'depot') {
        totalTransitIn += op.clientAmount; // Cash physique rentré en tiroir
      } else if (op.type === 'retrait') {
        totalTransitOut += op.clientAmount; // Cash physique sorti du tiroir
      }
    }

    // Impact net estimé sur la caisse physique du kiosque
    const netPhysicalCashImpact = totalTransitIn - totalTransitOut + totalCommissions;

    res.json({
      date: today.toISOString(),
      operationsCount: opsCount,
      totalCommissionsEarned: totalCommissions,
      totalTransitIn,
      totalTransitOut,
      netPhysicalCashImpact,
      byOperator,
      rulesReminder: 'Rappel comptable : les fonds clients en transit ne sont pas le chiffre d’affaires de l’agent. Seule la commission acquise constitue votre revenu.',
    });
  } catch (error) {
    next(error);
  }
});

export { router as mobileMoneyRouter };
